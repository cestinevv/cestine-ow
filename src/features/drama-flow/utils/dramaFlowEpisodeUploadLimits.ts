/** 剧集单文件体积上限（GB，按系统显示的十进制口径） */
export const EPISODE_VIDEO_MAX_SIZE_GB = 2;

/** 剧集单文件体积上限（字节） */
export const MAX_EPISODE_VIDEO_BYTES = EPISODE_VIDEO_MAX_SIZE_GB * 1000 ** 3;

/** 供 UI / toast 展示的体积上限文案 */
export const EPISODE_VIDEO_MAX_SIZE_LABEL = `${EPISODE_VIDEO_MAX_SIZE_GB}GB`;

/** 剧集视频文件名（含扩展名）最大字符数 */
export const MAX_EPISODE_VIDEO_FILE_NAME_LENGTH = 200;

/** 单部短剧可上传的剧集视频总数上限 */
export const MAX_EPISODE_VIDEO_COUNT = 100;

const ONE_GB = 1000 ** 3;
const ONE_MB = 1000 ** 2;

/** 供 UI / toast 展示：>=1GB 用 GB，否则用 MB */
export function formatEpisodeVideoMaxSizeLabel(
  bytes = MAX_EPISODE_VIDEO_BYTES,
): string {
  if (bytes === MAX_EPISODE_VIDEO_BYTES) {
    return EPISODE_VIDEO_MAX_SIZE_LABEL;
  }

  if (bytes >= ONE_GB) {
    return `${bytes / ONE_GB}GB`;
  }

  const mb = bytes / ONE_MB;

  return Number.isInteger(mb) ? `${mb}MB` : `${Math.round(mb)}MB`;
}

/** 是否存在超限文件（严格大于上限） */
export function hasOversizedEpisodeVideo(files: readonly File[]): boolean {
  return files.some((file) => file.size > MAX_EPISODE_VIDEO_BYTES);
}

/** 是否存在文件名过长的视频（严格大于字符上限） */
export function hasOverlongEpisodeVideoFileName(
  files: readonly File[],
): boolean {
  return files.some(
    (file) => file.name.length > MAX_EPISODE_VIDEO_FILE_NAME_LENGTH,
  );
}

/** 现有剧集数加上本次新增是否会超过总数上限（严格大于上限） */
export function wouldExceedEpisodeVideoCount(
  currentEpisodeCount: number,
  incomingFileCount: number,
): boolean {
  return currentEpisodeCount + incomingFileCount > MAX_EPISODE_VIDEO_COUNT;
}
