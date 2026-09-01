import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import type { FocusEvent, MouseEvent } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import IconSiteNavNotify from '@/assets/svg/IconSiteNavNotify';
import { LoginButton } from '@/components/LoginButton';
import { Button } from '@/components/ui/button';
import { NotificationDesktopPopover } from '@/features/notification/components/NotificationDesktopPopover';
import { SearchField } from '@/features/search/components/SearchField';
import { getSearchResultQueryKey } from '@/features/search/searchResultQueryKey';
import {
  getDefaultSearchTab,
  isSearchKeywordValid,
  normalizeSearchKeyword,
  parseSearchTab,
  SEARCH_KEYWORD_VALIDATION_TOAST_ID,
} from '@/features/search/searchTypes';
import { useAppLogin } from '@/hooks/useAppLogin';
import { SITE_HEADER_PRIMARY_PILL_BUTTON_CLASS } from '@/layouts/components/siteHeaderPrimaryPillButton';
import { SITE_PUBLISH_ITEMS } from '@/layouts/components/sitePublishItems';
import { handleLockedNavClick } from '@/routing/tempNavGate';
import useGlobalStore, { getIsLoginFromStorage } from '@/stores/global';
import { cn } from '@/utils';

export function SiteTopNav() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login } = useAppLogin();
  const [authReady, setAuthReady] = useState(false);
  const isLogin = useGlobalStore((state) => state.isLogin);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const routeSearch = useRouterState({
    select: (state) => state.location.search,
  }) as { q?: unknown; type?: unknown };
  const query =
    pathname === '/search' && typeof routeSearch.q === 'string'
      ? routeSearch.q
      : undefined;
  const searchTab =
    pathname === '/search'
      ? parseSearchTab(routeSearch.type)
      : getDefaultSearchTab(pathname);
  const [searchDraft, setSearchDraft] = useState(query ?? '');
  const [isPublishMenuOpen, setIsPublishMenuOpen] = useState(false);
  const publishMenuRef = useRef<HTMLDivElement | null>(null);

  // 与 LoginButton 一致：layout 阶段从 userToken 同步 isLogin，再决定通知等登录态 UI
  useLayoutEffect(() => {
    useGlobalStore.setState({ isLogin: getIsLoginFromStorage() });
    setAuthReady(true);
  }, []);

  useEffect(() => {
    setSearchDraft(query ?? '');
  }, [query]);

  // 路由变化后关闭发布菜单；pathname 仅作触发依赖
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 pathname 才能在路由切换时关闭菜单
  useEffect(() => {
    setIsPublishMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const publishMenu = publishMenuRef.current;
    if (!isPublishMenuOpen || !publishMenu) {
      return;
    }

    const handlePublishMenuWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    publishMenu.addEventListener('wheel', handlePublishMenuWheel, {
      passive: false,
    });
    return () => {
      publishMenu.removeEventListener('wheel', handlePublishMenuWheel);
    };
  }, [isPublishMenuOpen]);

  if (pathname === '/play/search') {
    return null;
  }

  function handlePublishMenuOpen() {
    setIsPublishMenuOpen(true);
  }

  function handlePublishMenuClose() {
    setIsPublishMenuOpen(false);
  }

  function handlePublishMenuBlur(event: FocusEvent<HTMLDivElement>) {
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) {
      return;
    }

    setIsPublishMenuOpen(false);
  }

  // 触发条件：未登录点击发布菜单项
  // 行为目的：拦截跳转并拉起登录；已登录则关菜单后跳转
  const handlePublishClick = (
    event: MouseEvent<HTMLAnchorElement>,
    requireLogin: boolean,
    to: string,
  ) => {
    setIsPublishMenuOpen(false);

    if (handleLockedNavClick(event, to, t)) {
      return;
    }

    if (!requireLogin || isLogin) {
      return;
    }

    event.preventDefault();
    login();
  };

  const handleSearchSubmit = (historyKeyword?: string) => {
    const keyword = normalizeSearchKeyword(historyKeyword ?? searchDraft);
    if (!isSearchKeywordValid(keyword)) {
      toast.info(t('请输入 2～50 个字符'), {
        id: SEARCH_KEYWORD_VALIDATION_TOAST_ID,
      });
      return;
    }

    setSearchDraft(keyword);
    if (
      pathname === '/search' &&
      normalizeSearchKeyword(query ?? '') === keyword
    ) {
      void queryClient.resetQueries({
        queryKey: getSearchResultQueryKey(keyword, searchTab, i18n.language),
        exact: true,
      });
      return;
    }

    void navigate({
      to: '/search',
      search: { q: keyword, type: searchTab },
    });
  };

  const handleSearchClear = () => {
    setSearchDraft('');
  };

  const handleSearchDraftChange = (value: string) => {
    setSearchDraft(value);
  };

  return (
    <header
      className={cn(
        // Layout & Positioning
        'sticky top-0 z-40 hidden w-full shrink-0',
        'md:flex md:flex-col md:justify-center',
        // Spacing
        'h-14 px-4',
        // Visual
        'border-b-[0.5px] border-site-nav-border bg-background',
      )}
    >
      {/* 768 稿：搜索框弹性铺满；1440/2560 稿：三列栅格令 450px 搜索框居中。
          额外用 lg 断点是因为窄于 lg（1024.5px）时「450 搜索框 + 右侧操作区」已占满行宽，无法再分出等宽留白 */}
      <div
        className={cn(
          'flex w-full items-center gap-2',
          'lg:grid lg:grid-cols-[1fr_auto_1fr]',
        )}
      >
        {/* 左列：lg 起作为对称留白占位 */}
        <div className="hidden shrink-0 items-center lg:flex" />

        <div className="min-w-0 flex-1 lg:w-112.5 lg:max-w-full">
          <SearchField
            value={searchDraft}
            variant="toolbar"
            placeholder={t('搜索...')}
            validationVisible={false}
            onChange={handleSearchDraftChange}
            onSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:justify-end">
          {!authReady ? (
            <div className="size-10 shrink-0 rounded-full" aria-hidden />
          ) : isLogin ? (
            <NotificationDesktopPopover
              isLogin={isLogin}
              renderTrigger={({ hasUnread }) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'relative size-10 shrink-0 rounded-full',
                    'bg-site-nav-item-active text-foreground',
                    'hover:bg-site-nav-item-active/80',
                  )}
                  aria-label={t('通知')}
                >
                  <IconSiteNavNotify className="size-6" />
                  {hasUnread ? (
                    <span
                      className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive"
                      aria-hidden
                    />
                  ) : null}
                </Button>
              )}
            />
          ) : null}

          {!authReady ? (
            <div className="h-10 w-16 shrink-0 rounded-full" aria-hidden />
          ) : (
            /* biome-ignore lint/a11y/noStaticElementInteractions: 悬停容器需同时包住按钮与下拉菜单 */
            <div
              ref={publishMenuRef}
              className="relative shrink-0"
              onMouseEnter={handlePublishMenuOpen}
              onMouseLeave={handlePublishMenuClose}
              onFocusCapture={handlePublishMenuOpen}
              onBlurCapture={handlePublishMenuBlur}
            >
              <Button
                type="button"
                className={SITE_HEADER_PRIMARY_PILL_BUTTON_CLASS}
              >
                {t('发布')}
              </Button>
              <nav
                className={cn(
                  // Layout & Positioning
                  'absolute top-full right-0 z-50 pt-2',
                  // State
                  'transition-[opacity,visibility] duration-150',
                  isPublishMenuOpen
                    ? 'visible opacity-100'
                    : 'invisible opacity-0',
                )}
                aria-label={t('发布')}
              >
                <div
                  className={cn(
                    // 按文案自适应加宽，避免长文案语言换行
                    'flex w-max min-w-44 flex-col overflow-hidden rounded-xl bg-card',
                    'border border-border shadow-lg',
                  )}
                >
                  {SITE_PUBLISH_ITEMS.map(
                    ({ labelKey, to, Icon, requireLogin }, index) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={(event) =>
                          handlePublishClick(event, requireLogin, to)
                        }
                        className={cn(
                          'flex items-center gap-3 px-4 py-4 text-[15px] leading-5.5 font-medium whitespace-nowrap text-foreground no-underline',
                          'transition-colors hover:bg-muted',
                          index > 0 && 'border-t border-border',
                        )}
                      >
                        <Icon className="size-6 shrink-0 text-foreground" />
                        <span>{t(labelKey)}</span>
                      </Link>
                    ),
                  )}
                </div>
              </nav>
            </div>
          )}

          <LoginButton appearance="siteTop" />
        </div>
      </div>
    </header>
  );
}
