import { address } from '@solana/kit';
import type { AccountInfo } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { useEffect, useRef } from 'react';

import { getRpcSubscriptions } from '@/hooks/solana/rpcSubscriptions';

export type UseSolanaAccountWatchOptions = {
  /** WS 断线重连成功后触发 HTTP 快照补拉（首次 mount 订阅不触发） */
  onResubscribed?: () => void;
};

export function useSolanaAccountWatch(
  enabled: boolean,
  wssUrl: string | null | undefined,
  accountPubkey: PublicKey | null | undefined,
  onAccountUpdate: (info: AccountInfo<Buffer> | null) => void,
  options?: UseSolanaAccountWatchOptions,
) {
  const callbackRef = useRef(onAccountUpdate);
  const onResubscribedRef = useRef(options?.onResubscribed);

  useEffect(() => {
    callbackRef.current = onAccountUpdate;
  }, [onAccountUpdate]);

  useEffect(() => {
    onResubscribedRef.current = options?.onResubscribed;
  }, [options?.onResubscribed]);

  useEffect(() => {
    if (!enabled || !wssUrl || !accountPubkey) {
      return;
    }

    const abortController = new AbortController();

    const subscribe = async () => {
      let retryCount = 0;
      let isFirstSubscription = true;

      while (!abortController.signal.aborted) {
        try {
          const rpcSubscriptions = getRpcSubscriptions(wssUrl);
          const notifications = await rpcSubscriptions
            .accountNotifications(address(accountPubkey.toBase58()), {
              encoding: 'base64',
              commitment: 'confirmed',
            })
            .subscribe({ abortSignal: abortController.signal });

          // 成功连接后重置重试次数；非首次订阅表示断线重连，需 HTTP 快照对齐
          retryCount = 0;
          if (isFirstSubscription) {
            isFirstSubscription = false;
          } else {
            onResubscribedRef.current?.();
          }

          for await (const { value } of notifications) {
            if (!value) {
              callbackRef.current(null);
              continue;
            }

            const dataBuffer = Buffer.from(value.data[0], 'base64');

            const info: AccountInfo<Buffer> = {
              executable: value.executable,
              lamports: Number(value.lamports),
              owner: new PublicKey(value.owner),
              rentEpoch: 0,
              data: dataBuffer,
            };

            callbackRef.current(info);
          }
        } catch (err: unknown) {
          if (
            err instanceof Error &&
            (err.name === 'AbortError' || abortController.signal.aborted)
          ) {
            // Expected abort
            return;
          }

          // 忽略 WebSocket 相关的常见错误
          if (
            err &&
            typeof err === 'object' &&
            'message' in err &&
            typeof err.message === 'string' &&
            (err.message.includes('WebSocket connection closed') ||
              err.message.includes('WebSocket') ||
              err.message.includes('connection'))
          ) {
            // silent
          } else {
            console.error('Account watch subscription error:', err);
          }
        }

        if (abortController.signal.aborted) {
          break;
        }

        // 指数退避重连 (最大延迟 5 秒)
        retryCount++;
        const delay = Math.min(1000 * 1.5 ** (retryCount - 1), 5000);
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(resolve, delay);
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            resolve();
          });
        });
      }
    };

    subscribe();

    return () => {
      abortController.abort();
    };
  }, [enabled, wssUrl, accountPubkey]);
}
