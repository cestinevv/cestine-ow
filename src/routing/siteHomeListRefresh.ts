/** 侧栏「短剧 / IP市场」列表首页：同页再点刷新信号 */

export const SITE_HOME_LIST_REFRESH_EVENT = 'site-home-list-refresh';

export type SiteHomeListRefreshPath = '/play' | '/actor';

export type SiteHomeListRefreshDetail = {
  path: SiteHomeListRefreshPath;
};

const SITE_HOME_LIST_REFRESH_PATHS = new Set<string>(['/play', '/actor']);

/** 是否为可触发「同页再点刷新」的列表首页（不含详情 / 搜索子路） */
export function isExactSiteHomeListPath(pathname: string, to: string): boolean {
  if (!SITE_HOME_LIST_REFRESH_PATHS.has(to)) {
    return false;
  }

  return pathname === to || pathname === `${to}/`;
}

export function emitSiteHomeListRefresh(path: SiteHomeListRefreshPath): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<SiteHomeListRefreshDetail>(SITE_HOME_LIST_REFRESH_EVENT, {
      detail: { path },
    }),
  );
}

export function subscribeSiteHomeListRefresh(
  path: SiteHomeListRefreshPath,
  onRefresh: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleRefresh = (event: Event) => {
    const detail = (event as CustomEvent<SiteHomeListRefreshDetail>).detail;
    if (detail?.path !== path) {
      return;
    }

    onRefresh();
  };

  window.addEventListener(SITE_HOME_LIST_REFRESH_EVENT, handleRefresh);
  return () => {
    window.removeEventListener(SITE_HOME_LIST_REFRESH_EVENT, handleRefresh);
  };
}
