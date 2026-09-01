import { Link, useRouterState } from '@tanstack/react-router';
import { Fragment, type MouseEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconSiteNavAgentOff from '@/assets/svg/IconSiteNavAgentOff';
import IconSiteNavAgentOn from '@/assets/svg/IconSiteNavAgentOn';
import IconSiteNavHomeOff from '@/assets/svg/IconSiteNavHomeOff';
import IconSiteNavHomeOn from '@/assets/svg/IconSiteNavHomeOn';
import IconSiteNavIpOff from '@/assets/svg/IconSiteNavIpOff';
import IconSiteNavIpOn from '@/assets/svg/IconSiteNavIpOn';
import IconSiteNavMeOff from '@/assets/svg/IconSiteNavMeOff';
import IconSiteNavMeOn from '@/assets/svg/IconSiteNavMeOn';
import { useAppLogin } from '@/hooks/useAppLogin';
import { MobilePublishSheet } from '@/layouts/components/MobilePublishSheet';
import {
  type MobileHomeTabPath,
  readMobileHomeTabPath,
  writeMobileHomeTabPath,
} from '@/layouts/components/mobileHomeTabSession';
import {
  isActorDetailPath,
  isSiteNavPathActive,
} from '@/layouts/components/siteNavItems';
import { handleLockedNavClick } from '@/routing/tempNavGate';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';

type BottomNavIcon = typeof IconSiteNavHomeOn;

type BottomNavItem = {
  labelKey: string;
  to: string;
  requireLogin?: boolean;
  activeIcon: BottomNavIcon;
  inactiveIcon: BottomNavIcon;
};

type MobileBottomNavLinkProps = {
  item: BottomNavItem;
  active: boolean;
  label: string;
  onLoginRequiredNavigation: (event: MouseEvent<HTMLAnchorElement>) => void;
  onNavClick?: (event: MouseEvent<HTMLAnchorElement>, to: string) => boolean;
};

function MobileBottomNavLink({
  item,
  active,
  label,
  onLoginRequiredNavigation,
  onNavClick,
}: MobileBottomNavLinkProps) {
  const Icon = active ? item.activeIcon : item.inactiveIcon;

  return (
    <li className="flex min-w-0 flex-1">
      <Link
        to={item.to}
        resetScroll={false}
        activeOptions={
          item.to === '/' || item.to === '/profile'
            ? { exact: true }
            : undefined
        }
        onClick={(event) => {
          if (onNavClick?.(event, item.to)) {
            return;
          }

          if (item.requireLogin) {
            onLoginRequiredNavigation(event);
          }
        }}
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 py-3',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden">
          <Icon className="block size-7 max-h-full max-w-full" />
        </span>
        <span className="shrink-0 text-[10px] leading-3 tracking-[0.08px]">
          {label}
        </span>
      </Link>
    </li>
  );
}

const BOTTOM_NAV_ITEMS: readonly BottomNavItem[] = [
  {
    labelKey: '首页',
    to: '/',
    activeIcon: IconSiteNavHomeOn,
    inactiveIcon: IconSiteNavHomeOff,
  },
  {
    labelKey: 'IP市场',
    to: '/actor',
    activeIcon: IconSiteNavIpOn,
    inactiveIcon: IconSiteNavIpOff,
  },
  {
    labelKey: '经纪人',
    to: '/game',
    requireLogin: true,
    activeIcon: IconSiteNavAgentOn,
    inactiveIcon: IconSiteNavAgentOff,
  },
  {
    labelKey: '我的',
    to: '/profile',
    requireLogin: true,
    activeIcon: IconSiteNavMeOn,
    inactiveIcon: IconSiteNavMeOff,
  },
];

export function MobileBottomNav() {
  const { t } = useTranslation();
  const { login } = useAppLogin();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [homePath, setHomePath] = useState<MobileHomeTabPath>('/');

  useEffect(() => {
    if (pathname === '/' || pathname === '/play') {
      writeMobileHomeTabPath(pathname);
      setHomePath(pathname);
      return;
    }

    setHomePath(readMobileHomeTabPath());
  }, [pathname]);

  if (pathname === '/play/search' || isActorDetailPath(pathname)) {
    return null;
  }

  const handleLoginRequiredNavigation = (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    if (isLogin) {
      return;
    }

    event.preventDefault();
    login();
  };

  const handleBottomNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    to: string,
  ) => handleLockedNavClick(event, to, t);

  return (
    <nav
      aria-label={t('站点链接')}
      className={cn(
        // Layout & Positioning
        'fixed right-0 bottom-0 left-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden',
        // Visuals & Typography
        'bg-background/95 shadow-box backdrop-blur-[30px]',
      )}
    >
      <ul
        className={cn(
          // Layout & Positioning
          'flex h-[66px] w-full items-stretch justify-center',
        )}
      >
        {BOTTOM_NAV_ITEMS.map((item, index) => {
          const resolvedItem =
            item.to === '/' ? { ...item, to: homePath } : item;
          const active = isSiteNavPathActive(pathname, resolvedItem.to);

          return (
            <Fragment key={item.labelKey}>
              {index === 2 ? (
                <li className="flex min-w-0 flex-1 py-3">
                  <MobilePublishSheet />
                </li>
              ) : null}
              <MobileBottomNavLink
                item={resolvedItem}
                active={active}
                label={t(item.labelKey)}
                onLoginRequiredNavigation={handleLoginRequiredNavigation}
                onNavClick={handleBottomNavClick}
              />
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}
