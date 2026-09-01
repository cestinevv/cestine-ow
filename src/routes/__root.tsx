/// <reference types="vite/client" />

import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router';
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { createServerFn } from '@tanstack/react-start';
import Cookies from 'js-cookie';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import store2 from 'store2';

import '@/app.css';
import { VersionUpdater } from '@/components/common/VersionUpdater';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  CLIENT_PERSIST_COOKIE_OPTIONS,
  INVITE_CODE_PATTERN,
  INVITE_CODE_SESSION_STORAGE_KEY,
  LOCALE_COOKIE_KEY,
} from '@/constants';
import { parseLegalTheme } from '@/features/legal/legalSearch';
import { NotificationRealtimeProvider } from '@/features/notification/NotificationRealtimeBridge';
import { GlobalDialogs } from '@/global';
import { useObservabilityUserSync } from '@/hooks/useObservabilityUserSync';
import i18n from '@/i18n';
import { MobileBottomNav } from '@/layouts/components/MobileBottomNav';
import { SiteSideNav } from '@/layouts/components/SiteSideNav';
import { SiteTopNav } from '@/layouts/components/SiteTopNav';
import { isActorDetailPath } from '@/layouts/components/siteNavItems';
import { DefaultCatchBoundary } from '@/layouts/DefaultCatchBoundary';
import { MobileSiteHeader } from '@/layouts/Header';
import { NotFound } from '@/layouts/NotFound';
import { PrivyProviderWrapper } from '@/providers/PrivyProviderWrapper';
import { SolanaReactHooksProvider } from '@/providers/SolanaReactHooksProvider';
import GlobalThemeProvider from '@/providers/ThemeProvider';
import GlobalUpdater from '@/stores/updater';
import {
  IS_PRODUCTION,
  normalizeI18nLocale,
  normalizeLocale,
  seo,
  syncLocaleToCookie,
} from '@/utils';
import type { AppLocale, I18nLocale } from '@/utils/locale';

type AppLegalTheme = 'light' | 'dark';

const fetchLocaleServerFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    // Import server-only code inside the handler
    const { getCookie } = await import('@tanstack/react-start/server');
    const raw = getCookie(LOCALE_COOKIE_KEY);
    return normalizeLocale(raw ?? undefined);
  },
);

const APP_LEGAL_PATHS = new Set(['/privacy', '/terms']);

function readLangFromSearch(search: unknown): string | undefined {
  if (search && typeof search === 'object' && 'lang' in search) {
    const lang = (search as { lang?: unknown }).lang;
    if (typeof lang === 'string' && lang.trim()) {
      return lang.trim();
    }
  }

  return undefined;
}

function readLangFromSearchStr(
  searchStr: string | undefined,
): string | undefined {
  if (!searchStr) {
    return undefined;
  }

  const raw = searchStr.startsWith('?') ? searchStr.slice(1) : searchStr;
  const lang = new URLSearchParams(raw).get('lang');
  return lang?.trim() ? lang.trim() : undefined;
}

function readThemeFromSearch(search: unknown): AppLegalTheme | undefined {
  if (search && typeof search === 'object' && 'theme' in search) {
    return parseLegalTheme((search as { theme?: unknown }).theme);
  }

  return undefined;
}

function readThemeFromSearchStr(
  searchStr: string | undefined,
): AppLegalTheme | undefined {
  if (!searchStr) {
    return undefined;
  }

  const raw = searchStr.startsWith('?') ? searchStr.slice(1) : searchStr;
  return parseLegalTheme(new URLSearchParams(raw).get('theme'));
}

function resolveAppLegalLocale(location: {
  search: unknown;
  searchStr?: string;
}): I18nLocale {
  const langParam =
    readLangFromSearch(location.search) ??
    readLangFromSearchStr(location.searchStr);

  return normalizeI18nLocale(langParam) ?? 'en';
}

/** APP 法律页：有 ?theme=light|dark 用参数；无参 / 非法值固定深色。 */
function resolveAppLegalTheme(location: {
  search: unknown;
  searchStr?: string;
}): AppLegalTheme {
  return (
    readThemeFromSearch(location.search) ??
    readThemeFromSearchStr(location.searchStr) ??
    'dark'
  );
}

/** 法律页切语言：不覆盖站点 locale cookie（LanguageDetector 默认会写入）。 */
async function applyAppLegalLocale(locale: I18nLocale) {
  const previousCookie = Cookies.get(LOCALE_COOKIE_KEY);
  await i18n.changeLanguage(locale);

  if (typeof document === 'undefined') {
    return;
  }

  if (previousCookie !== undefined && previousCookie !== '') {
    syncLocaleToCookie(normalizeLocale(previousCookie));
  } else {
    Cookies.remove(LOCALE_COOKIE_KEY, {
      path: CLIENT_PERSIST_COOKIE_OPTIONS.path,
    });
  }

  document.documentElement.lang = locale;
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  beforeLoad: async ({ location }) => {
    const isAppLegalPage = APP_LEGAL_PATHS.has(location.pathname);
    let locale: AppLocale | I18nLocale = normalizeLocale(i18n.language);
    let theme: AppLegalTheme | undefined;

    if (isAppLegalPage) {
      // APP 法律页：有 ?lang= 用参数（含 ko）；无参固定英文。不读、不写站点 locale cookie。
      locale = resolveAppLegalLocale(location);
      await applyAppLegalLocale(locale);

      // APP 法律页：有 ?theme=light|dark 用参数；无参固定深色。不写入用户主题偏好。
      theme = resolveAppLegalTheme(location);
    } else if (typeof document !== 'undefined') {
      const rawLocale = Cookies.get(LOCALE_COOKIE_KEY);
      if (rawLocale !== undefined && rawLocale !== '') {
        locale = normalizeLocale(rawLocale);
      } else {
        // 无 cookie 时保留 i18n 初始化阶段 LanguageDetector 的结果（浏览器语言）
        locale = normalizeLocale(i18n.language);
      }
      await i18n.changeLanguage(locale);
    } else {
      locale = await fetchLocaleServerFn();
      await i18n.changeLanguage(locale);
    }

    return { locale, theme };
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no',
      },
      ...seo({
        title: 'StoryFun | AI-Powered Short Drama Platform',
        description:
          'StoryFun is the first AI-driven short drama platform. Create a story that belongs to you.',
      }),
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
    ],
    scripts: IS_PRODUCTION
      ? [
          {
            async: true,
            src: 'https://www.googletagmanager.com/gtag/js?id=G-65TKBNL6JN',
          },
          {
            children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-65TKBNL6JN');`,
          },
        ]
      : undefined,
  }),
  errorComponent: (props) => (
    <RootDocument>
      <DefaultCatchBoundary {...props} />
    </RootDocument>
  ),
  notFoundComponent: () => (
    <RootDocument>
      <NotFound />
    </RootDocument>
  ),
  component: RootComponent,
});

const PLAY_FULLSCREEN_PATH_PATTERN =
  /^\/play\/(?!search\/?$)[^/]+(?:\/watch)?\/?$/;

function AppDevtools() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isPlayFullscreenPage = PLAY_FULLSCREEN_PATH_PATTERN.test(pathname);

  if (!import.meta.env.DEV || isPlayFullscreenPage) {
    return null;
  }

  return (
    <>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      {/* <TanStackRouterDevtools position="bottom-right" /> */}
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const search = useRouterState({
    select: (state) => state.location.search,
  });
  const searchStr = useRouterState({
    select: (state) => state.location.searchStr,
  });
  const isPlayFullscreenPage = PLAY_FULLSCREEN_PATH_PATTERN.test(pathname);
  const isAppLegalPage = APP_LEGAL_PATHS.has(pathname);
  const hideSiteChrome = isPlayFullscreenPage || isAppLegalPage;
  const isStandaloneMobileSearch = pathname === '/play/search';
  const isActorDetailPage = isActorDetailPath(pathname);
  const legalForcedTheme = isAppLegalPage
    ? resolveAppLegalTheme({ search, searchStr })
    : undefined;

  // 法律页：客户端再同步一次语言，避免 LanguageDetector(cookie) 在 hydration 后盖掉 ?lang=
  useEffect(() => {
    if (!isAppLegalPage) {
      return;
    }

    const locale = resolveAppLegalLocale({ search, searchStr });
    void applyAppLegalLocale(locale);
  }, [isAppLegalPage, search, searchStr]);

  useEffect(() => {
    const inviteCode = new URLSearchParams(window.location.search).get('code');
    if (!inviteCode || !INVITE_CODE_PATTERN.test(inviteCode)) {
      return;
    }

    store2.set(INVITE_CODE_SESSION_STORAGE_KEY, inviteCode);
  }, []);

  // 登录态 → telemetry-kit（根布局同步，便于全局错误带上 user）
  useObservabilityUserSync();

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <GlobalThemeProvider forcedTheme={legalForcedTheme}>
          <SolanaReactHooksProvider>
            <PrivyProviderWrapper>
              <NotificationRealtimeProvider>
                <TooltipProvider>
                  {hideSiteChrome ? null : <MobileSiteHeader />}
                  <div
                    className={
                      hideSiteChrome
                        ? 'flex min-h-0 min-w-0 flex-1 flex-col'
                        : 'flex min-h-0 min-w-0 flex-1 flex-col md:flex-row'
                    }
                  >
                    {hideSiteChrome ? null : <SiteSideNav />}
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                      {hideSiteChrome ? null : <SiteTopNav />}
                      <main
                        className={
                          isPlayFullscreenPage
                            ? 'flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-none pb-0'
                            : isStandaloneMobileSearch ||
                                isAppLegalPage ||
                                isActorDetailPage
                              ? 'flex min-h-0 min-w-0 flex-1 flex-col pb-0'
                              : 'flex min-h-0 min-w-0 flex-1 flex-col pb-[calc(4.125rem+env(safe-area-inset-bottom))] md:pb-0'
                        }
                      >
                        <Outlet />
                      </main>
                    </div>
                  </div>
                  {hideSiteChrome ? null : <MobileBottomNav />}
                  <Toaster />
                </TooltipProvider>
                <VersionUpdater />
                <GlobalUpdater />
                <GlobalDialogs />
              </NotificationRealtimeProvider>
            </PrivyProviderWrapper>
          </SolanaReactHooksProvider>
        </GlobalThemeProvider>
        <AppDevtools />
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const { locale, theme } = Route.useRouteContext();

  return (
    <html lang={locale} data-theme={theme ?? 'dark'} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen m-0">
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        <Scripts />
      </body>
    </html>
  );
}
