export const LOCALE_COOKIE_KEY = 'locale';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const INVITE_CODE_SESSION_STORAGE_KEY = 'inviteCode';
export const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{6}$/;

/** Client `js-cookie` options aligned with `path=/; max-age=…; samesite=lax`. */
export const CLIENT_PERSIST_COOKIE_OPTIONS = {
  path: '/',
  expires: COOKIE_MAX_AGE / (60 * 60 * 24),
  sameSite: 'lax' as const,
};

export const DEFAULT_USER_PRECISION = 2;

/** 全站列表分页默认每页条数（首页与翻页一致） */
export const DEFAULT_PAGE_SIZE = 20;

/** mining 等 Orval 接口 pageSize 为 string 时使用 */
export const DEFAULT_PAGE_SIZE_STRING = String(DEFAULT_PAGE_SIZE);

/** Plato STORY 交易入口（`VITE_PLATO_TRADE_URL`） */
export const PLATO_TRADE_URL =
  import.meta.env.VITE_PLATO_TRADE_URL?.trim() || 'https://app.plato.xyz/';
