import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconMenu from '@/assets/svg/IconMenu';
import IconSearch from '@/assets/svg/IconSearch';
import { ContentContainer } from '@/components/common/ContentContainer';
import { LoginButton } from '@/components/LoginButton';
import { Button } from '@/components/ui/button';
import { getDefaultSearchTab } from '@/features/search/searchTypes';
import { MobileNavigationDrawer } from '@/layouts/components/MobileNavigationDrawer';
import {
  clearMobileSettingsDrawerRestore,
  readMobileSettingsDrawerRestore,
} from '@/layouts/components/mobileSettingsDrawerRestore';
import { isActorDetailPath } from '@/layouts/components/siteNavItems';
import { cn } from '@/utils';

function MobilePrimaryHeader({
  pathname,
  onMenuOpen,
}: {
  pathname: string;
  onMenuOpen: () => void;
}) {
  const { t } = useTranslation();
  const isHome = pathname === '/';
  const isTheater = pathname === '/play';
  const showPrimaryTabs = isHome || isTheater;
  const searchTab = getDefaultSearchTab(pathname);
  const iconButtonClass = isHome
    ? 'text-white hover:bg-white/10 hover:text-white'
    : 'text-foreground hover:bg-accent hover:text-foreground';

  return (
    <header
      className={cn(
        'top-0 z-50 w-full md:hidden',
        isHome
          ? 'fixed bg-gradient-to-b from-black/45 to-transparent pt-[env(safe-area-inset-top)] text-white'
          : 'sticky bg-background text-foreground',
      )}
    >
      <ContentContainer>
        <div className="relative flex h-11 w-full items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMenuOpen}
            className={cn('-ml-1 size-8 rounded-full', iconButtonClass)}
            aria-label={t('菜单')}
          >
            <IconMenu className="size-6" />
          </Button>

          {showPrimaryTabs ? (
            <nav
              className="absolute left-1/2 flex max-w-[calc(100%-11rem)] -translate-x-1/2 items-center gap-5 overflow-hidden"
              aria-label={t('菜单')}
            >
              <Link
                to="/play"
                resetScroll={false}
                preload="intent"
                className={cn(
                  'relative min-w-0 truncate text-center text-base leading-6 no-underline',
                  isTheater
                    ? 'font-bold text-foreground after:absolute after:-bottom-1.5 after:left-1/2 after:h-[3px] after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-current'
                    : 'font-medium text-white/80',
                )}
              >
                {t('短剧')}
              </Link>
              <Link
                to="/"
                resetScroll={false}
                preload="intent"
                className={cn(
                  'relative min-w-0 truncate text-center text-base leading-6 no-underline',
                  isHome
                    ? 'font-bold text-white after:absolute after:-bottom-1.5 after:left-1/2 after:h-[3px] after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-current'
                    : 'font-medium text-muted-foreground',
                )}
              >
                {t('推荐')}
              </Link>
            </nav>
          ) : null}

          <div className="flex items-center gap-2">
            <Link
              to="/search"
              search={{ type: searchTab }}
              preload="intent"
              aria-label={t('搜索')}
              className={cn(
                'flex size-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                iconButtonClass,
              )}
            >
              <IconSearch className="size-6" />
            </Link>
            <LoginButton appearance="avatarOnly" menuPresentation="sheet" />
          </div>
        </div>
      </ContentContainer>
    </header>
  );
}

export function MobileSiteHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const restoreSettingsPage = readMobileSettingsDrawerRestore('left');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(
    restoreSettingsPage !== null,
  );

  useEffect(() => {
    if (restoreSettingsPage) {
      clearMobileSettingsDrawerRestore('left');
    }
  }, [restoreSettingsPage]);

  if (
    pathname === '/play/search' ||
    pathname === '/search' ||
    isActorDetailPath(pathname)
  ) {
    return null;
  }

  const handleMobileMenuOpen = () => {
    setMobileMenuOpen(true);
  };

  return (
    <>
      <MobilePrimaryHeader
        pathname={pathname}
        onMenuOpen={handleMobileMenuOpen}
      />
      <MobileNavigationDrawer
        initialPage={restoreSettingsPage ? 'settings' : 'menu'}
        initialSettingsPage={restoreSettingsPage ?? 'settings'}
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
      />
    </>
  );
}
