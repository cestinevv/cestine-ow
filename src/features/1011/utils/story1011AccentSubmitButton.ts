import { cn } from '@/utils';

/** 1011 主操作提交钮（签到 / 登船表单）默认与 Loading 背景、文案色 */
export function getStory1011AccentSubmitButtonVisualClassName(
  isPending: boolean,
) {
  return isPending
    ? cn(
        // 主渐变 + white-to-dark 文案（Figma 6952:36847 / Colors/Text/white to dark）
        'onestory-bg-brand-gradient text-primary-foreground/80 opacity-60',
        'hover:opacity-60',
        'disabled:opacity-60 disabled:text-primary-foreground/80',
      )
    : cn(
        'onestory-bg-brand-gradient text-primary-foreground',
        'hover:opacity-90',
        // 未 pending 的禁用：与全站填充主按钮一致（7390:98041）
        'disabled:opacity-100 disabled:bg-button-disabled-surface',
        'disabled:bg-none disabled:text-button-disabled-on-surface',
        'disabled:hover:bg-button-disabled-surface',
      );
}

/** 签到「已签到」态（桌面日卡与移动紧凑区底栏共用） */
export const STORY_1011_CHECKIN_SIGNED_CONTROL_CLASS = cn(
  'flex w-full items-center justify-center rounded border-[1.5px] border-border px-3 py-1.5',
  'text-center text-sm leading-5 font-bold text-muted-foreground',
);
