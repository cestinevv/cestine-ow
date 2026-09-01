import Decimal from 'decimal.js';
import { DEFAULT_USER_PRECISION } from '@/constants';

export function toDecimalPlaces(
  value: Decimal.Value,
  precision: number = DEFAULT_USER_PRECISION,
  roundingMode: Decimal.Rounding = Decimal.ROUND_DOWN,
) {
  try {
    const num = new Decimal(value).toFixed(precision, roundingMode);
    return num;
  } catch {
    return String(value || '-');
  }
}

export function toAmountString(
  value: Decimal.Value | undefined = '',
  precision: number = DEFAULT_USER_PRECISION,
  roundingMode: Decimal.Rounding = Decimal.ROUND_DOWN,
): string {
  try {
    return new Decimal(value)
      .toSignificantDigits(precision, roundingMode)
      .toFixed();
  } catch {
    return String(value || '-');
  }
}

export function toAmountFloor(
  value: string | number | undefined,
  precision: number = DEFAULT_USER_PRECISION,
): string {
  return toAmountString(value, precision, Decimal.ROUND_DOWN);
}

export function toAmountCeil(
  value: string | number | undefined,
  precision: number = DEFAULT_USER_PRECISION,
) {
  return toAmountString(value, precision, Decimal.ROUND_UP);
}

export function isEmptyAmount(
  value: Decimal.Value,
  precision: number = DEFAULT_USER_PRECISION,
): boolean {
  const _value = new Decimal(value).mul(Decimal.pow(10, precision)).trunc();
  return _value.isZero();
}

export function toSimpleAmount(
  value: string | number | Decimal,
  precision: number = DEFAULT_USER_PRECISION,
) {
  return toAmountString(
    toDecimalPlaces(value, precision),
    DEFAULT_USER_PRECISION,
  );
}
