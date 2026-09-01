import { cn } from '@/utils';

/** 顶栏主 CTA pill：发布 / 登录注册共用（foreground 底 + background 字） */
export const SITE_HEADER_PRIMARY_PILL_BUTTON_CLASS = cn(
  // Layout & Positioning
  'h-10 rounded-full',
  // Spacing
  'px-4 py-2',
  // Visual
  'bg-foreground text-sm leading-5 font-bold text-background',
  // State — 字色保持 background，避免 ghost/default 变体把 hover 改成 foreground
  'hover:bg-foreground hover:text-background hover:opacity-90',
);
