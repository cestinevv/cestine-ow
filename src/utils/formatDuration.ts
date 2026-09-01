/** 视频时长（秒）→ `m:ss`；无效输入返回 undefined，0 展示为 `0:00`。 */
export function formatDurationFromSeconds(
  durationSeconds: number | undefined,
): string | undefined {
  if (durationSeconds === undefined || !Number.isFinite(durationSeconds)) {
    return undefined;
  }

  const total = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
