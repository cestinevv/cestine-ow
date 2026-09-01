function isValidBytes(bytes: number | undefined): bytes is number {
  return bytes !== undefined && Number.isFinite(bytes) && bytes > 0;
}

function roundSizeValue(value: number): number {
  return Math.abs(value - Math.round(value)) < 0.05
    ? Math.round(value)
    : Math.round(value * 10) / 10;
}

const BYTES_IN_KB = 1024;
const BYTES_IN_MB = BYTES_IN_KB * 1024;
const BYTES_IN_GB = BYTES_IN_MB * 1024;

/** meta 行、上传进度总量：`10 MB`、`1.2 GB`；小于 1MB 时走 compact K 格式。 */
export function formatFileSizeMeta(bytes: number | undefined): string {
  if (!isValidBytes(bytes)) {
    return '';
  }

  const gb = bytes / BYTES_IN_GB;
  if (gb >= 1) {
    return `${roundSizeValue(gb)} GB`;
  }

  const mb = bytes / BYTES_IN_MB;
  if (mb >= 1) {
    return `${roundSizeValue(mb)} MB`;
  }

  return formatFileSizeCompact(bytes);
}

/** 稿面短标签：`23M`、`500K`。 */
export function formatFileSizeCompact(bytes: number | undefined): string {
  if (!isValidBytes(bytes)) {
    return '';
  }

  const gb = bytes / BYTES_IN_GB;
  if (gb >= 1) {
    return `${roundSizeValue(gb)}G`;
  }

  const mb = bytes / BYTES_IN_MB;
  if (mb >= 1) {
    return `${roundSizeValue(mb)}M`;
  }

  const kb = bytes / BYTES_IN_KB;

  return kb < 10 ? `${Math.round(kb * 10) / 10}K` : `${Math.round(kb)}K`;
}

/** 上传进度已传部分：`4MB`、`500KB`、`10B`。 */
export function formatFileSizeProgressUploaded(
  bytes: number | undefined,
): string {
  if (!isValidBytes(bytes)) {
    return '';
  }

  const gb = bytes / BYTES_IN_GB;
  if (gb >= 1) {
    return `${roundSizeValue(gb)}GB`;
  }

  const mb = bytes / BYTES_IN_MB;
  if (mb >= 1) {
    return `${roundSizeValue(mb)}MB`;
  }

  const kb = bytes / BYTES_IN_KB;
  if (kb >= 1) {
    const rounded = kb < 10 ? Math.round(kb * 10) / 10 : Math.round(kb);

    return `${rounded}KB`;
  }

  return `${Math.round(bytes)}B`;
}
