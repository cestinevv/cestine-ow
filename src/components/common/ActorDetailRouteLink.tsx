import { Link } from '@tanstack/react-router';
import type { MouseEventHandler, ReactNode } from 'react';

import { NEW_TAB_ROUTE_LINK_PROPS } from '@/routing/newTabRouteLink';
import { cn } from '@/utils';

type ActorDetailRouteLinkProps = {
  actorId: string;
  className?: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  'aria-label'?: string;
  title?: string;
};

/** 角色 IP 详情：统一在新标签页打开 `/actor/$actorId` */
export function ActorDetailRouteLink({
  actorId,
  className,
  children,
  onClick,
  'aria-label': ariaLabel,
  title,
}: ActorDetailRouteLinkProps) {
  return (
    <Link
      to="/actor/$actorId"
      params={{ actorId }}
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
