import { cn } from '@/utils';

/** Figma 970:115321 — 弹窗主按钮：page&sheet/dark + white-to-dark */
export const APP_DIALOG_PRIMARY_BUTTON_CLASS = cn(
  // Layout & Positioning
  'h-10 flex-1 rounded-xl',
  // Spacing
  'px-4 py-2.5',
  // Visuals & Typography
  'text-sm leading-5 font-bold',
  'bg-foreground text-background',
  // Interactions & States
  'hover:bg-foreground/90 hover:text-background',
  'disabled:border-transparent disabled:bg-button-disabled-surface',
  'disabled:text-button-disabled-on-surface',
  'disabled:hover:bg-button-disabled-surface',
);

/** Figma 970:115321 — 弹窗次按钮：1.5px 描边 + 主色字 */
export const APP_DIALOG_SECONDARY_BUTTON_CLASS = cn(
  // Layout & Positioning
  'h-10 flex-1 rounded-xl',
  // Spacing
  'px-4 py-2.5',
  // Visuals & Typography
  'border-[1.5px] border-border bg-background',
  'text-sm leading-5 font-bold text-foreground',
  // Interactions & States
  'hover:bg-muted/50',
  'disabled:text-button-disabled-foreground',
);

/** 单按钮全宽（知道了 / 确认）— 主按钮语义 */
export const APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS = cn(
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  'h-11 w-full flex-none',
);

/** 单按钮全宽 — 次按钮语义（知道了等仅关闭场景） */
export const APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS = cn(
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
  'h-11 w-full flex-none',
);
