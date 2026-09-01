import { DEFAULT_PAGE_SIZE } from '@/constants';
import {
  ACTOR_PLAZA_GRID_VIEW_CLASS,
  ACTOR_PLAZA_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/actor/constants/actorPlazaCardGrid';
import { cn } from '@/utils';

import { ActorPlazaCardSkeleton } from './ActorPlazaCardSkeleton';

/** 演员广场列表 / 骨架共用响应式网格（H5 双列；勿加 w-full） */
export const ACTOR_PLAZA_GRID_CLASS = cn(
  ACTOR_PLAZA_GRID_VIEW_CLASS,
  ACTOR_PLAZA_GRID_VIEW_DESKTOP_CLASS,
);

/** 分页 loading 时默认渲染与 pageSize 对齐的卡片骨架条数 */
export const ACTOR_PLAZA_LIST_SKELETON_COUNT = DEFAULT_PAGE_SIZE;

const ACTOR_SKELETON_KEYS = [
  'actor-skeleton-0',
  'actor-skeleton-1',
  'actor-skeleton-2',
  'actor-skeleton-3',
  'actor-skeleton-4',
  'actor-skeleton-5',
  'actor-skeleton-6',
  'actor-skeleton-7',
  'actor-skeleton-8',
  'actor-skeleton-9',
  'actor-skeleton-10',
  'actor-skeleton-11',
  'actor-skeleton-12',
  'actor-skeleton-13',
  'actor-skeleton-14',
  'actor-skeleton-15',
  'actor-skeleton-16',
  'actor-skeleton-17',
  'actor-skeleton-18',
  'actor-skeleton-19',
] as const;

type ActorPlazaListSkeletonItemsProps = {
  count?: number;
};

export function ActorPlazaListSkeletonItems({
  count = ACTOR_PLAZA_LIST_SKELETON_COUNT,
}: ActorPlazaListSkeletonItemsProps) {
  const skeletonCount = Math.min(count, ACTOR_SKELETON_KEYS.length);

  return (
    <>
      {ACTOR_SKELETON_KEYS.slice(0, skeletonCount).map((key) => (
        <li key={key}>
          <ActorPlazaCardSkeleton />
        </li>
      ))}
    </>
  );
}

type ActorPlazaListSkeletonProps = {
  count?: number;
};

export function ActorPlazaListSkeleton({
  count = ACTOR_PLAZA_LIST_SKELETON_COUNT,
}: ActorPlazaListSkeletonProps) {
  return (
    <ul aria-busy="true" className={ACTOR_PLAZA_GRID_CLASS}>
      <ActorPlazaListSkeletonItems count={count} />
    </ul>
  );
}
