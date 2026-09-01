import { useEffect, useRef } from 'react';

import { hasBackendLogin } from '@/lib/backendAuth';
import useGlobalStore from '@/stores/global';

import { useAppLogin } from './useAppLogin';

type NavigateToHome = (options: { to: '/' }) => void | Promise<void>;

/**
 * 页面级登录提示守卫（客户端）：
 * - 未登录直访时主动拉起 Privy 登录弹窗，保留当前路由不强制跳转；
 * - 登录成功后留在当前页面；
 * - 用户关闭弹窗（未完成登录）或会话失效时回跳首页。
 *
 * 业务页请用 `AppLoginPromptGate` 包裹，未登录期间不渲染 children。
 */
export function useAppLoginPromptGuard(navigate: NavigateToHome) {
  const isLogin = useGlobalStore((state) => state.isLogin);
  const { login, isLogging } = useAppLogin();

  const hasPromptedRef = useRef(false);
  const wasLoggingRef = useRef(false);

  useEffect(() => {
    // 已登录无需弹窗
    if (isLogin || hasBackendLogin()) {
      return;
    }

    // 同一次访问仅拉起一次弹窗，避免与 Privy 弹窗状态冲突
    if (hasPromptedRef.current || isLogging) {
      return;
    }

    hasPromptedRef.current = true;
    login();
  }, [isLogin, isLogging, login]);

  useEffect(() => {
    // 监听 isLogging: true → false 的关闭瞬间；若仍未登录则视为「用户关闭弹窗」
    if (wasLoggingRef.current && !isLogging && !isLogin && !hasBackendLogin()) {
      void navigate({ to: '/' });
    }

    wasLoggingRef.current = isLogging;
  }, [isLogging, isLogin, navigate]);

  useEffect(() => {
    // 其它入口（如多 Tab 登出）清除登录态时兜底回首页
    return useGlobalStore.subscribe((state, prev) => {
      if (prev.isLogin && !state.isLogin && !hasBackendLogin()) {
        void navigate({ to: '/' });
      }
    });
  }, [navigate]);
}
