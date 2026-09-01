/** 剧场单剧播放页路径：`/play/:dramaId`（不含 `/play` 列表） */
const PLAY_DETAIL_PATH = /^\/play\/[^/]+$/;

/** 登录/登出后刷新当前剧页，使解锁进度、互动态等与后端登录态一致 */
export function reloadPlayDetailPageIfActive(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!PLAY_DETAIL_PATH.test(window.location.pathname)) {
    return;
  }

  window.location.reload();
}
