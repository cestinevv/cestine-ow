/** 将接口可能返回的 number / string 解析为非负数，无效或 <0 时返回 undefined。 */
export function parseNonNegativeNumber(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(num) || num < 0) {
    return undefined;
  }

  return num;
}

/** 将接口可能返回的 number / string 解析为正数，无效或 ≤0 时返回 undefined。 */
export function parsePositiveNumber(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(num) || num <= 0) {
    return undefined;
  }

  return num;
}
