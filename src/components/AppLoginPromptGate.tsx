import { useNavigate } from '@tanstack/react-router';
import { Fragment, type ReactNode } from 'react';

import { useAppLoginPromptGuard } from '@/hooks/useAppLoginPromptGuard';
import useGlobalStore from '@/stores/global';

type AppLoginPromptGateProps = {
  children: ReactNode;
};

/**
 * 受保护页壳：未登录时留在当前路由并拉起 Privy，不渲染业务内容，避免 401。
 * 关闭弹窗或登录态被清除时由守卫回跳首页。
 * 按 userId remount，避免切账户后业务页/弹窗仍挂着上一用户的本地态。
 */
export function AppLoginPromptGate({ children }: AppLoginPromptGateProps) {
  const navigate = useNavigate();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userId = useGlobalStore((state) => state.userProfile?.userId);

  useAppLoginPromptGuard(navigate);

  if (!isLogin) {
    return null;
  }

  return <Fragment key={userId ?? 'guest'}>{children}</Fragment>;
}
