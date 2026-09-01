import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { UserProfileRouteLink } from '@/components/common/UserProfileRouteLink';
import { useProfileAvatarNavigation } from '@/features/profile/profileAvatarNavigation';
import { NEW_TAB_ROUTE_LINK_PROPS } from '@/routing/newTabRouteLink';
import { cn } from '@/utils';

type UserProfileAvatarLinkProps = {
  userId?: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
  /** 为 true 时本人头像也可跳转个人中心 `/profile`（默认本人仅展示） */
  allowSelfNavigate?: boolean;
};

/** 用户头像 / 名字跳转：他人 → `/profile/$userId` 新标签；本人默认不跳，可开 allowSelfNavigate */
export function UserProfileAvatarLink({
  userId,
  className,
  children,
  onNavigate,
  allowSelfNavigate = false,
}: UserProfileAvatarLinkProps) {
  const { canNavigate, targetUserId, isSelf } =
    useProfileAvatarNavigation(userId);

  if (allowSelfNavigate && isSelf) {
    return (
      <Link
        to="/profile"
        onClick={onNavigate}
        {...NEW_TAB_ROUTE_LINK_PROPS}
        className={cn(
          'inline-flex h-auto min-w-0 p-0 no-underline hover:bg-transparent',
          className,
        )}
      >
        {children}
      </Link>
    );
  }

  if (!canNavigate || !targetUserId) {
    return (
      <span className={cn('inline-flex min-w-0', className)}>{children}</span>
    );
  }

  return (
    <UserProfileRouteLink
      userId={targetUserId}
      onClick={onNavigate}
      className={cn(
        'inline-flex h-auto min-w-0 p-0 hover:bg-transparent',
        className,
      )}
    >
      {children}
    </UserProfileRouteLink>
  );
}
