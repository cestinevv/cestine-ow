export type MobileHomeTabPath = '/' | '/play';

const MOBILE_HOME_TAB_PATH_STORAGE_KEY = 'story:mobile-home-tab-path';

export function readMobileHomeTabPath(): MobileHomeTabPath {
  if (typeof window === 'undefined') {
    return '/';
  }

  try {
    return window.sessionStorage.getItem(MOBILE_HOME_TAB_PATH_STORAGE_KEY) ===
      '/play'
      ? '/play'
      : '/';
  } catch {
    return '/';
  }
}

export function writeMobileHomeTabPath(pathname: MobileHomeTabPath): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(MOBILE_HOME_TAB_PATH_STORAGE_KEY, pathname);
  } catch {
    // sessionStorage 不可用时保持首次默认推荐。
  }
}
