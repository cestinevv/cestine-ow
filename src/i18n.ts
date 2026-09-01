import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import {
  CLIENT_PERSIST_COOKIE_OPTIONS,
  COOKIE_MAX_AGE,
  LOCALE_COOKIE_KEY,
} from '@/constants';
import { I18N_LOCALE_KEYS, normalizeLocale } from '@/utils/locale';
import enTranslation from './locales/en.json';
import esTranslation from './locales/es.json';
import jaTranslation from './locales/ja.json';
import koTranslation from './locales/ko.json';
import trTranslation from './locales/tr.json';
import viTranslation from './locales/vi.json';
import zhCNTranslation from './locales/zh-CN.json';

const supportedLngs = [...I18N_LOCALE_KEYS];

const isBrowser = typeof document !== 'undefined';

if (!i18n.isInitialized) {
  if (isBrowser) {
    i18n.use(LanguageDetector);
  }

  i18n.use(initReactI18next).init({
    // 浏览器端交给 LanguageDetector（cookie → navigator → htmlTag）；无 cookie 时用系统语言。
    // 服务端无 navigator，先用 `zh-CN` 占位，由根路由 `beforeLoad` 按请求 cookie 覆盖。
    lng: isBrowser ? undefined : 'zh-CN',
    fallbackLng: 'zh-CN',
    supportedLngs,
    keySeparator: false,
    nsSeparator: false,
    debug: false,
    initImmediate: false,
    react: {
      useSuspense: false,
    },

    ...(isBrowser
      ? {
          detection: {
            order: ['cookie', 'navigator', 'htmlTag'] as const,
            lookupCookie: LOCALE_COOKIE_KEY,
            caches: ['cookie'] as const,
            cookieMinutes: Math.floor(COOKIE_MAX_AGE / 60),
            cookieOptions: {
              path: CLIENT_PERSIST_COOKIE_OPTIONS.path,
              sameSite: CLIENT_PERSIST_COOKIE_OPTIONS.sameSite,
            },
            convertDetectedLanguage: (lng: string) => normalizeLocale(lng),
          },
        }
      : {}),

    resources: {
      en: { translation: enTranslation },
      'zh-CN': { translation: zhCNTranslation },
      ja: { translation: jaTranslation },
      tr: { translation: trTranslation },
      es: { translation: esTranslation },
      ko: { translation: koTranslation },
      vi: { translation: viTranslation },
    },

    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
