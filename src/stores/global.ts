import store2 from 'store2';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { LoginResponse } from '@/api/__generated__/wallet/model/loginResponse';
import { queryClient } from '@/queryClient';

/** 与 UI 展示一致的钱包余额字段（由 API `BalanceItemResponse` 归一化而来） */
export type WalletBalanceDisplay = {
  assetCode?: string;
  available?: string;
  frozen?: string;
  decimals?: string;
};

/**
 * 后端登录态（页面/API）：localStorage 中的 userToken。
 * 与 Privy 会话（链上充值/提现等）分离，勿混用于页面级拦截。
 */
export function getIsLoginFromStorage(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return Boolean(store2.get('userToken'));
}

interface AppState {
  /** 后端登录镜像（由 userToken 派生，供 UI/Query enabled；非 Privy 会话） */
  isLogin: boolean;
  userProfile: LoginResponse['userProfile'] | null;
  setUserInfo: (data: LoginResponse | null) => void;
  clearUserInfo: () => void;
  claimableUsdcBalance: WalletBalanceDisplay;
  setClaimableUsdcBalance: (value: WalletBalanceDisplay) => void;
  claimableStoryBalance: WalletBalanceDisplay;
  setClaimableStoryBalance: (value: WalletBalanceDisplay) => void;
  walletNativeBalance: string;
  setWalletNativeBalance: (value: string) => void;
  walletUsdcBalance: string | undefined;
  setWalletUsdcBalance: (value: string | undefined) => void;
  walletStoryBalance: string | undefined;
  setWalletStoryBalance: (value: string | undefined) => void;
}

const useGlobalStore = create<AppState>()(
  persist(
    (set) => ({
      // SSR 与客户端首帧须一致；登录态在 onRehydrateStorage / GlobalUpdater 挂载后同步
      isLogin: false,
      userProfile: null,
      setUserInfo: (data: LoginResponse | null) => {
        if (data) {
          const token = data.token ?? null;
          store2.set('userToken', token);
          set({
            userProfile: data.userProfile ?? null,
            isLogin: getIsLoginFromStorage(),
          });
        }
      },
      clearUserInfo: () => {
        store2.remove('userToken');
        set({
          userProfile: null,
          isLogin: getIsLoginFromStorage(),
          claimableUsdcBalance: {
            assetCode: 'USDC',
            available: '0',
            frozen: '0',
            decimals: '2',
          },
          claimableStoryBalance: {
            assetCode: 'STORY',
            available: '0',
            frozen: '0',
            decimals: '2',
          },
          walletNativeBalance: '0',
          walletUsdcBalance: undefined,
          walletStoryBalance: undefined,
        });

        // 先把 isLogin 关掉，再清缓存，避免仍 enabled 的 query 用已删除 token 立刻重拉
        queryClient.clear();
      },
      claimableUsdcBalance: {
        assetCode: 'USDC',
        available: '0',
        frozen: '0',
        decimals: '2',
      },
      setClaimableUsdcBalance: (value: WalletBalanceDisplay) => {
        set({ claimableUsdcBalance: value });
      },
      claimableStoryBalance: {
        assetCode: 'STORY',
        available: '0',
        frozen: '0',
        decimals: '2',
      },
      setClaimableStoryBalance: (value: WalletBalanceDisplay) => {
        set({ claimableStoryBalance: value });
      },
      walletNativeBalance: '0',
      setWalletNativeBalance: (value: string) => {
        set({ walletNativeBalance: value });
      },
      walletUsdcBalance: undefined,
      setWalletUsdcBalance: (value: string | undefined) => {
        set({ walletUsdcBalance: value });
      },
      walletStoryBalance: undefined,
      setWalletStoryBalance: (value: string | undefined) => {
        set({ walletStoryBalance: value });
      },
    }),
    {
      name: 'global',
      partialize: (state) => {
        const {
          isLogin: _isLogin,
          walletNativeBalance: _walletNativeBalance,
          walletUsdcBalance: _walletUsdcBalance,
          walletStoryBalance: _walletStoryBalance,
          setWalletNativeBalance: _setWalletNativeBalance,
          setWalletUsdcBalance: _setWalletUsdcBalance,
          setWalletStoryBalance: _setWalletStoryBalance,
          ...rest
        } = state;
        return rest;
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          return;
        }
        useGlobalStore.setState({ isLogin: getIsLoginFromStorage() });
      },
    },
  ),
);

export default useGlobalStore;
export { useGlobalStore };
