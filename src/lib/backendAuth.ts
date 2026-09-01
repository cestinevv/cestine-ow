import store2 from 'store2';

/**
 * 后端登录态：仅以 localStorage 中的 userToken 为准。
 * 用于页面级路由拦截，不依赖 Privy 加载（ready / authenticated）。
 */
export function hasBackendLogin(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return Boolean(store2.get('userToken'));
}
