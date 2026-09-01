import {
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
  PLAY_THEATER_LIST_GRID_CLASS,
} from '@/features/play/playFormat';
import { cn } from '@/utils';

import { PlayTheaterDramaCardSkeleton } from './PlayTheaterDramaCardSkeleton';

/** 首屏 / 切 Tag·排序 loading 时默认渲染 20 条卡片骨架（与 pageSize 对齐） */
export const PLAY_THEATER_DRAMA_LIST_SKELETON_COUNT = 20;

const DRAMA_SKELETON_KEYS = [
  'drama-skeleton-0',
  'drama-skeleton-1',
  'drama-skeleton-2',
  'drama-skeleton-3',
  'drama-skeleton-4',
  'drama-skeleton-5',
  'drama-skeleton-6',
  'drama-skeleton-7',
  'drama-skeleton-8',
  'drama-skeleton-9',
  'drama-skeleton-10',
  'drama-skeleton-11',
  'drama-skeleton-12',
  'drama-skeleton-13',
  'drama-skeleton-14',
  'drama-skeleton-15',
  'drama-skeleton-16',
  'drama-skeleton-17',
  'drama-skeleton-18',
  'drama-skeleton-19',
] as const;

type PlayTheaterDramaListSkeletonProps = {
  showMobileGrid: boolean;
  count?: number;
};

export function PlayTheaterDramaListSkeleton({
  showMobileGrid,
  count = PLAY_THEATER_DRAMA_LIST_SKELETON_COUNT,
}: PlayTheaterDramaListSkeletonProps) {
  const skeletonCount = Math.min(count, DRAMA_SKELETON_KEYS.length);

  return (
    <ul
      aria-busy="true"
      className={cn(
        showMobileGrid
          ? cn(
              PLAY_THEATER_GRID_VIEW_CLASS,
              PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
            )
          : PLAY_THEATER_LIST_GRID_CLASS,
      )}
    >
      {DRAMA_SKELETON_KEYS.slice(0, skeletonCount).map((key) => (
        <li key={key} className="h-full">
          <PlayTheaterDramaCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
