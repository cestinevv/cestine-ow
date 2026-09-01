import type { Signature } from '@solana/kit';

import { getChainRpcHttp, getChainRpcWss } from '@/hooks/solana/chainRpcConfig';
import { getRpcSubscriptions } from '@/hooks/solana/rpcSubscriptions';
import { getSolanaChainConnection } from '@/hooks/solana/solanaConnection';
import { getCurrentChain } from '@/solana/chainConfig';
import { useConfigStore } from '@/stores/config';
import { refreshOnChainWalletBalances } from '@/stores/updater';

/** 总确认超时：WSS 推送与 HTTP 轮询并行竞速，共用此时长 */
const CONFIRMATION_TIMEOUT_MS = 30_000;
const HTTP_POLL_INTERVAL_MS = 2_000;

function resolveChainRpcEndpoints() {
  const chainlinks = useConfigStore.getState().chainlinks;
  const chain = getCurrentChain();
  const rpcUrl = getChainRpcHttp(chainlinks, chain);
  const wssUrl = getChainRpcWss(chainlinks, chain);

  if (!rpcUrl) {
    throw new Error('Solana RPC endpoint is not configured');
  }

  return {
    rpcUrl,
    wssUrl,
  };
}

function isOnChainFailureError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('transaction failed on-chain')
  );
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError')
  );
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export type ConfirmSolanaTransactionParams = {
  signature: string;
  /** Used in on-chain failure error messages, e.g. `unlock_episode`. */
  action: string;
};

/**
 * Waits for a transaction signature to reach confirmed commitment.
 *
 * `signatureSubscribe` 不会重放已发生事件：发送后若交易已确认，纯 WSS 会永远等不到推送。
 * 因此 HTTP `getSignatureStatus`（立即首查 + 轮询）与 WSS 并行竞速，任一成功即返回。
 */
export async function confirmSolanaTransaction(
  params: ConfirmSolanaTransactionParams,
): Promise<void> {
  const { signature, action } = params;
  const { rpcUrl, wssUrl } = resolveChainRpcEndpoints();

  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    CONFIRMATION_TIMEOUT_MS,
  );

  try {
    await raceSignatureConfirmation({
      signature,
      action,
      rpcUrl,
      wssUrl,
      signal: abortController.signal,
    });
  } catch (error: unknown) {
    if (isOnChainFailureError(error)) {
      throw error;
    }

    if (isAbortError(error) || abortController.signal.aborted) {
      throw new Error(
        `${action} transaction confirmation timeout after ${CONFIRMATION_TIMEOUT_MS / 1000}s. Transaction may still succeed. Signature: ${signature}`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    abortController.abort();
  }

  await refreshOnChainWalletBalances();
}

type RaceSignatureConfirmationParams = {
  signature: string;
  action: string;
  rpcUrl: string;
  wssUrl: string | undefined;
  signal: AbortSignal;
};

async function raceSignatureConfirmation(
  params: RaceSignatureConfirmationParams,
): Promise<void> {
  const { signature, action, rpcUrl, wssUrl, signal } = params;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const win = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    const failHard = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    };

    // 总超时 abort 时立刻收口，避免卡在无 abort 的 HTTP 请求上
    const onAbort = () => {
      failHard(new DOMException('Aborted', 'AbortError'));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener('abort', onAbort, { once: true });

    void confirmViaHttp(signature, action, rpcUrl, signal).then(
      win,
      (error) => {
        if (settled) {
          return;
        }

        if (isOnChainFailureError(error)) {
          failHard(error);
          return;
        }

        if (signal.aborted || isAbortError(error)) {
          failHard(error);
        }
      },
    );

    if (!wssUrl) {
      return;
    }

    void confirmViaWebSocket(signature, action, wssUrl, signal).then(
      win,
      (error) => {
        if (settled) {
          return;
        }

        if (isOnChainFailureError(error)) {
          failHard(error);
          return;
        }

        // WSS 连接/订阅失败不阻断：HTTP 轮询继续
        if (!isAbortError(error) && !signal.aborted) {
          console.warn(
            `[confirmSolanaTransaction] WebSocket confirmation failed, HTTP polling continues: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      },
    );
  });
}

async function confirmViaWebSocket(
  signature: string,
  action: string,
  wssUrl: string,
  signal: AbortSignal,
): Promise<void> {
  const rpcSubscriptions = getRpcSubscriptions(wssUrl);
  const notifications = await rpcSubscriptions
    .signatureNotifications(signature as Signature, {
      commitment: 'confirmed',
    })
    .subscribe({ abortSignal: signal });

  for await (const { value } of notifications) {
    if (value.err) {
      throw new Error(
        `${action} transaction failed on-chain: ${JSON.stringify(value.err)}`,
      );
    }

    return;
  }

  // 订阅正常结束但未收到通知（少见）：交给 HTTP 竞速侧
  throw new DOMException('WebSocket subscription ended', 'AbortError');
}

async function confirmViaHttp(
  signature: string,
  action: string,
  rpcUrl: string,
  signal: AbortSignal,
): Promise<void> {
  const connection = getSolanaChainConnection(rpcUrl);

  // 立即首查，覆盖「订阅前已 confirmed」的竞态
  while (!signal.aborted) {
    try {
      const status = await connection.getSignatureStatus(signature);

      if (
        status.value?.confirmationStatus === 'confirmed' ||
        status.value?.confirmationStatus === 'finalized'
      ) {
        if (status.value.err) {
          throw new Error(
            `${action} transaction failed on-chain: ${JSON.stringify(status.value.err)}`,
          );
        }

        return;
      }
    } catch (error) {
      if (isOnChainFailureError(error)) {
        throw error;
      }

      // 网络抖动：继续轮询
    }

    await sleep(HTTP_POLL_INTERVAL_MS, signal);
  }

  throw new DOMException('Aborted', 'AbortError');
}
