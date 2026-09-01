/** 选集网格列数（Figma 4938:25811） */
export const PLAY_EPISODE_GRID_COLS = 5;

/** 选集网格最多展示行数，超出滚动（Figma 4938:25811） */
export const PLAY_EPISODE_GRID_MAX_ROWS = 8;

/** 单格高度 62px + 行间距 gap-2（8px），8 行最大滚动高度 */
export const PLAY_EPISODE_GRID_SCROLL_MAX_HEIGHT_PX =
  PLAY_EPISODE_GRID_MAX_ROWS * 62 + (PLAY_EPISODE_GRID_MAX_ROWS - 1) * 8;
