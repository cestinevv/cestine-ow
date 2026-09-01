import { normalizeSearchKeyword } from '@/features/search/searchTypes';

const SEARCH_HISTORY_STORAGE_KEY = 'global-search-history-v1';
const SEARCH_HISTORY_LIMIT = 10;

export const SEARCH_HISTORY_CHANGE_EVENT = 'global-search-history-change';

type SearchHistoryPayload = {
  version: 1;
  items: string[];
};

function normalizeSearchHistory(items: unknown): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const normalized: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') {
      continue;
    }

    const keyword = normalizeSearchKeyword(item);
    if (!keyword || normalized.includes(keyword)) {
      continue;
    }

    normalized.push(keyword);
    if (normalized.length === SEARCH_HISTORY_LIMIT) {
      break;
    }
  }

  return normalized;
}

export function readSearchHistory(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const payload = JSON.parse(raw) as Partial<SearchHistoryPayload>;
    if (payload.version !== 1) {
      return [];
    }

    return normalizeSearchHistory(payload.items);
  } catch {
    return [];
  }
}

function writeSearchHistory(items: string[]): string[] {
  const normalized = normalizeSearchHistory(items);
  if (typeof window === 'undefined') {
    return normalized;
  }

  try {
    const payload: SearchHistoryPayload = { version: 1, items: normalized };
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(payload),
    );
    window.dispatchEvent(new Event(SEARCH_HISTORY_CHANGE_EVENT));
  } catch {
    // 隐私模式或存储配额异常时，搜索仍可继续使用。
  }

  return normalized;
}

export function addSearchHistory(keyword: string): string[] {
  const normalized = normalizeSearchKeyword(keyword);
  if (!normalized) {
    return readSearchHistory();
  }

  return writeSearchHistory([
    normalized,
    ...readSearchHistory().filter((item) => item !== normalized),
  ]);
}

export function removeSearchHistory(keyword: string): string[] {
  return writeSearchHistory(
    readSearchHistory().filter((item) => item !== keyword),
  );
}

export function clearSearchHistory(): string[] {
  return writeSearchHistory([]);
}
