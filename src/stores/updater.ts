import { useEffect, useLayoutEffect, useRef } from 'react';
import type { AssetListResponse } from '@/api/__generated__/wallet/model/assetListResponse';
import type { BalanceItemResponse } from '@/api/__generated__/wallet/model/balanceItemResponse';
import { useAssets } from '@/api/__generated__/wallet/userwallet-asset/userwallet-asset';
import { useAppWalletNativeBalance } from '@/hooks/solana/useAppWalletNativeBalance';
import { useAppWalletTokenBalance } from '@/hooks/solana/useAppWalletTokenBalance';
import { logout as logoutAppSession } from '@/hooks/useAppLogin';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useInitGlobalConfig } from '@/hooks/useGlobalConfig';
import { useConfigStore } from '@/stores/config';
import { useCreateDramaStore } from './createDramaStore';
import useGlobalStore, {
  getIsLoginFromStorage,
  type WalletBalanceDisplay,
} from './global';

type RefreshFn = () => Promise<unknown>;

let refreshWalletAssetsFn: RefreshFn | null = null;
let refreshOnChainUsdcFn: RefreshFn | null = null;
let refreshOnChainStoryFn: RefreshFn | null = null;
let refreshOnChainNativeFn: RefreshFn | null = null;

/** 中心化钱包资产（useAssets：可领取 STORY/USDC 等） */
export async function refreshWalletAssets() {
  if (!refreshWalletAssetsFn) {
    return;
  }
  await refreshWalletAssetsFn();
}

/** 链上 SPL / SOL 余额（头部「X USDC」、下拉内 USDC/STORY 展示） */
export async function refreshOnChainWalletBalances() {
  await Promise.all([
    refreshOnChainUsdcFn?.(),
    refreshOnChainStoryFn?.(),
    refreshOnChainNativeFn?.(),
  ]);
}

/** 中心化资产 + 链上余额（充值/提现/解锁等成功后建议调用） */
export async function refreshAllWalletBalances() {
  await Promise.all([refreshWalletAssets(), refreshOnChainWalletBalances()]);
}

const ON_CHAIN_REFRESH_DEBOUNCE_MS = 3_000;
let onChainRefreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 页面可见 / 网络恢复时防抖触发链上余额 HTTP 补拉 */
function scheduleRefreshOnChainWalletBalances() {
  if (onChainRefreshDebounceTimer) {
    clearTimeout(onChainRefreshDebounceTimer);
  }

  onChainRefreshDebounceTimer = setTimeout(() => {
    onChainRefreshDebounceTimer = null;
    void refreshOnChainWalletBalances();
  }, ON_CHAIN_REFRESH_DEBOUNCE_MS);
}

function normalizeBalanceItemFromResponse(
  balance: BalanceItemResponse,
): WalletBalanceDisplay {
  return {
    assetCode: balance.assetCode,
    available:
      balance.availableBalance === null ||
      balance.availableBalance === undefined
        ? undefined
        : String(balance.availableBalance ?? '0'),
    frozen:
      balance.frozenBalance === null || balance.frozenBalance === undefined
        ? undefined
        : String(balance.frozenBalance ?? '0'),
    decimals:
      balance.decimals === null || balance.decimals === undefined
        ? undefined
        : String(balance.decimals ?? '2'),
  };
}

export default function GlobalUpdater() {
  const isLogin = useGlobalStore((s) => s.isLogin);
  const userId = useGlobalStore((s) => s.userProfile?.userId);

  const { loginType } = useAppPrivyAccount();

  const loginTypeRef = useRef(loginType);
  loginTypeRef.current = loginType;

  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: window.phantom is not strongly typed
    const provider = (window as any)?.phantom?.solana;
    if (!provider) return;

    const handleAccountChanged = () => {
      // 若当前是钱包登录状态，则执行登出
      if (loginTypeRef.current === 'wallet') {
        void logoutAppSession();
      }
    };

    provider.on('accountChanged', handleAccountChanged);
    return () => {
      provider.off('accountChanged', handleAccountChanged);
    };
  }, []);
  const {
    setClaimableUsdcBalance,
    setClaimableStoryBalance,
    setWalletNativeBalance,
    setWalletUsdcBalance,
    setWalletStoryBalance,
  } = useGlobalStore();

  const usdcToken = useConfigStore((s) => s.usdcToken);
  const storyToken = useConfigStore((s) => s.storyToken);

  useInitGlobalConfig();

  // 水合后尽早同步 localStorage 中的 userToken（layout 阶段，减轻其它模块首帧误判）
  useLayoutEffect(() => {
    useGlobalStore.setState({ isLogin: getIsLoginFromStorage() });
  }, []);

  const hasHydrated = useCreateDramaStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated) {
      useCreateDramaStore.getState().switchUser(userId || 'guest');
    }
  }, [userId, hasHydrated]);

  const { nativeBalance, refreshBalance: refreshNativeBalance } =
    useAppWalletNativeBalance();
  const {
    tokenBalance: walletUsdcFromChain,
    refreshBalance: refreshUsdcOnChain,
  } = useAppWalletTokenBalance(usdcToken);
  const {
    tokenBalance: walletStoryFromChain,
    refreshBalance: refreshStoryOnChain,
  } = useAppWalletTokenBalance(storyToken);

  const { data: walletAssets, refetch: refetchWalletAssets } = useAssets({
    query: {
      enabled: isLogin,
      // 关闭中心化资产轮询，仅在登录态变化或手动 refetchWalletAssets 时拉取
      refetchInterval: false,

      // 关键钱包链上聚合开销重，禁用窗口聚焦自动 refetch
      refetchOnWindowFocus: false,
      // 切回页时也不强制重拉（依然支持手动 refetch / queryClient.invalidateQueries）
      refetchOnReconnect: false,
      // 组件反复挂载 / enabled 反复 toggle 时命中缓存，不再发新请求
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: Number.POSITIVE_INFINITY,
      refetchOnMount: false,
    },
  });

  useEffect(() => {
    refreshWalletAssetsFn = refetchWalletAssets;
    return () => {
      if (refreshWalletAssetsFn === refetchWalletAssets) {
        refreshWalletAssetsFn = null;
      }
    };
  }, [refetchWalletAssets]);

  useEffect(() => {
    refreshOnChainUsdcFn = refreshUsdcOnChain;
    return () => {
      if (refreshOnChainUsdcFn === refreshUsdcOnChain) {
        refreshOnChainUsdcFn = null;
      }
    };
  }, [refreshUsdcOnChain]);

  useEffect(() => {
    refreshOnChainStoryFn = refreshStoryOnChain;
    return () => {
      if (refreshOnChainStoryFn === refreshStoryOnChain) {
        refreshOnChainStoryFn = null;
      }
    };
  }, [refreshStoryOnChain]);

  useEffect(() => {
    refreshOnChainNativeFn = refreshNativeBalance;
    return () => {
      if (refreshOnChainNativeFn === refreshNativeBalance) {
        refreshOnChainNativeFn = null;
      }
    };
  }, [refreshNativeBalance]);

  // 切回标签页或网络恢复时 HTTP 补拉链上余额（WS 断连窗口可能丢通知）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scheduleRefreshOnChainWalletBalances();
      }
    };

    const handleOnline = () => {
      scheduleRefreshOnChainWalletBalances();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);

      if (onChainRefreshDebounceTimer) {
        clearTimeout(onChainRefreshDebounceTimer);
        onChainRefreshDebounceTimer = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log('nativeBalance:', nativeBalance);
    setWalletNativeBalance(nativeBalance);
  }, [nativeBalance, setWalletNativeBalance]);

  useEffect(() => {
    console.log('walletUsdcFromChain:', walletUsdcFromChain);
    setWalletUsdcBalance(walletUsdcFromChain);
  }, [setWalletUsdcBalance, walletUsdcFromChain]);

  useEffect(() => {
    setWalletStoryBalance(walletStoryFromChain);
  }, [setWalletStoryBalance, walletStoryFromChain]);

  useEffect(() => {
    const serverBody = walletAssets?.data as
      | { data?: AssetListResponse }
      | undefined;
    const balances = serverBody?.data?.balances;
    if (!balances?.length) {
      return;
    }

    const matchedUsdtBalance = balances.find(
      (item) => item.assetCode?.toUpperCase() === 'USDC',
    );
    if (matchedUsdtBalance) {
      setClaimableUsdcBalance(
        normalizeBalanceItemFromResponse(matchedUsdtBalance),
      );
    }

    const matchedStoryBalance = balances.find((item) => {
      const assetCode = item.assetCode?.toUpperCase();
      return assetCode === 'STORY';
    });
    if (matchedStoryBalance) {
      setClaimableStoryBalance(
        normalizeBalanceItemFromResponse(matchedStoryBalance),
      );
    }
  }, [setClaimableUsdcBalance, setClaimableStoryBalance, walletAssets]);

  return null;
}
