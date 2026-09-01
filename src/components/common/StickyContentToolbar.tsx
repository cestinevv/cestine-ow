import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { CONTENT_CONTAINER_STICKY_BLEED_CLASS } from '@/components/common/ContentContainer';
import { MD_MIN_WIDTH_MEDIA_QUERY } from '@/hooks/useAppBreakpoints';
import { cn } from '@/utils';

/** 移动端全局 header 高度 44px */
export const STICKY_CONTENT_TOOLBAR_TOP_MOBILE_PX = 44;

/** 桌面 SiteTopNav 高度 56px */
export const STICKY_CONTENT_TOOLBAR_TOP_DESKTOP_PX = 56;

/**
 * 吸顶 top 策略
 * - `header`：全程贴 mobile header（top-11）— 剧场筛选 / 创作管理
 * - `site-nav`：移动 top-11，桌面 top-14 — 角色 IP 市场
 */
export type StickyContentToolbarTopOffset = 'header' | 'site-nav';

const STICKY_CONTENT_TOOLBAR_BASE_CLASS = cn(
  // Layout & Positioning — 勿加 w-full，否则负边距无法撑满
  // z-30：高于列表卡内审核标/更多等局部叠层，低于移动端全局 header(z-50)
  'sticky z-30 flex flex-col items-start',
  // Visuals
  'bg-points-page-surface-muted',
);

function getStickyContentToolbarTopClass(
  topOffset: StickyContentToolbarTopOffset,
) {
  return topOffset === 'site-nav' ? 'top-11 md:top-14' : 'top-11';
}

/**
 * 吸顶判定用的像素 top（与 sticky class 对齐）。
 * 滚动监听 / 回到顶部等逻辑应复用此函数，避免各页各写一套。
 */
export function getStickyContentToolbarTopPx(
  topOffset: StickyContentToolbarTopOffset = 'header',
) {
  if (topOffset === 'site-nav') {
    return window.matchMedia(MD_MIN_WIDTH_MEDIA_QUERY).matches
      ? STICKY_CONTENT_TOOLBAR_TOP_DESKTOP_PX
      : STICKY_CONTENT_TOOLBAR_TOP_MOBILE_PX;
  }

  return STICKY_CONTENT_TOOLBAR_TOP_MOBILE_PX;
}

/** 供 Skeleton / 自定义根节点复用同一套吸顶壳 class */
export function stickyContentToolbarClassName({
  topOffset = 'header',
  className,
}: {
  topOffset?: StickyContentToolbarTopOffset;
  className?: string;
} = {}) {
  return cn(
    STICKY_CONTENT_TOOLBAR_BASE_CLASS,
    getStickyContentToolbarTopClass(topOffset),
    CONTENT_CONTAINER_STICKY_BLEED_CLASS,
    className,
  );
}

type StickyContentToolbarOwnProps = {
  children: ReactNode;
  /**
   * 吸顶贴顶策略。默认 `header`（全程 top-11）。
   * 角色 IP 等桌面有更高 SiteTopNav 时用 `site-nav`。
   */
  topOffset?: StickyContentToolbarTopOffset;
  /** 根节点，默认 section；无障碍名不需要时可传 div */
  as?: 'section' | 'div';
};

type StickyContentToolbarProps = StickyContentToolbarOwnProps &
  Omit<ComponentPropsWithoutRef<'section'>, keyof StickyContentToolbarOwnProps>;

/**
 * 列表页吸顶工具栏壳（剧场筛选 / 角色 IP / 创作管理等共用）。
 *
 * 统一维护：sticky、z-index、top、移动端横向铺满、背景色。
 * 各页差异（gap / pt / pb）通过 `className` 传入。
 *
 * 水平留白与 {@link CONTENT_CONTAINER_STICKY_BLEED_CLASS} / 版心 `px-2 md:px-4` 同源。
 */
export function StickyContentToolbar({
  children,
  className,
  topOffset = 'header',
  as = 'section',
  ...props
}: StickyContentToolbarProps) {
  const Comp = as as ElementType;

  return (
    <Comp
      className={stickyContentToolbarClassName({ topOffset, className })}
      {...props}
    >
      {children}
    </Comp>
  );
}
