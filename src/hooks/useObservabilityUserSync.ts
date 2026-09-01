/**
 * @file useObservabilityUserSync.ts
 * @description 主站登录态 → telemetry-kit：登录 setUser({ id })，退出 clearUser
 */

import { clearUser, setUser } from '@amazing-socrates/telemetry-kit';
import { useEffect } from 'react';
import useGlobalStore from '@/stores/global';

/**
 * @description 在根布局调用一次：登录 setUser({ id })，退出 clearUser
 */
export function useObservabilityUserSync(): void {
  const isLogin = useGlobalStore((s) => s.isLogin);
  const userId = useGlobalStore((s) => s.userProfile?.userId);

  useEffect(() => {
    const id = userId != null ? String(userId).trim() : '';

    if (isLogin && id) {
      // 生产只同步 id，不传 username / email
      setUser({ id });
      return;
    }

    clearUser();
  }, [isLogin, userId]);
}
