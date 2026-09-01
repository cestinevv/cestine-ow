import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

import { toNumber } from 'lodash-es';

import i18n from '@/i18n';

import { abs, div, isLessThan, minus, multipliedBy } from './mathUtil';

dayjs.extend(relativeTime);
dayjs.extend(duration);

export function formatDate(
  value: string | number | dayjs.ConfigType,
  pattern = 'YYYY-MM-DD HH:mm:ss',
) {
  return dayjs(toNumber(value) * 1000).format(pattern);
}

export function formatDateFromMillisecond(
  value: string | number | dayjs.ConfigType,
  pattern = 'YYYY-MM-DD HH:mm:ss',
) {
  return dayjs(toNumber(value)).format(pattern);
}

export function formatDateFromDateLocale(
  value: string | number | dayjs.ConfigType,
  activeLocale: string | undefined,
) {
  if (!activeLocale) {
    return '';
  }
  let _targetPattern = 'YYYY-MM-DD';
  if (activeLocale === 'zh-CN') {
    _targetPattern = 'YYYY年M月D日';
  }
  return dayjs(toNumber(value)).locale(activeLocale).format(_targetPattern);
}

export function formatDateFromMillisecondLocale(
  value: string | number | dayjs.ConfigType,
  activeLocale: string | undefined,
) {
  if (!activeLocale) {
    return '';
  }
  let _targetPattern = 'HH:mm MMM D';
  if (activeLocale === 'zh-CN') {
    _targetPattern = 'M月D日 HH:mm';
  }
  return dayjs(toNumber(value)).locale(activeLocale).format(_targetPattern);
}

export function formatDateFromMillisecondLocaleSS(
  value: string | number | dayjs.ConfigType,
  activeLocale: string | undefined,
) {
  if (!activeLocale) {
    return '';
  }
  let _targetPattern = 'HH:mm:ss MMM D';
  if (activeLocale === 'zh-CN') {
    _targetPattern = 'MM-DD HH:mm:ss';
  }
  return dayjs(toNumber(value)).locale(activeLocale).format(_targetPattern);
}

/**
 * Format Unix timestamp
 * @param value
 * @param pattern
 * @returns
 */
export function formatUnixDate(
  value: string | number | dayjs.ConfigType | undefined,
  pattern = 'MMM D, HH:mm:ss',
) {
  return dayjs(Number(value) * 1000).format(pattern);
}

function checkDateLessThan1m(
  value: string | number | dayjs.ConfigType | undefined,
) {
  const nowUnix = dayjs().unix();
  const valueUnix = Number.isNaN(Number(value))
    ? dayjs(value).unix()
    : dayjs(Number(value) * 1000).unix();
  if (isLessThan(abs(minus(valueUnix, nowUnix)), 60)) {
    return true;
  }
  return false;
}

function resolveTimestampMs(
  value: string | number | dayjs.ConfigType | undefined,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Number.isNaN(Number(value))) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.valueOf() : undefined;
  }

  return Number(value);
}

/** i18next 复数 key（如 `{{count}}天前_other`）显式解析，避免 value 配置错误时露出 `_other` 后缀。 */
function tRelativeTimeWithCount(baseKey: string, count: number): string {
  const pluralRule = new Intl.PluralRules(i18n.language).select(count);
  const suffix = pluralRule === 'one' ? '_one' : '_other';
  const pluralKey = `${baseKey}${suffix}`;

  return i18n.t(pluralKey, { count });
}

/** 毫秒时间戳 → i18n 相对时间（与评论列表等 UI 一致，不依赖 dayjs locale 包）。 */
function formatRelativeTimeFromTimestampMs(
  timestampMs: number,
  withoutSuffix: boolean,
): string {
  const target = dayjs(timestampMs);
  const seconds = Math.abs(dayjs().diff(target, 'second'));
  if (seconds < 60) {
    return i18n.t('刚刚');
  }

  const minutes = Math.abs(dayjs().diff(target, 'minute'));
  if (minutes < 60) {
    return tRelativeTimeWithCount(
      withoutSuffix ? '{{count}}分钟' : '{{count}}分钟前',
      minutes,
    );
  }

  const hours = Math.abs(dayjs().diff(target, 'hour'));
  if (hours < 24) {
    return tRelativeTimeWithCount(
      withoutSuffix ? '{{count}}小时' : '{{count}}小时前',
      hours,
    );
  }

  // 1–7 天：一天前 … 七天前；超过 7 天：本地发布时间
  const days = Math.max(Math.abs(dayjs().diff(target, 'day')), 1);
  if (days <= 7) {
    return tRelativeTimeWithCount(
      withoutSuffix ? '{{count}}天' : '{{count}}天前',
      days,
    );
  }

  const isZhCn = i18n.language === 'zh-CN';
  return target.format(isZhCn ? 'YYYY年M月D日 HH:mm' : 'YYYY-MM-DD HH:mm');
}

export function isTimestampExpired(timestamp: string | number | undefined) {
  const currentTimestamp = Date.now(); // 获取当前时间戳
  return currentTimestamp > Number(timestamp); // 如果当前时间戳大于给定时间戳，则表示时间戳已过期
}

export function formatDateFromNowMillisecond(
  value: string | number | dayjs.ConfigType | undefined,
  _activeLocale?: string | undefined,
  withoutSuffix = false,
) {
  const timestampMs = resolveTimestampMs(value);
  if (timestampMs === undefined) {
    return '';
  }

  return formatRelativeTimeFromTimestampMs(timestampMs, withoutSuffix);
}

export function formatDateFromNow(
  value: string | number | dayjs.ConfigType | undefined,
  activeLocale: string | undefined,
  withoutSuffix = false,
) {
  if (!activeLocale) {
    return '';
  }
  if (checkDateLessThan1m(value)) {
    return i18n.t('刚刚');
  }

  if (Number.isNaN(Number(value))) {
    return dayjs(value).locale(activeLocale).fromNow();
  }
  return dayjs(Number(value) * 1000)
    .locale(activeLocale)
    .fromNow(withoutSuffix);
}

export function formatDuration(value: number | string, activeLocale: string) {
  if (Number.isNaN(Number(value))) {
    return dayjs(value).locale(activeLocale).fromNow();
  }
  const _value = toNumber(value) * 1000;
  return dayjs(_value).locale(activeLocale).fromNow();
}

export function calculateRemainingDays(milliseconds: string | undefined) {
  if (!milliseconds) {
    return 0;
  }
  const remainingDays = dayjs
    .duration(Number.parseFloat(multipliedBy(milliseconds, 1000)))
    .asDays();
  return Math.ceil(remainingDays);
}

export function formatDateFromXAgo(
  value: string | number | dayjs.ConfigType | undefined,
) {
  const timestampMs = resolveTimestampMs(value);
  if (timestampMs === undefined) {
    return '';
  }

  return formatRelativeTimeFromTimestampMs(timestampMs, false);
}

export function formatDateFromDetailXAgo(
  value: string | number | undefined,
  activeLocale: string | undefined,
) {
  if (!activeLocale || !value) {
    return '';
  }

  if (checkDateLessThan1m(div(value, 1000))) {
    return i18n.t('刚刚');
  }

  if (Number.isNaN(Number(value))) {
    return dayjs(value).locale(activeLocale).fromNow();
  }

  const _value = Number(value);

  return `${dayjs(_value).locale(activeLocale).fromNow(false)}`;
}

export function formatDateFromX(
  fromVal: string | number | dayjs.ConfigType | undefined,
  toVal: string | number | dayjs.ConfigType | undefined,
) {
  const toTime = dayjs(Number(toVal));
  // h d m
  const month = toTime.diff(dayjs(Number(fromVal)), 'month');
  const day = toTime.diff(dayjs(Number(fromVal)), 'day');
  const hour = toTime.diff(dayjs(Number(fromVal)), 'hour');
  const minute = toTime.diff(dayjs(Number(fromVal)), 'minute');

  if (month >= 1) {
    return `${month} months`;
  }
  if (month < 1 && day >= 1) {
    if (day > 1) {
      return `${day} days`;
    }
    return `${day} day`;
  }
  if (month < 1 && day < 1) {
    if (hour === 1) {
      return `${hour} hour`;
    }
    if (hour < 1 && minute === 1) {
      return `${minute} minute`;
    }

    if (hour > 1) {
      return `${hour} hours`;
    }
    return `${minute} minutes`;
  }
  return '';
}
