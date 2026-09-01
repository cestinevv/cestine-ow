/**
 * 短剧二级播放页关闭回退：记住「进入播放器之前」的 history 下标，
 * 播放器内再切剧/切集不更新该下标，关闭时一次回到入口页。
 */

function readHistoryIndex(): number | undefined {
  const index = (window.history.state as { __TSR_index?: number } | null)
    ?.__TSR_index;
  return typeof index === 'number' ? index : undefined;
}

/** `/play/:dramaId`，排除剧场首页、搜索、H5 watch */
export function isPlayDramaImmersivePath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 2 && parts[0] === 'play' && parts[1] !== 'search';
}

/** H5 `/play/:dramaId/watch` */
export function isPlayDramaWatchPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 3 && parts[0] === 'play' && parts[2] === 'watch';
}

let returnHistoryIndex: number | undefined;

export function rememberPlayImmersiveReturnIfNeeded() {
  if (typeof window === 'undefined') {
    return;
  }

  const currentIndex = readHistoryIndex();
  if (currentIndex === undefined) {
    return;
  }

  // 已在同一次播放会话中（含播放器内再 push 的后续剧）
  if (returnHistoryIndex !== undefined && currentIndex > returnHistoryIndex) {
    return;
  }

  returnHistoryIndex = Math.max(0, currentIndex - 1);
}

export function clearPlayImmersiveReturn() {
  returnHistoryIndex = undefined;
}

export function exitPlayImmersiveToReturn(fallback: () => void) {
  if (typeof window === 'undefined') {
    fallback();
    return;
  }

  const currentIndex = readHistoryIndex();
  const targetIndex = returnHistoryIndex;
  clearPlayImmersiveReturn();

  if (
    currentIndex !== undefined &&
    targetIndex !== undefined &&
    currentIndex > targetIndex
  ) {
    window.history.go(targetIndex - currentIndex);
    return;
  }

  fallback();
}
