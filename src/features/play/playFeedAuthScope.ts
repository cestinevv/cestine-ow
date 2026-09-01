export const PLAY_FEED_AUTH_SCOPE_GUEST = 'guest';
export const PLAY_FEED_AUTH_SCOPE_PENDING = 'authenticated:pending';

/** 推荐 Feed query key 身份域：游客、登录中间态与各登录用户隔离缓存 */
export function getPlayFeedAuthScope(
  isLogin: boolean,
  userId?: string | null,
): string {
  if (!isLogin) {
    return PLAY_FEED_AUTH_SCOPE_GUEST;
  }

  if (!userId) {
    return PLAY_FEED_AUTH_SCOPE_PENDING;
  }

  return `user:${userId}`;
}
