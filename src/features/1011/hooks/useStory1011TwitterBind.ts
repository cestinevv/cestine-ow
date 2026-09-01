import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { SocialBindStatusResponse } from '@/api/__generated__/wallet/model/socialBindStatusResponse';
import {
  getGetStatusQueryKey,
  useGetStatus,
} from '@/api/__generated__/wallet/social-account-binding/social-account-binding';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import {
  fetchTwitterAuthorizationUrl,
  isTwitterBindResultMessage,
  markTwitterBindResultSignal,
  navigateTwitterOAuthPopup,
  openTwitterOAuthPopup,
  watchTwitterOAuthPopup,
} from '@/features/social/socialBindOAuth';
import { useAppLogin } from '@/hooks/useAppLogin';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';

/** 1011 页面级监听：统一接收落地页 postMessage，只提示一次结果 toast。 */
export function useStory1011TwitterBindResultListener(
  enableBindResultListener = true,
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
  );

  useEffect(() => {
    if (!enableBindResultListener) {
      return;
    }

    function handleTwitterBindMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (!isTwitterBindResultMessage(event.data)) {
        return;
      }

      markTwitterBindResultSignal();

      void queryClient.invalidateQueries({
        queryKey: [...getGetStatusQueryKey(), walletQueryKeyScope],
      });

      if (event.data.status === 'success') {
        toast.success(t('绑定成功'));
        return;
      }

      toast.error(t('绑定失败'));
    }

    window.addEventListener('message', handleTwitterBindMessage);

    return () => {
      window.removeEventListener('message', handleTwitterBindMessage);
    };
  }, [enableBindResultListener, queryClient, t, walletQueryKeyScope]);
}

/** 1011 活动：X 绑定状态与 OAuth 弹窗流程（与 Hero「绑定账号」一致） */
export function useStory1011TwitterBind() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { login } = useAppLogin();

  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );

  const [isBindRequesting, setIsBindRequesting] = useState(false);
  const oauthPopupWatchStopRef = useRef<(() => void) | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
  );

  const statusQuery = useGetStatus({
    query: {
      enabled: isLogin,
      retry: false,
      queryKey: [...getGetStatusQueryKey(), walletQueryKeyScope],
    },
  });

  const statusPayload = unwrapOrvalPayload<SocialBindStatusResponse>(
    statusQuery.data,
  );
  const isBound = isLogin && statusPayload?.bound === true;
  const platformUsername = statusPayload?.platformUsername;

  const isBindBusy = isBindRequesting || (isLogin && statusQuery.isFetching);

  useEffect(() => {
    return () => {
      oauthPopupWatchStopRef.current?.();
      oauthPopupWatchStopRef.current = null;
    };
  }, []);

  /** 未登录时拉起登录；未绑定时打开 X OAuth 弹窗 */
  async function startTwitterBind() {
    if (!isLogin) {
      login();
      return;
    }

    if (isBound) {
      return;
    }

    // 必须在 await 前同步开窗，否则浏览器会改成新标签页
    const authWindow = openTwitterOAuthPopup(t('正在跳转…'));

    if (!authWindow) {
      return;
    }

    setIsBindRequesting(true);

    try {
      const response = await fetchTwitterAuthorizationUrl();
      const redirectUrl = unwrapOrvalPayload<string>(response);

      if (!redirectUrl) {
        authWindow.close();
        return;
      }

      oauthPopupWatchStopRef.current?.();
      navigateTwitterOAuthPopup(authWindow, redirectUrl);

      oauthPopupWatchStopRef.current = watchTwitterOAuthPopup(
        authWindow,
        () => {
          oauthPopupWatchStopRef.current = null;
          void queryClient.invalidateQueries({
            queryKey: [...getGetStatusQueryKey(), walletQueryKeyScope],
          });
        },
      );

      toast.message(t('请在弹窗中完成 X 授权，完成后本页会自动刷新状态'));
    } catch {
      authWindow.close();
      // 错误由 appAxiosInstance 统一 toast
    } finally {
      setIsBindRequesting(false);
    }
  }

  return {
    isBound,
    isBindBusy,
    isStatusPending: isLogin && statusQuery.isPending,
    platformUsername,
    startTwitterBind,
  };
}
