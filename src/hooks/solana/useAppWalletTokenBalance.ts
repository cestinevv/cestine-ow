import { reportError } from '@amazing-socrates/telemetry-kit';
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getChainRpcHttp, getChainRpcWss } from '@/hooks/solana/chainRpcConfig';
import { getSolanaChainConnection } from '@/hooks/solana/solanaConnection';
import { useSolanaAccountWatch } from '@/hooks/solana/useSolanaAccountWatch';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { getCurrentChain } from '@/solana/chainConfig';
import { useConfigStore } from '@/stores/config';
import type { Token } from '@/types';

/**
 * 通用 Token 余额 Hook
 *
 * 支持传入 Token 元数据获取余额（包括 USDC 或 STORY 等 SPL Token）。
 * RPC 端点统一从 `chainlinks.<chain>.rpc.http` / `rpc.wss` 读取（单一事实来源），
 * 不再依赖 env 变量；chainlinks 未就绪时跳过查询。
 */
export function useAppWalletTokenBalance(token?: Token | null) {
  const { solanaAddress } = useAppPrivyAccount();
  const mintAddress = token?.address?.trim() ?? '';
  const isMintReady = mintAddress.length > 0;

  const chainlinks = useConfigStore((s) => s.chainlinks);
  const chain = getCurrentChain();
  const rpcUrl = getChainRpcHttp(chainlinks, chain);
  const wssUrl = getChainRpcWss(chainlinks, chain);
  const queryClient = useQueryClient();

  const isReady = isMintReady && !!solanaAddress && !!rpcUrl;
  const queryKey = [
    'splTokenBalance',
    mintAddress,
    solanaAddress,
    rpcUrl,
    wssUrl,
  ];

  const connection = useMemo(() => {
    if (!rpcUrl) return null;
    return getSolanaChainConnection(rpcUrl, wssUrl);
  }, [rpcUrl, wssUrl]);

  const { ownerPublicKey, mintPublicKey, ataPublicKey } = useMemo(() => {
    if (!solanaAddress || !isMintReady) {
      return { ownerPublicKey: null, mintPublicKey: null, ataPublicKey: null };
    }
    try {
      const owner = new PublicKey(solanaAddress);
      const mint = new PublicKey(mintAddress);
      const ata = getAssociatedTokenAddressSync(mint, owner, true);
      return { ownerPublicKey: owner, mintPublicKey: mint, ataPublicKey: ata };
    } catch {
      return { ownerPublicKey: null, mintPublicKey: null, ataPublicKey: null };
    }
  }, [solanaAddress, isMintReady, mintAddress]);

  const {
    data: balance,
    refetch: refresh,
    isLoading: isFetching,
    error,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isReady || !connection || !ownerPublicKey || !mintPublicKey)
        return null;

      try {
        const response = await connection.getParsedTokenAccountsByOwner(
          ownerPublicKey,
          { mint: mintPublicKey },
        );

        if (response.value.length === 0) {
          return { uiAmount: 0 };
        }

        const tokenAmount =
          response.value[0].account.data.parsed.info.tokenAmount;
        return { uiAmount: tokenAmount.uiAmount };
      } catch (err) {
        // 某些环境下配置的 mint 在当前链不存在，RPC 会返回 "could not find mint"。
        // 该场景按余额 0 处理，避免持续抛错污染控制台。
        if (err instanceof Error && /could not find mint/i.test(err.message)) {
          return { uiAmount: 0 };
        }

        console.error('Failed to fetch SPL token balance:', err);
        reportError(err, { category: 'js' });
        throw err;
      }
    },
    enabled: isReady,
    // 关闭链上 SPL Token 余额轮询，仅在首次查询 / 手动 refetch 时拉取
    // refetchInterval: isQueryReady ? 5000 : false,
    // 失败（如 RPC 429 限流）不自动重试，避免雪崩式刷请求
    retry: false,

    // 关键钱包链上聚合开销重，禁用窗口聚焦自动 refetch
    refetchOnWindowFocus: false,
    // 切回页时也不强制重拉（依然支持手动 refetch / queryClient.invalidateQueries）
    refetchOnReconnect: false,
    // 组件反复挂载 / enabled 反复 toggle 时命中缓存，不再发新请求
    // 真正需要刷新时仍可调 refreshBalance() 或 queryClient.invalidateQueries(['splTokenBalance'])
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
  });

  useSolanaAccountWatch(
    isReady && !!wssUrl,
    wssUrl,
    ataPublicKey,
    (info) => {
      if (!info) {
        queryClient.setQueryData(queryKey, { uiAmount: 0 });
        return;
      }

      try {
        const decoded = AccountLayout.decode(info.data);
        const decimals = token?.decimals ?? 0;
        const uiAmount = Number(decoded.amount) / 10 ** decimals;

        // 更新 query 缓存
        queryClient.setQueryData(queryKey, { uiAmount });

        // 强制触发重渲染，确保 DOM 更新
        queryClient.invalidateQueries({ queryKey });
      } catch (err) {
        console.error('Failed to decode ATA data:', err);
      }
    },
    {
      onResubscribed: () => {
        if (!isReady) return;
        void refresh();
      },
    },
  );

  const tokenBalance = useMemo(() => {
    if (!isMintReady) {
      return undefined;
    }

    const uiAmount = balance?.uiAmount;
    if (uiAmount === null || uiAmount === undefined) {
      return undefined;
    }

    return String(uiAmount);
  }, [balance?.uiAmount, isMintReady]);

  return {
    tokenBalance,
    refreshBalance: isMintReady ? refresh : async () => {},
    isLoading: isMintReady ? isFetching : false,
    error: isMintReady ? error : null,
  };
}
