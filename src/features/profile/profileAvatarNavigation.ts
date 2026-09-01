import { useRouter } from '@tanstack/react-router';
import type { MouseEvent } from 'react';

import { openRouteInNewTab } from '@/routing/newTabRouteLink';
import useGlobalStore from '@/stores/global';
import { readSnowflakeId } from '@/utils';

/** 是否可跳转到他人资料页（无 userId 或与当前登录用户相同则不可跳） */
export function canNavigateToUserProfile(
  targetUserId: string | undefined,
  currentUserId: string | undefined,
): boolean {
  if (!targetUserId) {
    return false;
  }

  if (!currentUserId) {
    return true;
  }

  return targetUserId !== currentUserId;
}

export function useProfileAvatarNavigation(userId?: string) {
  const router = useRouter();
  const currentUserId = readSnowflakeId(
    useGlobalStore((state) => state.userProfile?.userId),
  );
  const targetUserId = readSnowflakeId(userId);
  const isSelf =
    targetUserId !== undefined &&
    currentUserId !== undefined &&
    targetUserId === currentUserId;
  const canNavigate = canNavigateToUserProfile(targetUserId, currentUserId);

  function handleNavigate(event?: MouseEvent) {
    event?.stopPropagation();
    event?.preventDefault();

    if (!canNavigate || !targetUserId) {
      return;
    }

    openRouteInNewTab(router, {
      to: '/profile/$userId',
      params: { userId: targetUserId },
    });
  }

  return {
    canNavigate,
    handleNavigate,
    targetUserId,
    isSelf,
  };
}
