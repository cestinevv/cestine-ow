/**
 * 角色相关列表卡片（演员广场 / 个人中心 IP / 搜索演员）列宽与封面比。
 * 与剧场短剧 `PLAY_DRAMA_CARD_*` / `PLAY_THEATER_*` 完全独立，勿混用。
 *
 * 列弹性与短剧首页一致（auto-fill + `1fr` 均分铺满），仅以下不同：
 * 1. 最小宽度 222（剧场 190）
 * 2. 封面宽高比 6:5（剧场 3:4）
 */

/** 角色卡列最小宽度（px） */
export const ACTOR_PLAZA_CARD_MIN_WIDTH_PX = 222;

export const ACTOR_PLAZA_CARD_MIN_WIDTH_CLASS = 'min-w-[222px]';

/**
 * 角色卡封面宽高比 6:5（与剧场短剧 3:4 分开）
 * Tailwind 需完整静态串
 */
export const ACTOR_PLAZA_CARD_COVER_ASPECT_CLASS = 'aspect-6/5';

/**
 * auto-fill 单列模板（与短剧同款弹性：`1fr`）
 * minmax(min(100%, 222px), 1fr)
 */
export const ACTOR_PLAZA_CARD_GRID_TRACK_CLASS =
  'grid-cols-[repeat(auto-fill,minmax(min(100%,222px),1fr))]';

/** 角色列表网格：222px 起 auto-fill；卡片间距 8px（全断点；窄屏易单列，优先用 GRID_VIEW） */
export const ACTOR_PLAZA_LIST_GRID_CLASS =
  'grid w-full list-none grid-cols-[repeat(auto-fill,minmax(min(100%,222px),1fr))] gap-2 p-0';

/** 角色 H5 宫格（2 列；卡片间距 8px；左右净边距随版心 px-2） */
export const ACTOR_PLAZA_GRID_VIEW_CLASS =
  'grid w-full list-none grid-cols-2 gap-2 p-0';

/** 桌面端覆盖 H5 宫格列数与边距；间距保持 8px（`gap-2`） */
export const ACTOR_PLAZA_GRID_VIEW_DESKTOP_CLASS =
  'md:mx-0 md:grid-cols-[repeat(auto-fill,minmax(min(100%,222px),1fr))] md:gap-2';

/**
 * 最小列宽 222px 时单行角色卡约高：封面 aspect-6/5 + 文案区（与剧场单行 minHeight 同口径）
 */
export const ACTOR_PLAZA_CARD_ROW_MIN_HEIGHT_PX =
  Math.ceil((ACTOR_PLAZA_CARD_MIN_WIDTH_PX * 5) / 6) + 72;
