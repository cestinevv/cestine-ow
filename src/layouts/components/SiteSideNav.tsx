import { Link, useRouterState } from '@tanstack/react-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import IconLogo from '@/assets/svg/IconLogo';
import IconLogoText from '@/assets/svg/IconLogoText';
import { useAppLogin } from '@/hooks/useAppLogin';
import {
  emitSiteHomeListRefresh,
  isExactSiteHomeListPath,
  type SiteHomeListRefreshPath,
} from '@/routing/siteHomeListRefresh';
import { handleLockedNavClick } from '@/routing/tempNavGate';
import useGlobalStore from '@/stores/global';
import { cn, SHOW_DEV_ONLY_UI } from '@/utils';

import { SiteSettingsPopover } from './SiteSettingsPopover';
import {
  isSiteNavPathActive,
  SHOW_SITE_EVENT_NAV,
  SITE_EVENT_NAV_ITEM,
  SITE_PRIMARY_NAV_ITEMS,
  SITE_SECONDARY_NAV_ITEMS,
  type SiteNavItem,
} from './siteNavItems';

const SITE_HOME_LIST_NAV_IDS = new Set(['drama', 'actor-ip']);

function SiteNavLink({
  item,
  onClick,
}: {
  item: SiteNavItem;
  onClick?: ComponentProps<typeof Link>['onClick'];
}) {
  const { t } = useTranslation();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const active = isSiteNavPathActive(pathname, item.to);
  const Icon = active ? item.activeIcon : item.inactiveIcon;
  const label = item.label ?? (item.labelKey ? t(item.labelKey) : '');

  return (
    <Link
      to={item.to}
      resetScroll={false}
      activeOptions={
        item.to === '/' || item.to === '/profile' ? { exact: true } : undefined
      }
      onClick={onClick}
      aria-label={label}
      className={cn(
        // Layout & Positioning
        'flex w-full items-center rounded-xl',
        // Spacing — <lg 仅图标；≥lg 对齐设计稿 px-4 py-2、gap-5（lg = 1024.5px）
        'justify-center gap-0 px-2 py-2 lg:justify-start lg:gap-5 lg:px-4',
        // Visual
        'text-[15px] leading-5.5 font-normal no-underline transition-colors',
        active
          ? 'bg-site-nav-item-active text-foreground'
          : 'text-wallet-text-secondary hover:bg-site-nav-item-active/70 hover:text-foreground',
      )}
    >
      <Icon className="size-6 shrink-0" />
      <span className="hidden min-w-0 flex-1 lg:block">{label}</span>
    </Link>
  );
}

export function SiteSideNav() {
  const { t } = useTranslation();
  const { login } = useAppLogin();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const secondaryNavItems = SHOW_DEV_ONLY_UI ? SITE_SECONDARY_NAV_ITEMS : [];

  const handleLoginRequiredClick: ComponentProps<typeof Link>['onClick'] = (
    event,
  ) => {
    if (isLogin) {
      return;
    }

    event.preventDefault();
    login();
  };

  return (
    <aside
      className={cn(
        // Layout & Positioning — flex 子项 + sticky；≥lg 才随多语言文案伸缩
        'sticky top-0 z-40 hidden h-dvh shrink-0 flex-col justify-between self-start md:flex',
        'w-max lg:min-w-(--site-side-nav-width)',
        // Spacing — 窄档紧凑内边距
        'p-2 lg:p-4',
        // Visual
        'border-r-[0.5px] border-site-nav-border bg-background',
      )}
      aria-label={t('菜单')}
    >
      <div className="flex w-full flex-col gap-4">
        <Link
          to="/"
          resetScroll={false}
          className={cn(
            'flex items-center justify-center rounded-xl text-inherit no-underline lg:justify-start',
            'px-2 py-2 lg:px-4',
          )}
          aria-label="StoryFun"
        >
          <IconLogo className="size-6 shrink-0 lg:hidden" />
          <IconLogoText className="hidden h-6 w-auto lg:block" />
        </Link>

        <div className="flex flex-col gap-2">
          {SHOW_SITE_EVENT_NAV ? (
            <>
              <SiteNavLink item={SITE_EVENT_NAV_ITEM} />

              <div
                className="hidden h-3 w-full items-center lg:flex"
                aria-hidden
              >
                <div className="mx-2 h-px w-full bg-site-nav-border" />
              </div>
            </>
          ) : null}

          {SITE_PRIMARY_NAV_ITEMS.map((item) => (
            <SiteNavLink
              key={item.id}
              item={item}
              onClick={(event) => {
                if (handleLockedNavClick(event, item.to, t)) {
                  return;
                }

                if (item.requireLogin) {
                  handleLoginRequiredClick(event);
                  if (event.defaultPrevented) {
                    return;
                  }
                }

                // 短剧 / IP市场：已在列表首页再点 → 保留筛选，回顶并从第 1 页重拉
                if (
                  !SITE_HOME_LIST_NAV_IDS.has(item.id) ||
                  !isExactSiteHomeListPath(pathname, item.to)
                ) {
                  return;
                }

                emitSiteHomeListRefresh(item.to as SiteHomeListRefreshPath);
              }}
            />
          ))}

          {secondaryNavItems.length > 0 ? (
            <>
              <div
                className="hidden h-3 w-full items-center lg:flex"
                aria-hidden
              >
                <div className="mx-2 h-px w-full bg-site-nav-border" />
              </div>

              {secondaryNavItems.map((item) => (
                <SiteNavLink key={item.id} item={item} />
              ))}
            </>
          ) : null}
        </div>
      </div>

      <SiteSettingsPopover />
    </aside>
  );
}
