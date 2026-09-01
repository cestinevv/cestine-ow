import { Decimal } from 'decimal.js';

export function isNumeric(value: Decimal.Value) {
  return !Number.isNaN(Number.parseFloat(String(value)));
}

export function plus(value1: Decimal.Value, value2: Decimal.Value) {
  if (!isNumeric(value1) || !isNumeric(value2)) return '0';
  return new Decimal(value1).plus(value2).toFixed();
}

export function minus(value1: Decimal.Value, value2: Decimal.Value) {
  if (!isNumeric(value1) || !isNumeric(value2)) return '0';
  return new Decimal(value1).minus(value2).toFixed();
}

export function multipliedBy(value1: Decimal.Value, value2: Decimal.Value) {
  if (!isNumeric(value1) || !isNumeric(value2)) return '0';
  return new Decimal(value1).mul(value2).toFixed();
}

export function div(value1: Decimal.Value, value2: Decimal.Value): string {
  if (!isNumeric(value1) || !isNumeric(value2)) return '0';
  return new Decimal(value1).div(value2).toFixed();
}

export function abs(value: Decimal.Value): string {
  if (!isNumeric(value)) return '0';
  return new Decimal(value).abs().toString();
}

export function neg(value: Decimal.Value): string {
  if (!isNumeric(value)) return '0';
  return new Decimal(value).neg().toString();
}

export function trunc(value: Decimal.Value): string {
  if (!isNumeric(value)) return '0';
  return new Decimal(value).trunc().toString();
}

export function mod(value1: Decimal.Value, value2: Decimal.Value): string {
  if (!isNumeric(value1) || !isNumeric(value2)) return '0';
  return new Decimal(value1).mod(value2).toString();
}

export function toNumber(value: Decimal.Value): number {
  return new Decimal(value).toNumber();
}

export function isGreaterThan(value1: Decimal.Value, value2: Decimal.Value) {
  if (!isNumeric(value1) || !isNumeric(value2)) return false;
  return new Decimal(value1).greaterThan(value2);
}

export function isGreaterThanOrEqual(
  value1: Decimal.Value,
  value2: Decimal.Value,
) {
  if (!isNumeric(value1) || !isNumeric(value2)) return false;
  return new Decimal(value1).greaterThanOrEqualTo(value2);
}

export function isLessThan(value1: Decimal.Value, value2: Decimal.Value) {
  if (!isNumeric(value1) || !isNumeric(value2)) return false;
  return new Decimal(value1).lessThan(value2);
}

export function isLessThanOrEqualTo(
  value1: Decimal.Value,
  value2: Decimal.Value,
) {
  if (!isNumeric(value1) || !isNumeric(value2)) return false;
  return new Decimal(value1).lessThanOrEqualTo(value2);
}

export function isEqualTo(value1: Decimal.Value, value2: Decimal.Value) {
  if (!isNumeric(value1) || !isNumeric(value2)) return false;
  return new Decimal(value1).equals(value2);
}

export function isZero(value: Decimal.Value | undefined) {
  if (value === undefined) {
    return false;
  }
  try {
    return new Decimal(value).isZero();
  } catch {
    return false;
  }
}

export function isPositive(value: Decimal.Value | undefined) {
  if (value === undefined) {
    return false;
  }
  if (!isNumeric(value)) {
    return false;
  }
  try {
    return new Decimal(value).greaterThan(0);
  } catch {
    return false;
  }
}

export function isNegative(value: Decimal.Value | undefined) {
  if (value === undefined) {
    return false;
  }
  try {
    return new Decimal(value).isNegative();
  } catch {
    return false;
  }
}
