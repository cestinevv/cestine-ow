import Decimal from 'decimal.js';

import { isNumber } from 'lodash-es';
import { isEmptyAmount, toDecimalPlaces } from './formatCurrencyAmount';
import {
  abs,
  div,
  isEqualTo,
  isGreaterThan,
  isNegative,
  isNumeric,
  isPositive,
  isZero,
} from './mathUtil';

function isFormatNumberEmpty(value: Decimal.Value): boolean {
  return value == null || value === '';
}

/**
 * Formats all numbers with a dollar value
 * 123456.789 ===> 123,456.78
 * @param value
 * @param precision
 * @param tiny
 * @returns
 */
export const formatNumber = (
  value: Decimal.Value = '',
  precision = 2,
  isRound = false,
) => {
  if (isFormatNumberEmpty(value)) {
    return '-';
  }
  if (isEqualTo(value, '0')) {
    return '0';
  }
  try {
    const _precision = isNumber(precision) ? precision : Number(precision);
    const _value = toDecimalPlaces(
      value,
      _precision,
      isRound ? Decimal.ROUND_HALF_EVEN : Decimal.ROUND_DOWN,
    );
    let n = String(_value);
    const p = n.indexOf('.');
    // Remove trailing zeros after the decimal point
    if (p >= 0) {
      n = n.replace(/\.?0+$/, '');
    }
    // Check if the original value is smaller than the precision
    const originalValue = new Decimal(value);
    const threshold = new Decimal(1).dividedBy(new Decimal(10).pow(_precision));
    if (originalValue.lessThan(threshold)) {
      n = `<${threshold.toFixed(_precision)}`;
    }
    return n.replaceAll(/\d(?=(?:\d{3})+(?:\.|$))/g, (m, i) =>
      p < 0 || i < p ? `${m},` : m,
    );
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    return '-';
  }
};

export const formatNumberNegativeUsd = (
  value: Decimal.Value = '',
  precision = 2,
  isRound = false,
) => {
  if (isFormatNumberEmpty(value)) {
    return '-';
  }
  if (isEqualTo(value, '0')) {
    return '$0';
  }
  try {
    const _precision = isNumber(precision) ? precision : Number(precision);
    const _value = toDecimalPlaces(
      value,
      _precision,
      isRound ? Decimal.ROUND_HALF_EVEN : Decimal.ROUND_DOWN,
    );
    let n = String(_value);
    const p = n.indexOf('.');
    // Remove trailing zeros after the decimal point
    if (p >= 0) {
      n = n.replace(/\.?0+$/, '');
    }
    // Check if the original value is smaller than the precision
    // const originalValue = new Decimal(value);
    // const threshold = new Decimal(1).dividedBy(new Decimal(10).pow(_precision));
    // if (originalValue.lessThan(threshold)) {
    // 	n = `<${threshold.toFixed(_precision)}`;
    // }
    const _result = n.replaceAll(/\d(?=(?:\d{3})+(?:\.|$))/g, (m, i) =>
      p < 0 || i < p ? `${m},` : m,
    );
    if (isNegative(_result)) {
      return `-$${abs(_result)}`;
    }
    if (isZero(_result)) {
      return '$0';
    }
    return `+$${_result}`;
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    return '-';
  }
};

export function toUsd(
  value: Decimal.Value,
  precision = 2,
  roundingMode: Decimal.Rounding = Decimal.ROUND_DOWN,
): string {
  try {
    const isZero = isEmptyAmount(value, precision);
    if (isZero) {
      return '$0';
    }
    const _value = new Decimal(value);
    const threshold = div(1, Decimal.pow(10, precision));

    if (_value.gte(0) && _value.lt(threshold)) {
      return `<$${threshold}`;
    }
    if (_value.gt(`-${threshold}`) && _value.lt(0)) {
      return `<-$${threshold}`;
    }
    return isPositive(_value)
      ? `$${toDecimalPlacesNumber(
          _value.toFixed(precision, roundingMode),
          precision,
        )}`
      : `-$${toDecimalPlacesNumber(
          _value.abs().toFixed(precision, roundingMode),
          precision,
        )}`;
  } catch {
    return String(value || '-');
  }
}

const toDecimalPlacesNumber = (
  value: Decimal.Value = '',
  precision = 2,
  isRound = false,
) => {
  if (isFormatNumberEmpty(value)) {
    return '-';
  }
  if (isEqualTo(value, '0')) {
    return precision > 0 ? new Decimal(0).toFixed(precision) : '0';
  }
  try {
    // 创建 Decimal 实例
    const decimalValue = new Decimal(value);

    // 使用指定的精度进行四舍五入
    const roundedValue = decimalValue.toDecimalPlaces(
      precision,
      isRound ? Decimal.ROUND_HALF_EVEN : Decimal.ROUND_DOWN,
    );

    // 转换为字符串并获取整数部分
    const integerPart = roundedValue.floor().toString();

    // 获取小数部分
    const decimalPart = roundedValue.modulo(1).toFixed(precision).slice(2); // 去掉 '0.'

    // 使用正则表达式添加千分位分隔符
    const formattedIntegerPart = integerPart.replaceAll(
      /\B(?=(\d{3})+(?!\d))/g,
      ',',
    );

    // 返回格式化后的结果
    return decimalPart
      ? `${formattedIntegerPart}.${decimalPart}`
      : formattedIntegerPart;
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    return '-';
  }
};

export function amountFormatter(value: string | number, precision = 4): string {
  let str = '';
  try {
    const amount = new Decimal(value);
    if (amount.isZero()) {
      return '0';
    }

    if (isGreaterThan(0.1, value)) {
      return formatNumber(value, precision);
    }

    const si = [
      { value: 1, symbol: '' },
      { value: 1e3, symbol: 'K' },
      { value: 1e6, symbol: 'M' },
      { value: 1e9, symbol: 'B' },
      { value: 1e12, symbol: 'T' },
      { value: 1e15, symbol: 'P' },
      { value: 1e18, symbol: 'E' },
      { value: 1e21, symbol: 'Z' }, // 泽
      { value: 1e24, symbol: 'Y' }, // 尧
      { value: 1e27, symbol: 'R' }, // 朗
      { value: 1e30, symbol: 'Q' }, // 昆
      { value: 1e33, symbol: 'I' }, // 依
      { value: 1e36, symbol: 'S' }, // 斯
      { value: 1e39, symbol: 'N' }, // 纳
      { value: 1e42, symbol: 'D' }, // 迪
      { value: 1e45, symbol: 'U' }, // 尤
      { value: 1e48, symbol: 'V' }, // 威
    ];
    let i: number;
    for (i = si.length - 1; i > 0; i--) {
      if (amount.gte(si[i].value)) {
        break;
      }
    }
    return amount.div(si[i].value).toFixed(precision) + si[i].symbol;
  } catch {
    str = '-';
  }
  return str;
}

export function amountFormatterUsd(
  value: string | number,
  precision = 2,
): string {
  if (!isNumeric(value)) {
    return '-';
  }
  if (isZero(value)) {
    return '$0.00';
  }
  const _value = new Decimal(value);
  const threshold = div(1, Decimal.pow(10, precision));

  if (_value.gte(0) && _value.lt(threshold)) {
    return `<$${threshold}`;
  }
  if (_value.gt(`-${threshold}`) && _value.lt(0)) {
    return `<-$${threshold}`;
  }
  return `$${amountFormatter(value, precision)}`;
}
