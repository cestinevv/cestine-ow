import {
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/play/playFormat';
import { cn } from '@/utils';

/** 叙述者中心卡片列表：与剧场封面流一致（H5 双列 gap 8px，桌面 auto-fill；勿加 w-full） */
export const NARRATOR_CARD_GRID_CLASS = cn(
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
);

/** 带列表语义的网格（ul） */
export const NARRATOR_CARD_GRID_LIST_CLASS = cn(
  NARRATOR_CARD_GRID_CLASS,
  'list-none p-0',
);

/** @deprecated 请使用 NARRATOR_CARD_GRID_LIST_CLASS */
export const DRAMA_NFT_CARD_GRID_CLASS = NARRATOR_CARD_GRID_LIST_CLASS;
