/** 读取 API 雪花 ID（string 原样 trim；number 转为十进制字符串）。 */
export function readSnowflakeId(
  value: string | number | undefined | null,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed.length === 0 || trimmed === 'null' || trimmed === 'undefined') {
      return undefined;
    }

    return trimmed;
  }

  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined;
  }

  return String(value);
}

export function encodeSnowflakePathSegment(
  value: string | number | undefined | null,
): string {
  const idText = readSnowflakeId(value);
  if (!idText) {
    throw new Error('短剧 ID 无效或已丢失精度，请刷新列表后重试');
  }

  return encodeURIComponent(idText);
}

export function toDramaIdBigInt(
  dramaId: string | number | undefined | null,
): bigint {
  const idText = readSnowflakeId(dramaId);
  if (!idText) {
    throw new Error('短剧 ID 无效或已丢失精度，请刷新列表后重试');
  }

  return BigInt(idText);
}
