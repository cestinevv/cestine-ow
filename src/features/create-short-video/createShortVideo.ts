import type { PublishShortVideoRequest } from '@/api/__generated__/story/model/publishShortVideoRequest';

export const SHORT_VIDEO_MAX_SIZE_GB = 2;
export const SHORT_VIDEO_MAX_SIZE_BYTES = SHORT_VIDEO_MAX_SIZE_GB * 1000 ** 3;
export const SHORT_VIDEO_MAX_SIZE_LABEL = `${SHORT_VIDEO_MAX_SIZE_GB}GB`;
export const SHORT_VIDEO_COVER_MAX_SIZE_MIB = 5;
export const SHORT_VIDEO_COVER_MAX_SIZE_BYTES =
  SHORT_VIDEO_COVER_MAX_SIZE_MIB * 1024 ** 2;
export const SHORT_VIDEO_COVER_MAX_SIZE_LABEL = `${SHORT_VIDEO_COVER_MAX_SIZE_MIB}MB`;
export const SHORT_VIDEO_TITLE_MAX_LENGTH = 30;
export const SHORT_VIDEO_DESCRIPTION_MAX_LENGTH = 1000;

export type ShortVideoUploadValidationError = 'invalid-type' | 'too-large';
export type ShortVideoUploadStatus =
  | 'idle'
  | 'uploading'
  | 'success'
  | 'failed';

const VIDEO_FILE_EXTENSION_PATTERN =
  /\.(mp4|flv|wmv|asf|mkv|avi|rm|rmvb|mpg|mpeg|mov|webm)$/i;
const COVER_FILE_EXTENSION_PATTERN = /\.(jpe?g|png)$/i;

export function isAcceptedShortVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) {
    return true;
  }

  return VIDEO_FILE_EXTENSION_PATTERN.test(file.name);
}

export function isAcceptedShortVideoCoverFile(file: File): boolean {
  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    return true;
  }

  return COVER_FILE_EXTENSION_PATTERN.test(file.name);
}

export function getShortVideoUploadValidationError(
  file: File,
): ShortVideoUploadValidationError | undefined {
  if (!isAcceptedShortVideoFile(file)) {
    return 'invalid-type';
  }

  if (file.size > SHORT_VIDEO_MAX_SIZE_BYTES) {
    return 'too-large';
  }

  return undefined;
}

export function getShortVideoCoverValidationError(
  file: File,
): ShortVideoUploadValidationError | undefined {
  if (!isAcceptedShortVideoCoverFile(file)) {
    return 'invalid-type';
  }

  if (file.size > SHORT_VIDEO_COVER_MAX_SIZE_BYTES) {
    return 'too-large';
  }

  return undefined;
}

export function buildCreateShortVideoDraftKey(userId: string): string {
  return `create-short-video-draft:${userId}`;
}

export type ShortVideoDraft = {
  uploadSessionId?: number;
  videoObjectKey?: string;
  coverObjectKey?: string;
  title: string;
  description: string;
  fileName?: string;
  fileSizeBytes?: number;
  durationSec?: number;
  width?: number;
  height?: number;
  hasManualCover?: boolean;
};

export function hasShortVideoDraftContent(
  draft: ShortVideoDraft | null,
): boolean {
  if (!draft) {
    return false;
  }

  return Boolean(
    draft.videoObjectKey ||
      draft.coverObjectKey ||
      draft.title.trim() ||
      draft.description.trim(),
  );
}

export function parseShortVideoDraft(
  raw: string | null,
): ShortVideoDraft | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as ShortVideoDraft;

    return {
      uploadSessionId: value.uploadSessionId,
      videoObjectKey: value.videoObjectKey,
      coverObjectKey: value.coverObjectKey,
      title: value.title ?? '',
      description: value.description ?? '',
      fileName: value.fileName,
      fileSizeBytes: value.fileSizeBytes,
      durationSec: value.durationSec,
      width: value.width,
      height: value.height,
      hasManualCover: Boolean(value.hasManualCover),
    };
  } catch {
    return null;
  }
}

/**
 * 顶部视频区与封面区必须使用独立地址：更换封面不得回写到视频缩略图。
 * 草稿回显没有本地 blob 时，分别回退到各自的公开 URL。
 */
export function pickShortVideoMediaDisplayUrls({
  videoPreviewUrl,
  coverPreviewUrl,
  videoPublicUrl,
  coverPublicUrl,
}: {
  videoPreviewUrl?: string;
  coverPreviewUrl?: string;
  videoPublicUrl?: string;
  coverPublicUrl?: string;
}): {
  videoDisplayUrl?: string;
  coverDisplayUrl?: string;
} {
  return {
    videoDisplayUrl:
      videoPreviewUrl?.trim() || videoPublicUrl?.trim() || undefined,
    coverDisplayUrl:
      coverPreviewUrl?.trim() || coverPublicUrl?.trim() || undefined,
  };
}

export function trimShortVideoTitle(title: string): string {
  return title.trim().slice(0, SHORT_VIDEO_TITLE_MAX_LENGTH);
}

export function trimShortVideoDescription(description: string): string {
  return description.trim().slice(0, SHORT_VIDEO_DESCRIPTION_MAX_LENGTH);
}

export function canPublishShortVideo({
  title,
  description,
  uploadSessionId,
  videoObjectKey,
  coverObjectKey,
  durationSec,
  width,
  height,
  uploadStatus,
  isPublishing,
}: {
  title: string;
  description: string;
  uploadSessionId?: number;
  videoObjectKey?: string;
  coverObjectKey?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  uploadStatus: ShortVideoUploadStatus;
  isPublishing: boolean;
}): boolean {
  return Boolean(
    trimShortVideoTitle(title) &&
      trimShortVideoDescription(description) &&
      uploadSessionId &&
      videoObjectKey?.trim() &&
      coverObjectKey?.trim() &&
      durationSec &&
      durationSec > 0 &&
      width &&
      width > 0 &&
      height &&
      height > 0 &&
      uploadStatus === 'success' &&
      !isPublishing,
  );
}

export function buildPublishShortVideoRequest({
  title,
  description,
  uploadSessionId,
  videoObjectKey,
  coverObjectKey,
  durationSec,
  width,
  height,
}: {
  title: string;
  description: string;
  uploadSessionId: number;
  videoObjectKey: string;
  coverObjectKey: string;
  durationSec: number;
  width: number;
  height: number;
}): PublishShortVideoRequest {
  return {
    uploadSessionId,
    videoObjectKey,
    coverObjectKey,
    title: trimShortVideoTitle(title),
    description: trimShortVideoDescription(description),
    durationSec: Math.max(1, Math.round(durationSec)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function formatShortVideoDuration(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) {
    return '00:00';
  }

  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;

  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
