import Decimal from 'decimal.js';
import { toDecimalPlaces, toSimpleAmount } from './formatCurrencyAmount';
import { isGreaterThan, isLessThan, isZero, multipliedBy } from './mathUtil';

export function toPercent(
  value: Decimal.Value,
  precision = 2,
  hundred = true,
): string {
  try {
    if (isZero(new Decimal(value))) {
      return '0.00%';
    }
    if (!hundred && new Decimal(value).lessThan(0.01)) {
      return '<0.01%';
    }
    if (hundred && new Decimal(value).lessThan(0.0001)) {
      return '<0.01%';
    }
    return hundred
      ? `${new Decimal(value).mul(100).toFixed(precision)}%`
      : `${new Decimal(value).toFixed(precision)}%`;
  } catch {
    return '-';
  }
}

/**
 * 将数值转换为百分比字符串（向下截取，不四舍五入）
 * @param value - 要转换的数值
 * @param precision - 小数位数，默认为 2
 * @param hundred - 是否乘以 100，默认为 true
 * @returns 百分比字符串
 * @example
 * toPercentFloor(0.123456, 3) // "12.345%"
 * toPercentFloor(0.123456, 2) // "12.34%"
 * toPercentFloor(0.9859, 2) // "98.59%"
 */
export function toPercentFloor(
  value: Decimal.Value,
  precision = 2,
  hundred = true,
): string {
  try {
    if (isZero(new Decimal(value))) {
      return '0%';
    }

    const multiplier = hundred ? 100 : 1;
    const result = new Decimal(value).mul(multiplier);

    // 计算需要截取的位数
    const factor = new Decimal(10).pow(precision);
    const truncated = result.mul(factor).floor().div(factor);

    return `${truncated.toFixed(precision)}%`;
  } catch {
    return '-';
  }
}

export function toSimplePercent(
  value: string | number | Decimal,
  precision = 2,
  hundred = true,
): string {
  try {
    return hundred
      ? `${toSimpleAmount(multipliedBy(value, 100), precision)}%`
      : `${toSimpleAmount(value, precision)}%`;
  } catch {
    return '-';
  }
}

/**
 * 小于1% 展示 <1%
 * @param value
 * @param precision
 * @param hundred
 * @returns
 */
export function toSimplePercentWithLessThan(
  value: string | number | Decimal,
  precision = 2,
  hundred = true,
): string {
  try {
    const multiplier = hundred ? 100 : 1;
    const result = new Decimal(value).mul(multiplier);
    // if (isGreaterThan(result, 0) && isLessThan(result, 1)) {
    if (isLessThan(result, 1)) {
      return '<1%';
    }
    return hundred
      ? `${toSimpleAmount(multipliedBy(value, 100), precision)}%`
      : `${toSimpleAmount(value, precision)}%`;
  } catch {
    return '-';
  }
}

export function toFormattedPercent(
  value: string | number | Decimal,
  precision = 2,
): string {
  try {
    if (isZero(value)) {
      return '0.00%';
    }
    const _value = multipliedBy(value, 100);
    if (isGreaterThan(_value, 0) && isLessThan(_value, 0.01)) {
      return '<0.01%';
    }
    if (isGreaterThan(_value, -0.01) && isLessThan(_value, 0)) {
      return '-0.01%';
    }
    return `${toDecimalPlaces(_value, precision)}%`;
  } catch {
    return '-';
  }
}

export function toFormatStrPercent(
  value: string | number | Decimal,
  precision = 2,
): string {
  try {
    if (isZero(value)) {
      return '0.00%';
    }
    if (isGreaterThan(value, 0) && isLessThan(value, 0.01)) {
      return '<0.01%';
    }
    if (isGreaterThan(value, -0.01) && isLessThan(value, 0)) {
      return '-0.01%';
    }
    return `${toDecimalPlaces(value, precision)}%`;
  } catch {
    return '-';
  }
}
