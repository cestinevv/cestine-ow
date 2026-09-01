import { reportError } from '@amazing-socrates/telemetry-kit';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getChainRpcHttp, getChainRpcWss } from '@/hooks/solana/chainRpcConfig';
import { getSolanaChainConnection } from '@/hooks/solana/solanaConnection';
import { useSolanaAccountWatch } from '@/hooks/solana/useSolanaAccountWatch';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { getCurrentChain } from '@/solana/chainConfig';
import { useConfigStore } from '@/stores/config';

/**
 * 通用 Native Token (SOL) 余额 Hook
 *
 * RPC 端点统一从 `chainlinks.<chain>.rpc.http` / `rpc.wss` 读取（Admin 配置中心，单一事实来源），
 * 不再依赖任何 env 变量；chainlinks 未就绪时跳过查询，避免空 URL 触发 Connection 报错。
 */
export function useAppWalletNativeBalance() {
  const { solanaAddress } = useAppPrivyAccount();
  const chainlinks = useConfigStore((s) => s.chainlinks);
  const chain = getCurrentChain();
  const rpcUrl = getChainRpcHttp(chainlinks, chain);
  const wssUrl = getChainRpcWss(chainlinks, chain);
  const queryClient = useQueryClient();

  const isReady = !!solanaAddress && !!rpcUrl;
  const queryKey = ['nativeBalance', solanaAddress, rpcUrl, wssUrl];

  const connection = useMemo(() => {
    if (!rpcUrl) return null;
    return getSolanaChainConnection(rpcUrl, wssUrl);
  }, [rpcUrl, wssUrl]);

  const ownerPublicKey = useMemo(() => {
    if (!solanaAddress) return null;
    try {
      return new PublicKey(solanaAddress);
    } catch {
      return null;
    }
  }, [solanaAddress]);

  const {
    data: lamports,
    refetch,
    isLoading: fetching,
    error,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!connection || !ownerPublicKey) return null;
      try {
        return await connection.getBalance(ownerPublicKey);
      } catch (err) {
        console.error('Failed to fetch native balance:', err);
        reportError(err, { category: 'js' });
        throw err;
      }
    },
    enabled: isReady,
    // 关闭链上 SOL 余额轮询，仅在首次查询 / 手动 refetch 时拉取
    // refetchInterval: 5000,
    // 失败（如 RPC 429 限流）不自动重试，避免雪崩式刷请求
    retry: false,

    // 关键钱包链上聚合开销重，禁用窗口聚焦自动 refetch
    refetchOnWindowFocus: false,
    // 切回页时也不强制重拉（依然支持手动 refetch / queryClient.invalidateQueries）
    refetchOnReconnect: false,
    // 组件反复挂载 / enabled 反复 toggle 时命中缓存，不再发新请求
    // 真正需要刷新时仍可调 refreshBalance() 或 queryClient.invalidateQueries(['nativeBalance'])
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
  });

  useSolanaAccountWatch(
    isReady && !!wssUrl,
    wssUrl,
    ownerPublicKey,
    (info) => {
      if (info) {
        queryClient.setQueryData(queryKey, info.lamports);
        queryClient.invalidateQueries({ queryKey });
      } else {
        queryClient.setQueryData(queryKey, 0);
        queryClient.invalidateQueries({ queryKey });
      }
    },
    {
      onResubscribed: () => {
        if (!isReady) return;
        void refetch();
      },
    },
  );

  const refreshBalance = async () => {
    if (!isReady) return;
    await refetch();
  };

  const nativeBalance =
    lamports !== null && lamports !== undefined
      ? (Number(lamports) / LAMPORTS_PER_SOL).toString()
      : '0';

  return {
    nativeBalance,
    refreshBalance,
    lamports,
    isLoading: fetching,
    error,
  };
}
