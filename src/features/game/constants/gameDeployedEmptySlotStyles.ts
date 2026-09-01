import { cn } from '@/utils';

/** Figma 160:130882 描边按钮（1.5 边框、14/20 Regular） */
export const GAME_DEPLOYED_EMPTY_SLOT_CTA_CLASS = cn(
  'inline-flex h-9 shrink-0 items-center justify-center rounded-xl px-4 py-1.5',
  'border-[1.5px] border-game-header-action-border bg-transparent',
  'text-sm leading-5 font-normal text-game-header-title',
  'transition-[background-color,border-color,color]',
  'group-hover/empty-slot:border-transparent group-hover/empty-slot:bg-foreground',
  'group-hover/empty-slot:text-background',
);
