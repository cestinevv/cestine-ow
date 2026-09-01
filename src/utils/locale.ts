import Cookies from 'js-cookie';

import { CLIENT_PERSIST_COOKIE_OPTIONS, LOCALE_COOKIE_KEY } from '@/constants';

export const APP_LOCALE_OPTIONS = [
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' },
  // { key: 'ko', label: '한국어' },
  { key: 'tr', label: 'Türkçe' },
  { key: 'vi', label: 'Tiếng Việt' },
  { key: 'es', label: 'Español' },
  { key: 'zh-CN', label: '简体中文' },
] as const;

export type AppLocale = (typeof APP_LOCALE_OPTIONS)[number]['key'];

/**
 * i18n 已加载资源的语言 key（含暂未开放站点切换器的 `ko`）。
 * APP 法律页 `?lang=` 使用此集合解析。
 */
export const I18N_LOCALE_KEYS = [
  'en',
  'ja',
  'ko',
  'tr',
  'vi',
  'es',
  'zh-CN',
] as const;

export type I18nLocale = (typeof I18N_LOCALE_KEYS)[number];

const LOCALE_SET = new Set<string>(APP_LOCALE_OPTIONS.map((item) => item.key));
const I18N_LOCALE_SET = new Set<string>(I18N_LOCALE_KEYS);

/** 与 `i18n` 默认语言一致：无 cookie / 无法识别时使用 `zh-CN`。 */
const DEFAULT_LOCALE: AppLocale = 'zh-CN';

export function normalizeLocale(raw: string | undefined | null): AppLocale {
  if (!raw) {
    return DEFAULT_LOCALE;
  }
  const trimmed = raw.trim();
  if (LOCALE_SET.has(trimmed)) {
    return trimmed as AppLocale;
  }
  const lower = trimmed.toLowerCase();
  if (LOCALE_SET.has(lower)) {
    return lower as AppLocale;
  }
  const base = lower.split('-')[0];
  if (base && LOCALE_SET.has(base)) {
    return base as AppLocale;
  }
  if (base === 'zh') {
    return 'zh-CN';
  }
  return DEFAULT_LOCALE;
}

/**
 * 解析 i18n 资源语言（含 `ko`）。无法识别时返回 `null`，由调用方决定缺省。
 */
export function normalizeI18nLocale(
  raw: string | undefined | null,
): I18nLocale | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (I18N_LOCALE_SET.has(trimmed)) {
    return trimmed as I18nLocale;
  }
  const lower = trimmed.toLowerCase();
  if (I18N_LOCALE_SET.has(lower)) {
    return lower as I18nLocale;
  }
  const base = lower.split('-')[0];
  if (base && I18N_LOCALE_SET.has(base)) {
    return base as I18nLocale;
  }
  if (base === 'zh') {
    return 'zh-CN';
  }
  return null;
}

/**
 * 浏览器端同步读取 `locale` cookie；非浏览器环境返回默认语言。
 * 首屏语言优先由 `i18n` 的 LanguageDetector 与根路由 `beforeLoad` 处理。
 */
export function readLocaleFromDocumentCookie(): AppLocale {
  if (typeof document === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const raw = Cookies.get(LOCALE_COOKIE_KEY);
  return normalizeLocale(raw);
}

export function syncLocaleToCookie(locale: AppLocale) {
  if (typeof document === 'undefined') {
    return;
  }

  Cookies.set(LOCALE_COOKIE_KEY, locale, CLIENT_PERSIST_COOKIE_OPTIONS);
}

/**
 * 后端按 `Accept-Language` 返回本地化字段时，queryKey 须包含当前语言，
 * 以便语言切换后 TanStack Query 重新请求而非命中旧语言缓存。
 */
export function withAcceptLanguageQueryKey<const T extends readonly unknown[]>(
  queryKey: T,
  locale: string,
): readonly [...T, string] {
  return [...queryKey, locale];
}
