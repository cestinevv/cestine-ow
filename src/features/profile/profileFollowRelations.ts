import type { CursorPageResponseFollowListItemResponse } from '@/api/__generated__/wallet/model/cursorPageResponseFollowListItemResponse';
import type { FollowListItemResponse } from '@/api/__generated__/wallet/model/followListItemResponse';
import {
  FollowListItemResponseRelationStatus,
  type FollowListItemResponseRelationStatus as ProfileFollowRelationStatus,
} from '@/api/__generated__/wallet/model/followListItemResponseRelationStatus';
import { FollowRelationResponseStatus } from '@/api/__generated__/wallet/model/followRelationResponseStatus';

export type ProfileFollowRelationTab = 'following' | 'followers' | 'mutuals';

export type ProfileRelationStatus =
  (typeof FollowRelationResponseStatus)[keyof typeof FollowRelationResponseStatus];

export const PROFILE_FOLLOW_DIALOG_CONTENT_MAX_HEIGHT_CLASS =
  'h-[min(747px,80vh)]';
export const PROFILE_FOLLOW_DIALOG_BODY_HEIGHT_CLASS = 'h-full min-h-0';
export const PROFILE_FOLLOW_DIALOG_BODY_HEIGHT = '100%';
export const PROFILE_FOLLOW_PAGE_SIZE = 20;

export function getProfileRelationActionLabel(status?: ProfileRelationStatus) {
  if (status === FollowRelationResponseStatus.FOLLOWING) {
    return '已关注';
  }

  if (status === FollowRelationResponseStatus.FOLLOW_BACK) {
    return '回关';
  }

  if (status === FollowRelationResponseStatus.MUTUAL) {
    return '互相关注';
  }

  return '关注';
}

export function getProfileFollowRelationActionLabel(
  status?: ProfileFollowRelationStatus,
) {
  if (status === FollowListItemResponseRelationStatus.FOLLOWING) {
    return '已关注';
  }

  if (status === FollowListItemResponseRelationStatus.FOLLOW_BACK) {
    return '回关';
  }

  if (status === FollowListItemResponseRelationStatus.MUTUAL) {
    return '互相关注';
  }

  return '关注';
}

export function getProfileRelationAction(status?: ProfileRelationStatus) {
  return status === FollowRelationResponseStatus.FOLLOWING ||
    status === FollowRelationResponseStatus.MUTUAL
    ? 'unfollow'
    : 'follow';
}

export function getProfileRelationStatusAfterFollow(
  status?: ProfileRelationStatus,
) {
  return status === FollowRelationResponseStatus.FOLLOW_BACK
    ? FollowRelationResponseStatus.MUTUAL
    : FollowRelationResponseStatus.FOLLOWING;
}

export function getProfileFollowRelationStatusAfterFollow(
  status?: ProfileFollowRelationStatus,
) {
  return status === FollowListItemResponseRelationStatus.FOLLOW_BACK
    ? FollowListItemResponseRelationStatus.MUTUAL
    : FollowListItemResponseRelationStatus.FOLLOWING;
}

export function getProfileRelationStatusAfterUnfollow(
  status?: ProfileRelationStatus,
) {
  return status === FollowRelationResponseStatus.MUTUAL
    ? FollowRelationResponseStatus.FOLLOW_BACK
    : FollowRelationResponseStatus.NONE;
}

export function getProfileFollowRelationStatusAfterUnfollow(
  status?: ProfileFollowRelationStatus,
) {
  return status === FollowListItemResponseRelationStatus.MUTUAL
    ? FollowListItemResponseRelationStatus.FOLLOW_BACK
    : FollowListItemResponseRelationStatus.NONE;
}

export function getProfileFollowNextPageParam(
  page: CursorPageResponseFollowListItemResponse | undefined,
): string | undefined {
  if (!page?.hasMore) {
    return undefined;
  }

  if (page.mark === undefined || page.mark === null) {
    return undefined;
  }

  const mark = String(page.mark);
  if (mark === '-1') {
    return undefined;
  }

  return mark;
}

export function getProfileFollowRows(
  pages: CursorPageResponseFollowListItemResponse[] | undefined,
): FollowListItemResponse[] {
  return pages?.flatMap((page) => page.list ?? []) ?? [];
}

export function shouldFetchProfileFollowNextPage({
  hasUserScrollIntent,
  scrollTop,
  clientHeight,
  scrollHeight,
}: {
  hasUserScrollIntent: boolean;
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}): boolean {
  return (
    hasUserScrollIntent &&
    scrollHeight > clientHeight &&
    scrollTop + clientHeight >= scrollHeight
  );
}

export function updateProfileFollowRelationItems(
  items: readonly FollowListItemResponse[],
  targetUserId: string,
  nextStatus: ProfileFollowRelationStatus | 'remove',
): FollowListItemResponse[] {
  if (nextStatus === 'remove') {
    return items.filter((item) => item.userId !== targetUserId);
  }

  return items.map((item) =>
    item.userId === targetUserId
      ? { ...item, relationStatus: nextStatus }
      : item,
  );
}
