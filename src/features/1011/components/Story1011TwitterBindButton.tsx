import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { SocialBindStatusResponse } from '@/api/__generated__/wallet/model/socialBindStatusResponse';
import {
  getGetStatusQueryKey,
  useGetStatus,
} from '@/api/__generated__/wallet/social-account-binding/social-account-binding';
import IconSocialX from '@/assets/svg/IconSocialX';
import { Button } from '@/components/ui/button';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import {
  fetchTwitterAuthorizationUrl,
  getTwitterBindResultSignal,
  navigateTwitterOAuthPopup,
  openTwitterOAuthPopup,
  watchTwitterOAuthPopup,
} from '@/features/social/socialBindOAuth';
import { useAppLogin } from '@/hooks/useAppLogin';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';

type Story1011TwitterBindButtonProps = {
  /** toolbar：顶栏大按钮；hero：登船区小按钮 */
  variant?: 'toolbar' | 'hero';
  className?: string;
};

export function Story1011TwitterBindButton({
  variant = 'hero',
  className,
}: Story1011TwitterBindButtonProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { login } = useAppLogin();

  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );

  const [isBindRequesting, setIsBindRequesting] = useState(false);
  const oauthPopupWatchStopRef = useRef<(() => void) | null>(null);
  /** 本轮绑定开始前的全局结果信号，用于判断是否已被页面级监听结算。 */
  const bindResultSignalRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      oauthPopupWatchStopRef.current?.();
      oauthPopupWatchStopRef.current = null;
    };
  }, []);

  const isBusy = isBindRequesting || (isLogin && statusQuery.isFetching);

  /**
   * 关窗兜底：后端 302 的落地域名写死，非同域时落地页 postMessage 收不到，
   * 因此以 getStatus 的绑定状态为准判定结果，而非默认失败。
   */
  async function settleBindResultByStatus() {
    try {
      const { data } = await statusQuery.refetch();

      if (unwrapOrvalPayload<SocialBindStatusResponse>(data)?.bound === true) {
        toast.success(t('绑定成功'));
        return;
      }

      toast.error(t('绑定失败'));
    } catch {
      toast.error(t('绑定失败'));
    }
  }

  /** 未登录→登录；未绑定→OAuth；已绑定仅展示，不可点 */
  async function handleClick() {
    if (isBound) {
      return;
    }

    if (!isLogin) {
      login();
      return;
    }

    // 必须在 await 前同步开窗，否则浏览器会改成新标签页
    const authWindow = openTwitterOAuthPopup(t('正在跳转…'));

    if (!authWindow) {
      return;
    }

    bindResultSignalRef.current = getTwitterBindResultSignal();
    setIsBindRequesting(true);

    try {
      const response = await fetchTwitterAuthorizationUrl();
      const redirectUrl = unwrapOrvalPayload<string>(response);

      if (!redirectUrl) {
        authWindow.close();
        toast.error(t('绑定失败'));
        return;
      }

      oauthPopupWatchStopRef.current?.();
      navigateTwitterOAuthPopup(authWindow, redirectUrl);

      oauthPopupWatchStopRef.current = watchTwitterOAuthPopup(
        authWindow,
        () => {
          oauthPopupWatchStopRef.current = null;

          // 页面级监听已处理本轮 postMessage 时，仅刷新状态，避免重复提示
          if (
            bindResultSignalRef.current !== null &&
            getTwitterBindResultSignal() !== bindResultSignalRef.current
          ) {
            void queryClient.invalidateQueries({
              queryKey: [...getGetStatusQueryKey(), walletQueryKeyScope],
            });
            return;
          }

          void settleBindResultByStatus();
        },
      );

      toast.message(t('请在弹窗中完成 X 授权，完成后本页会自动刷新状态'));
    } catch {
      authWindow.close();
      toast.error(t('绑定失败'));
    } finally {
      setIsBindRequesting(false);
    }
  }

  const label = isBound
    ? platformUsername
      ? `@${platformUsername.replace(/^@/, '')}`
      : t('已绑定')
    : t('绑定账号');

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={isBusy || isBound}
      onClick={handleClick}
      className={cn(
        'gap-2 rounded-lg bg-story-checkin-control text-sm leading-5 font-bold text-foreground',
        'hover:bg-story-checkin-control',
        // 已绑定 / 请求中：仅禁用交互，视觉与「绑定账号」一致
        'disabled:opacity-100 disabled:bg-story-checkin-control disabled:text-foreground',
        variant === 'toolbar' && 'h-11 px-4',
        variant === 'hero' && 'h-auto w-fit px-1.5 py-1',
        className,
      )}
    >
      <IconSocialX className="size-4" />
      {label}
    </Button>
  );
}
