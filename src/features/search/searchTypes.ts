import { SHOW_DEV_ONLY_UI } from '@/utils';

export const SEARCH_TABS = ['drama', 'work', 'actor', 'user'] as const;

export type SearchTab = (typeof SEARCH_TABS)[number];

export const DEFAULT_SEARCH_TAB: SearchTab = 'drama';

export function getVisibleSearchTabs(): readonly SearchTab[] {
  if (SHOW_DEV_ONLY_UI) {
    return SEARCH_TABS;
  }

  return SEARCH_TABS.filter((tab) => tab !== 'actor');
}

export function sanitizeSearchTab(tab: SearchTab): SearchTab {
  if (SHOW_DEV_ONLY_UI || tab !== 'actor') {
    return tab;
  }

  return DEFAULT_SEARCH_TAB;
}

export const SEARCH_KEYWORD_MIN_LENGTH = 2;
export const SEARCH_KEYWORD_MAX_LENGTH = 50;
export const SEARCH_KEYWORD_VALIDATION_TOAST_ID = 'search-keyword-validation';

export function normalizeSearchKeyword(value: string): string {
  return value.trim();
}

export function isSearchKeywordValid(value: string): boolean {
  const keyword = normalizeSearchKeyword(value);
  return (
    keyword.length >= SEARCH_KEYWORD_MIN_LENGTH &&
    keyword.length <= SEARCH_KEYWORD_MAX_LENGTH
  );
}

export function parseSearchTab(value: unknown): SearchTab {
  const parsed = SEARCH_TABS.includes(value as SearchTab)
    ? (value as SearchTab)
    : DEFAULT_SEARCH_TAB;

  return sanitizeSearchTab(parsed);
}

export function getDefaultSearchTab(pathname: string): SearchTab {
  if (
    SHOW_DEV_ONLY_UI &&
    (pathname === '/actor' ||
      pathname.startsWith('/actor/') ||
      pathname === '/game' ||
      pathname.startsWith('/game/'))
  ) {
    return 'actor';
  }

  return DEFAULT_SEARCH_TAB;
}
