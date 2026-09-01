/** 剧场列表 H5 视图模式 */
export enum PlayTheaterViewMode {
  List = 'list',
  Grid = 'grid',
}

const PLAY_THEATER_VIEW_MODE_STORAGE_KEY = 'play-theater-view-mode:v1';

export function readStoredPlayTheaterViewMode(): PlayTheaterViewMode {
  if (typeof window === 'undefined') {
    // H5 稿默认双列宫格
    return PlayTheaterViewMode.Grid;
  }

  try {
    const stored = window.localStorage.getItem(
      PLAY_THEATER_VIEW_MODE_STORAGE_KEY,
    );
    if (
      stored === PlayTheaterViewMode.List ||
      stored === PlayTheaterViewMode.Grid
    ) {
      return stored;
    }
  } catch {
    // localStorage 不可用时降级为默认宫格视图。
  }

  return PlayTheaterViewMode.Grid;
}

export function storePlayTheaterViewMode(mode: PlayTheaterViewMode) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PLAY_THEATER_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage 不可用时忽略持久化。
  }
}
