import { cn } from '@/utils';

/**
 * 游戏面板竖向列表：隐藏原生条 + 细滚动条常显（候场 / 待办）。
 * 全站 ScrollArea 默认是悬停/滚动才出现；此处用 opacity-100 覆盖为常显。
 */
export const GAME_PANEL_VERTICAL_SCROLL_AREA_CLASS = cn(
  '[&_[data-slot=scroll-area-viewport]]:[scrollbar-width:none]',
  '[&_[data-slot=scroll-area-viewport]]:[-ms-overflow-style:none]',
  '[&_[data-slot=scroll-area-viewport]]:[&::-webkit-scrollbar]:hidden',
  '[&_[data-slot=scroll-area-viewport]]:pr-2',
  '[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:w-1',
  '[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:border-0',
  '[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:bg-transparent',
  '[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:p-0',
  '[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:pointer-events-auto',
  '[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:opacity-100',
  '[&_[data-slot=scroll-area-thumb]]:rounded-full',
  '[&_[data-slot=scroll-area-thumb]]:bg-scrollbar',
);

/** 待办单行高度：py-1.5×2 + h-8 操作按钮 */
export const GAME_TODO_ROW_HEIGHT_PX = 44;

/** 待办列表行间距 gap-3 */
export const GAME_TODO_ROW_GAP_PX = 12;

export const GAME_TODO_LIST_MAX_VISIBLE_ITEMS = 2;

/** 按可见条数计算待办滚动区固定高度（行高 + gap） */
export function getGameTodoListScrollHeightPx(maxVisibleItems: number): number {
  if (maxVisibleItems <= 0) {
    return 0;
  }

  return (
    GAME_TODO_ROW_HEIGHT_PX * maxVisibleItems +
    GAME_TODO_ROW_GAP_PX * (maxVisibleItems - 1)
  );
}

/** 待办列表默认滚动区高度（与 MAX_VISIBLE_ITEMS 对齐） */
export const GAME_TODO_LIST_SCROLL_MAX_HEIGHT_PX =
  getGameTodoListScrollHeightPx(GAME_TODO_LIST_MAX_VISIBLE_ITEMS);
