import type { DramaFlowEpisode } from '@/features/drama-flow/types/dramaFlowDocument';
import { ensureFlowEpisodesForHydrate } from '@/features/drama-flow/types/dramaFlowDocument';
import {
  formatDurationFromSeconds,
  formatFileSizeMeta,
  formatFileSizeProgressUploaded,
} from '@/utils';

export function titleFromVideoFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim();

  return base || fileName;
}

export function sortEpisodesByFileName(
  episodes: DramaFlowEpisode[],
): DramaFlowEpisode[] {
  return [...episodes].sort((a, b) => {
    const nameA = (a.localFileName ?? a.title ?? '').trim();
    const nameB = (b.localFileName ?? b.title ?? '').trim();

    return nameA.localeCompare(nameB, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

/** 上传管道排队：重新上传优先，各档内按剧集文件名/标题排序 */
export function sortEpisodeClientIdsByUploadPriority(
  clientIds: string[],
  episodes: DramaFlowEpisode[],
  reuploadPriorityClientIds: ReadonlySet<string>,
): string[] {
  const episodeById = new Map(
    episodes.map((episode) => [episode.clientId, episode]),
  );

  const sortIdsByEpisodeName = (ids: string[]) =>
    sortEpisodesByFileName(
      ids
        .map((id) => episodeById.get(id))
        .filter((episode): episode is DramaFlowEpisode => Boolean(episode)),
    ).map((episode) => episode.clientId);

  const reuploadIds = clientIds.filter((id) =>
    reuploadPriorityClientIds.has(id),
  );
  const normalIds = clientIds.filter(
    (id) => !reuploadPriorityClientIds.has(id),
  );

  return [
    ...sortIdsByEpisodeName(reuploadIds),
    ...sortIdsByEpisodeName(normalIds),
  ];
}

function stripInvalidBlobPoster(episode: DramaFlowEpisode): DramaFlowEpisode {
  return {
    ...episode,
    localPosterObjectUrl: episode.localPosterObjectUrl?.startsWith('blob:')
      ? undefined
      : episode.localPosterObjectUrl,
  };
}

/** 只保留已上传完毕（有 videoObjectKey）的剧集 */
export function filterUploadedEpisodesOnly(
  episodes: DramaFlowEpisode[] | undefined,
): DramaFlowEpisode[] {
  const result: DramaFlowEpisode[] = [];

  for (const episode of episodes ?? []) {
    if (episode.videoObjectKey?.trim()) {
      result.push(stripInvalidBlobPoster(episode));
    }
  }

  return result;
}

/** persist 水合：剔除未完成上传行 + 失效 blob 封面；空列表时补空壳供步骤二初始态 */
export function sanitizeEpisodesForHydrate(
  episodes: DramaFlowEpisode[] | undefined,
): DramaFlowEpisode[] {
  for (const episode of episodes ?? []) {
    if (!episode.videoObjectKey?.trim()) {
      revokeEpisodePosterUrl(episode.localPosterObjectUrl);
    }
  }

  const uploadedOnly = filterUploadedEpisodesOnly(episodes);

  return ensureFlowEpisodesForHydrate(
    uploadedOnly.length > 0 ? uploadedOnly : undefined,
  );
}

/** persist 写入：只序列化已上传完毕的剧集 */
export function sanitizeEpisodesForPersist(
  episodes: DramaFlowEpisode[] | undefined,
): DramaFlowEpisode[] | undefined {
  const uploadedOnly = filterUploadedEpisodesOnly(episodes);

  return uploadedOnly.length > 0 ? uploadedOnly : undefined;
}

export function formatVideoDurationLabel(
  durationSeconds: number | undefined,
): string | undefined {
  return formatDurationFromSeconds(durationSeconds);
}

export function formatVideoFileSizeMbLabel(bytes: number | undefined): string {
  return formatFileSizeMeta(bytes);
}

/** Figma 872:170615 — 元信息仅「体积 · 时长」；扩展名落在标题行 */
export function formatEpisodeMetaLine(episode: DramaFlowEpisode): string {
  const sizePart = formatFileSizeMeta(episode.localFileSizeBytes);
  const durationPart = formatDurationFromSeconds(
    episode.localVideoDurationSeconds,
  );

  const parts = [sizePart, durationPart].filter(Boolean);

  return parts.join(' · ');
}

/** 从 object key / URL 路径末段解析视频扩展名（忽略 query/hash） */
function extensionFromVideoPath(value: string | undefined): string | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const pathOnly = raw.split(/[?#]/, 1)[0] ?? raw;
  const fileName = pathOnly.split('/').pop() ?? pathOnly;
  const lastDot = fileName.lastIndexOf('.');

  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return null;
  }

  const extension = fileName.slice(lastDot + 1);

  if (!/^[a-zA-Z0-9]+$/.test(extension)) {
    return null;
  }

  return extension.toLowerCase();
}

/** 剧集标题展示：文件名（粗体）+ 扩展名（常规小写），对齐稿面「星际迷航 . mp4」 */
export function splitEpisodeTitleParts(episode: DramaFlowEpisode): {
  baseName: string;
  extension: string | null;
} {
  const raw = episode.localFileName?.trim() || episode.title?.trim() || '';

  if (!raw) {
    return { baseName: '-', extension: null };
  }

  const lastDot = raw.lastIndexOf('.');

  if (lastDot > 0 && lastDot < raw.length - 1) {
    return {
      baseName: raw.slice(0, lastDot),
      extension: raw.slice(lastDot + 1).toLowerCase(),
    };
  }

  // 编辑态历史剧集：title 无后缀，从视频路径补扩展名
  const extension =
    extensionFromVideoPath(episode.videoObjectKey) ??
    extensionFromVideoPath(episode.originalVideoUrl);

  return { baseName: raw, extension };
}

/** Figma 4660:18761 — 上传进度行右侧「4MB / 10.4 MB」 */
export function formatUploadProgressSizeLine(
  uploadedBytes: number,
  totalBytes: number | undefined,
): string {
  if (
    totalBytes === undefined ||
    !Number.isFinite(totalBytes) ||
    totalBytes <= 0
  ) {
    return '';
  }

  const safeUploaded = Math.min(Math.max(0, uploadedBytes), totalBytes);
  const uploadedLabel = formatFileSizeProgressUploaded(safeUploaded);
  const totalLabel = formatFileSizeMeta(totalBytes);

  if (!uploadedLabel || !totalLabel) {
    return '';
  }

  return `${uploadedLabel} / ${totalLabel}`;
}

const VIDEO_POSTER_CAPTURE_TIMEOUT_MS = 12_000;

function cleanupVideoElement(
  video: HTMLVideoElement,
  objectUrlToRevoke?: string,
): void {
  video.removeAttribute('src');
  video.load();
  if (objectUrlToRevoke?.startsWith('blob:')) {
    URL.revokeObjectURL(objectUrlToRevoke);
  }
}

function captureVideoPosterFrame(
  video: HTMLVideoElement,
  objectUrlToRevoke?: string,
): Promise<string> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (posterObjectUrl: string) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      cleanupVideoElement(video, objectUrlToRevoke);
      resolve(posterObjectUrl);
    };

    const fail = () => {
      finish('');
    };

    const tryCapture = () => {
      if (settled) {
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) {
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        fail();
        return;
      }

      try {
        context.drawImage(video, 0, 0, width, height);
      } catch {
        fail();
        return;
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            fail();
            return;
          }
          finish(URL.createObjectURL(blob));
        },
        'image/jpeg',
        0.82,
      );
    };

    const timeoutId = window.setTimeout(() => {
      fail();
    }, VIDEO_POSTER_CAPTURE_TIMEOUT_MS);

    const attemptCapture = () => {
      tryCapture();
    };

    video.onseeked = attemptCapture;
    video.onloadeddata = attemptCapture;
    video.onerror = () => {
      fail();
    };
  });
}

/** 读取时长、分辨率，并将视频首帧导出为 JPEG blob URL（与第一步封面 `<img>` 回显一致） */
export function readVideoFileMetadata(file: File): Promise<{
  durationSeconds?: number;
  videoWidth?: number;
  videoHeight?: number;
  posterObjectUrl: string;
}> {
  return new Promise((resolve) => {
    const videoObjectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    let durationSeconds: number | undefined;
    let videoWidth: number | undefined;
    let videoHeight: number | undefined;

    video.onloadedmetadata = () => {
      durationSeconds =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : undefined;

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) {
        videoWidth = width;
        videoHeight = height;
      }

      video.currentTime = 0.001;
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoObjectUrl);
      resolve({
        durationSeconds,
        videoWidth,
        videoHeight,
        posterObjectUrl: '',
      });
    };

    void captureVideoPosterFrame(video, videoObjectUrl).then(
      (posterObjectUrl) => {
        resolve({
          durationSeconds,
          videoWidth,
          videoHeight,
          posterObjectUrl,
        });
      },
    );

    video.src = videoObjectUrl;
  });
}

export function resolveEpisodeVideoDimensions(
  episode: DramaFlowEpisode,
): { width: number; height: number } | null {
  const width = episode.localVideoWidth;
  const height = episode.localVideoHeight;

  if (
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return { width, height };
}

/** 已上传视频但尚未解析出有效宽高的剧集 */
export function hasEpisodesMissingVideoDimensions(
  episodes: DramaFlowEpisode[] | undefined,
): boolean {
  for (const episode of episodes ?? []) {
    if (!episode.videoObjectKey?.trim()) {
      continue;
    }

    if (!resolveEpisodeVideoDimensions(episode)) {
      return true;
    }
  }

  return false;
}

const REMOTE_VIDEO_METADATA_TIMEOUT_MS = 12_000;

/** 从远程视频 URL 读取时长（与本地 File 读取口径一致：仅 >0 秒有效）。 */
export function readRemoteVideoDurationSeconds(
  videoUrl: string,
): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let settled = false;

    const finish = (durationSeconds: number | undefined) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      video.removeAttribute('src');
      video.load();
      resolve(durationSeconds);
    };

    const timeoutId = window.setTimeout(() => {
      finish(undefined);
    }, REMOTE_VIDEO_METADATA_TIMEOUT_MS);

    video.onloadedmetadata = () => {
      const durationSeconds =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : undefined;
      finish(durationSeconds);
    };

    video.onerror = () => {
      finish(undefined);
    };

    video.src = videoUrl;
  });
}

/** 从远程视频 URL 读取分辨率（与本地 File 读取口径一致：宽高均 > 0）。 */
export function readRemoteVideoDimensions(
  videoUrl: string,
): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let settled = false;

    const finish = (
      dimensions: { width: number; height: number } | undefined,
    ) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      video.removeAttribute('src');
      video.load();
      resolve(dimensions);
    };

    const timeoutId = window.setTimeout(() => {
      finish(undefined);
    }, REMOTE_VIDEO_METADATA_TIMEOUT_MS);

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width > 0 && height > 0) {
        finish({ width, height });
        return;
      }

      finish(undefined);
    };

    video.onerror = () => {
      finish(undefined);
    };

    video.src = videoUrl;
  });
}

/** 通过 HEAD 请求尝试读取远程视频 Content-Length（字节）。 */
export async function fetchRemoteVideoSizeBytes(
  videoUrl: string,
): Promise<number | undefined> {
  try {
    const response = await fetch(videoUrl, { method: 'HEAD' });
    if (!response.ok) {
      return undefined;
    }

    const contentLength = response.headers.get('content-length');
    if (!contentLength) {
      return undefined;
    }

    const sizeBytes = Number(contentLength);

    return Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : undefined;
  } catch {
    return undefined;
  }
}

export function revokeEpisodePosterUrl(posterUrl: string | undefined): void {
  if (posterUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(posterUrl);
  }
}

export function revokeAllEpisodePosterUrls(
  episodes: DramaFlowEpisode[] | undefined,
): void {
  for (const episode of episodes ?? []) {
    revokeEpisodePosterUrl(episode.localPosterObjectUrl);
  }
}

export function createEpisodeDraftFromFile(
  file: File,
  posterObjectUrl: string,
  durationSeconds?: number,
  videoWidth?: number,
  videoHeight?: number,
): DramaFlowEpisode {
  return {
    clientId: crypto.randomUUID(),
    episodeNo: 1,
    title: titleFromVideoFileName(file.name),
    localFileName: file.name,
    localFileSizeBytes: file.size,
    localVideoDurationSeconds: durationSeconds,
    localVideoWidth: videoWidth,
    localVideoHeight: videoHeight,
    localPosterObjectUrl: posterObjectUrl || undefined,
  };
}
