import { Link } from '@tanstack/react-router';
import type { MouseEventHandler, ReactNode } from 'react';

import { NEW_TAB_ROUTE_LINK_PROPS } from '@/routing/newTabRouteLink';
import { cn } from '@/utils';

type UserProfileRouteLinkProps = {
  userId: string;
  className?: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  'aria-label'?: string;
  title?: string;
};

/** 他人个人主页：统一在新标签页打开 `/profile/$userId` */
export function UserProfileRouteLink({
  userId,
  className,
  children,
  onClick,
  'aria-label': ariaLabel,
  title,
}: UserProfileRouteLinkProps) {
  return (
    <Link
      to="/profile/$userId"
      params={{ userId }}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      {...NEW_TAB_ROUTE_LINK_PROPS}
      className={cn('no-underline', className)}
    >
      {children}
    </Link>
  );
}
