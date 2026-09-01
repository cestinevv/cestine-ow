import { DEFAULT_PAGE_SIZE_STRING } from '@/constants';

export const GAME_DEPLOY_SLOT_COUNT = 5;

/**
 * 派遣槽位卡片最小宽度。
 * 宽屏时 5 卡 grid `1fr` 均分撑满；收窄至该下限后触发横向滚动。
 */
export const GAME_DEPLOYED_ACTOR_CARD_MIN_WIDTH_PX = 200;

/** 桌面派遣卡头图比例 6:5（宽:高） */
export const GAME_DEPLOYED_ACTOR_COVER_ASPECT_CLASS = 'aspect-[6/5]';

/**
 * 信息区高度（与 carousel 卡 body 对齐）：p-4 + 2×gap-3 + 标题 + 体力行 + 片酬 + 按钮。
 * 供最小宽度下的高度下限 / Loading 骨架与实卡对齐。
 */
export const GAME_DEPLOYED_ACTOR_CARD_BODY_HEIGHT_PX =
  16 * 2 + 12 * 2 + 24 + 16 + 2 + 20 + 36;

/**
 * 桌面派遣卡在最小宽度下的高度下限（6:5 头图 + 信息区），避免加载前后高度跳动。
 */
export const GAME_DEPLOYED_ACTOR_CARD_HEIGHT_PX =
  (GAME_DEPLOYED_ACTOR_CARD_MIN_WIDTH_PX * 5) / 6 +
  GAME_DEPLOYED_ACTOR_CARD_BODY_HEIGHT_PX;

/** 派遣横向列表间距（与改动前 DRAMA_CARD_GRID_GAP_PX / gap-5 一致，20px） */
export const GAME_DEPLOY_CAROUSEL_GAP_PX = 20;

/**
 * 5 槽位轨最小总宽（5×min + 4×gap）。
 * 视口窄于此值时由 ScrollArea 横向滚动；更宽时 `1fr` 均分撑满。
 */
export const GAME_DEPLOYED_ACTOR_TRACK_MIN_WIDTH_PX =
  GAME_DEPLOY_SLOT_COUNT * GAME_DEPLOYED_ACTOR_CARD_MIN_WIDTH_PX +
  (GAME_DEPLOY_SLOT_COUNT - 1) * GAME_DEPLOY_CAROUSEL_GAP_PX;

/**
 * 桌面派遣列表：固定 5 列 + `minmax(200px, 1fr)`（对齐广场卡 `1fr` 均分思路），
 * `w-full` + `minWidth` 轨下限，宽屏均分、窄屏横滑。
 */
export const GAME_DEPLOYED_ACTOR_LIST_STYLE = {
  gap: GAME_DEPLOY_CAROUSEL_GAP_PX,
  gridTemplateColumns: `repeat(${GAME_DEPLOY_SLOT_COUNT}, minmax(${GAME_DEPLOYED_ACTOR_CARD_MIN_WIDTH_PX}px, 1fr))`,
  minWidth: GAME_DEPLOYED_ACTOR_TRACK_MIN_WIDTH_PX,
} as const;

/** 底部槽位小导航头像尺寸（Figma 5915:36302，32px） */
export const GAME_DEPLOY_SLOT_NAV_SIZE_PX = 32;

/** 底部槽位小导航间距（Figma 5915:36302，~6px） */
export const GAME_DEPLOY_SLOT_NAV_GAP_PX = 6;

/** 将目标槽位卡片滚动到视口右侧（用于小导航点击） */
export function getGameDeploySlotEndAlignScrollLeft(
  viewportWidth: number,
  slotOffsetLeft: number,
  slotWidth: number,
  scrollWidth: number,
): number {
  const maxScrollLeft = Math.max(0, scrollWidth - viewportWidth);
  const targetScrollLeft = slotOffsetLeft + slotWidth - viewportWidth;

  return Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));
}

/** 派遣槽位卡片在网格内占满单元格，与 GameMyActorCard 一致 */
export const GAME_DEPLOYED_ACTOR_SLOT_SIZE_CLASS = 'h-full w-full';

/** 派遣中实卡根节点类名，用于整卡选中与样式锚点 */
export const GAME_DEPLOYED_ACTOR_CARD_CLASS = 'game-deployed-actor-card';

/** 我的角色无限列表 queryKey 分段（pageSize 变更时失效旧缓存） */
export const GAME_MY_ACTORS_MIXED_PAGE_KEY = [
  'pageSize',
  DEFAULT_PAGE_SIZE_STRING,
] as const;

export function getGameMyActorsPageSize(_pageNum?: string): string {
  return DEFAULT_PAGE_SIZE_STRING;
}

export const GAME_ACTOR_SORT_OPTIONS = [
  { value: 'COMPUTING_POWER', labelKey: '片酬最高' },
  { value: 'LEVEL', labelKey: '等级最高' },
  { value: 'HEAT', labelKey: '热度最高' },
  { value: 'STAMINA', labelKey: '体力最高' },
] as const;

export type GameActorSort = (typeof GAME_ACTOR_SORT_OPTIONS)[number]['value'];

/** listAllActors 固定查询参数：排除已满级角色 */
export const GAME_LIST_ALL_ACTORS_EXCLUDE_MAX_LEVEL = 'true';
