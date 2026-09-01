import { isAxiosError } from 'axios';

import type {
  completeEpisodeResponse,
  completeResponse,
  myReviewResponse,
  playEpisodeResponse,
  playResponse,
  postReviewResponse,
  toggleFavoriteDramaResponse,
  toggleFavoriteEpisodeResponse,
  toggleFavoriteResponse,
  toggleLikeEpisodeResponse,
  toggleLikeResponse,
} from '@/api/__generated__/story/drama/drama';
import type { CommentResponse } from '@/api/__generated__/story/model/commentResponse';
import type { ListRootCommentsParams } from '@/api/__generated__/story/model/listRootCommentsParams';
import type { PageDtoDramaEpisodeListItemResponse } from '@/api/__generated__/story/model/pageDtoDramaEpisodeListItemResponse';
import type { PostCommentRequest } from '@/api/__generated__/story/model/postCommentRequest';
import type { PostReviewRequest } from '@/api/__generated__/story/model/postReviewRequest';
import type { listRootCommentsResponse as listCommentsResponse } from '@/api/__generated__/story/public-comment/public-comment';
import type {
  getDramaDetailResponse,
  getEpisodeDetailByEpisodeIdResponse,
  listDramaEpisodesResponse,
} from '@/api/__generated__/story/public-drama/public-drama';
import type { getShortVideoDetailResponse } from '@/api/__generated__/story/public-shortvideo/public-shortvideo';
import type {
  postCommentResponse,
  likeResponse as toggleLikeCommentResponse,
} from '@/api/__generated__/story/user-comment/user-comment';
import { AppBusinessError, appAxiosInstance } from '@/api/appRequest';
import { PLAY_SILENT_BUSINESS_CODES } from '@/features/play/playMediaErrorCodes';
import { PlayFeedContentType } from '@/features/play/types/playImmersive';
import { getDeviceId } from '@/utils/deviceId';
import {
  encodeSnowflakePathSegment,
  readSnowflakeId,
} from '@/utils/snowflakeId';

export const PLAY_COMMENT_NOT_FOUND_CODE = 125101;

export function isPlayCommentNotFoundError(error: unknown) {
  if (error instanceof AppBusinessError) {
    return error.code === PLAY_COMMENT_NOT_FOUND_CODE;
  }

  if (!isAxiosError<{ code?: unknown }>(error)) {
    return false;
  }

  return (
    error.response?.status === 404 ||
    Number(error.response?.data?.code) === PLAY_COMMENT_NOT_FOUND_CODE
  );
}

function playMetricsRequestHeaders(
  extra?: HeadersInit,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Device-ID': getDeviceId(),
  };

  if (!extra) {
    return headers;
  }

  if (extra instanceof Headers) {
    extra.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  if (Array.isArray(extra)) {
    for (const [key, value] of extra) {
      headers[key] = value;
    }
    return headers;
  }

  return { ...headers, ...extra };
}

function dramaPath(dramaId: string): string {
  return `/api/mini-drama/public/dramas/${encodeSnowflakePathSegment(dramaId)}`;
}

function userDramaPath(dramaId: string): string {
  return `/api/mini-drama/user/dramas/${encodeSnowflakePathSegment(dramaId)}`;
}

export function getPlayDramaDetailQueryKey(dramaId: string) {
  const idText = readSnowflakeId(dramaId);
  return [`/api/mini-drama/public/dramas/${idText}/detail`] as const;
}

export function getPlayEpisodeDetailByEpisodeIdQueryKey(episodeId: string) {
  const episodeText = readSnowflakeId(episodeId);
  return [
    `/api/mini-drama/public/dramas/episodes/${episodeText}/detail`,
  ] as const;
}

export function getPlayShortVideoDetailQueryKey(episodeId: string) {
  const episodeText = readSnowflakeId(episodeId);
  return [`/api/mini-drama/public/short-videos/${episodeText}`] as const;
}

/** 短剧走分集详情，短视频走短视频详情 */
export function getPlayMediaDetailQueryKey(
  episodeId: string,
  contentType?: string,
) {
  return contentType === PlayFeedContentType.ShortVideo
    ? getPlayShortVideoDetailQueryKey(episodeId)
    : getPlayEpisodeDetailByEpisodeIdQueryKey(episodeId);
}

/** 剧集分集列表（正序）；雪花 dramaId 保持字符串路径，避免 Orval number 丢精度 */
export function getPlayDramaEpisodesQueryKey(
  dramaId: string,
  params?: { pageSize?: number },
) {
  const idText = readSnowflakeId(dramaId);
  return [
    `/api/mini-drama/public/dramas/${idText}/episodes`,
    ...(params ? [params] : []),
  ] as const;
}

export function getPlayListCommentsQueryKey(
  _dramaId: string,
  workId: string,
  params?: ListRootCommentsParams,
) {
  const workText = readSnowflakeId(workId);
  return [
    `/api/mini-drama/public/works/${workText}/comments`,
    ...(params ? [params] : []),
  ] as const;
}

export function getPlayCommentQueryKey(commentId: string) {
  const idText = readSnowflakeId(commentId);
  return [`/api/mini-drama/public/comments/${idText}`] as const;
}

export function getPlayCommentRepliesQueryKey(rootCommentId: string) {
  const idText = readSnowflakeId(rootCommentId);
  return [`/api/mini-drama/public/comments/${idText}/replies`] as const;
}

export function getPlayMyReviewQueryKey(dramaId: string) {
  const idText = readSnowflakeId(dramaId);
  return [`/api/mini-drama/user/dramas/${idText}/my-review`] as const;
}

export async function getPlayDramaDetail(
  dramaId: string,
  options?: RequestInit,
): Promise<getDramaDetailResponse> {
  return appAxiosInstance<getDramaDetailResponse>(
    `${dramaPath(dramaId)}/detail`,
    {
      ...options,
      method: 'GET',
    },
  );
}

/** [无鉴权]剧集分集列表(按集数正序) — 业务侧雪花 string 封装 */
export async function listPlayDramaEpisodes(
  dramaId: string,
  params?: {
    mark?: string;
    pageSize?: number;
  },
  options?: RequestInit,
): Promise<listDramaEpisodesResponse> {
  const query = new URLSearchParams();

  if (params?.mark !== undefined) {
    query.append('mark', params.mark);
  }

  if (params?.pageSize !== undefined) {
    query.append('pageSize', String(params.pageSize));
  }

  const stringified = query.toString();
  const url =
    stringified.length > 0
      ? `${dramaPath(dramaId)}/episodes?${stringified}`
      : `${dramaPath(dramaId)}/episodes`;

  return appAxiosInstance<listDramaEpisodesResponse>(
    url,
    {
      ...options,
      method: 'GET',
    },
    { silentBusinessCodes: [...PLAY_SILENT_BUSINESS_CODES] },
  );
}

export type { PageDtoDramaEpisodeListItemResponse };

export async function getPlayEpisodeDetailByEpisodeId(
  episodeId: string,
  options?: RequestInit,
): Promise<getEpisodeDetailByEpisodeIdResponse> {
  const episodeSegment = encodeSnowflakePathSegment(episodeId);

  return appAxiosInstance<getEpisodeDetailByEpisodeIdResponse>(
    `/api/mini-drama/public/dramas/episodes/${episodeSegment}/detail`,
    {
      ...options,
      method: 'GET',
    },
    { silentBusinessCodes: [...PLAY_SILENT_BUSINESS_CODES] },
  );
}

/** [无鉴权]短视频详情 — 雪花 episodeId 保持字符串路径 */
export async function getPlayShortVideoDetail(
  episodeId: string,
  options?: RequestInit,
): Promise<getShortVideoDetailResponse> {
  const episodeSegment = encodeSnowflakePathSegment(episodeId);

  return appAxiosInstance<getShortVideoDetailResponse>(
    `/api/mini-drama/public/short-videos/${episodeSegment}`,
    {
      ...options,
      method: 'GET',
    },
    { silentBusinessCodes: [...PLAY_SILENT_BUSINESS_CODES] },
  );
}

export async function getPlayMediaDetail(
  episodeId: string,
  contentType: string | undefined,
  options?: RequestInit,
): Promise<getEpisodeDetailByEpisodeIdResponse | getShortVideoDetailResponse> {
  if (contentType === PlayFeedContentType.ShortVideo) {
    return getPlayShortVideoDetail(episodeId, options);
  }

  return getPlayEpisodeDetailByEpisodeId(episodeId, options);
}

export async function listPlayComments(
  _dramaId: string,
  workId: string,
  params?: ListRootCommentsParams,
  options?: RequestInit,
): Promise<listCommentsResponse> {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : value.toString());
    }
  });

  const workSegment = encodeSnowflakePathSegment(workId);
  const base = `/api/mini-drama/public/works/${workSegment}/comments`;
  const stringifiedParams = normalizedParams.toString();
  const url =
    stringifiedParams.length > 0 ? `${base}?${stringifiedParams}` : base;

  return appAxiosInstance<listCommentsResponse>(url, {
    ...options,
    method: 'GET',
  });
}

export async function getPlayComment(
  commentId: string,
  options?: RequestInit,
): Promise<{ data: CommentResponse; status: number; headers: Headers }> {
  const commentSegment = encodeSnowflakePathSegment(commentId);

  return appAxiosInstance(
    `/api/mini-drama/public/comments/${commentSegment}`,
    {
      ...options,
      method: 'GET',
    },
    { silentBusinessCodes: [PLAY_COMMENT_NOT_FOUND_CODE] },
  );
}

export async function togglePlayFavoriteDrama(
  dramaId: string,
  options?: RequestInit,
): Promise<toggleFavoriteDramaResponse> {
  return appAxiosInstance<toggleFavoriteDramaResponse>(
    `${userDramaPath(dramaId)}/favorite`,
    {
      ...options,
      method: 'POST',
    },
  );
}

/** 短剧单集收藏 / 取消收藏 */
export async function togglePlayFavoriteEpisode(
  episodeId: string,
  options?: RequestInit,
): Promise<toggleFavoriteEpisodeResponse> {
  const episodeSegment = encodeSnowflakePathSegment(episodeId);
  return appAxiosInstance<toggleFavoriteEpisodeResponse>(
    `/api/mini-drama/user/dramas/episodes/${episodeSegment}/favorite`,
    {
      ...options,
      method: 'POST',
    },
  );
}

export async function togglePlayLikeEpisode(
  dramaId: string,
  episodeId: string,
  options?: RequestInit,
): Promise<toggleLikeEpisodeResponse> {
  const episodeSegment = encodeSnowflakePathSegment(episodeId);
  return appAxiosInstance<toggleLikeEpisodeResponse>(
    `${userDramaPath(dramaId)}/episodes/${episodeSegment}/like`,
    {
      ...options,
      method: 'POST',
    },
  );
}

export async function togglePlayLikeShortVideo(
  episodeId: string,
  options?: RequestInit,
): Promise<toggleLikeResponse> {
  const episodeSegment = encodeSnowflakePathSegment(episodeId);
  return appAxiosInstance<toggleLikeResponse>(
    `/api/mini-drama/user/short-videos/${episodeSegment}/like`,
    {
      ...options,
      method: 'POST',
    },
  );
}

export async function togglePlayFavoriteShortVideo(
  episodeId: string,
  options?: RequestInit,
): Promise<toggleFavoriteResponse> {
  const episodeSegment = encodeSnowflakePathSegment(episodeId);
  return appAxiosInstance<toggleFavoriteResponse>(
    `/api/mini-drama/user/short-videos/${episodeSegment}/favorite`,
    {
      ...options,
      method: 'POST',
    },
  );
}

export async function postPlayReview(
  dramaId: string,
  body: PostReviewRequest,
  options?: RequestInit,
): Promise<postReviewResponse> {
  return appAxiosInstance<postReviewResponse>(
    `${userDramaPath(dramaId)}/reviews`,
    {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    },
  );
}

export async function getPlayMyReview(
  dramaId: string,
  options?: RequestInit,
): Promise<myReviewResponse> {
  return appAxiosInstance<myReviewResponse>(
    `${userDramaPath(dramaId)}/my-review`,
    {
      ...options,
      method: 'GET',
    },
  );
}

export async function postPlayComment(
  _dramaId: string,
  workId: string,
  body: PostCommentRequest,
  options?: RequestInit,
): Promise<postCommentResponse> {
  const workSegment = encodeSnowflakePathSegment(workId);
  return appAxiosInstance<postCommentResponse>(
    `/api/mini-drama/user/works/${workSegment}/comments`,
    {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    },
  );
}

export async function togglePlayLikeComment(
  _dramaId: string,
  commentId: string | number,
  liked: boolean,
  options?: RequestInit,
): Promise<toggleLikeCommentResponse> {
  const commentSegment = encodeSnowflakePathSegment(commentId);
  return appAxiosInstance<toggleLikeCommentResponse>(
    `/api/mini-drama/user/comments/${commentSegment}/like`,
    {
      ...options,
      method: liked ? 'DELETE' : 'POST',
    },
  );
}

export async function deletePlayComment(
  commentId: string | number,
  options?: RequestInit,
): Promise<{ data: unknown; status: number; headers: Headers }> {
  const commentSegment = encodeSnowflakePathSegment(commentId);
  return appAxiosInstance(`/api/mini-drama/user/comments/${commentSegment}`, {
    ...options,
    method: 'DELETE',
  });
}

export async function postPlayCommentReply(
  commentId: string | number,
  body: { content: string },
  options?: RequestInit,
): Promise<postCommentResponse> {
  const commentSegment = encodeSnowflakePathSegment(commentId);
  return appAxiosInstance<postCommentResponse>(
    `/api/mini-drama/user/comments/${commentSegment}/replies`,
    {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    },
  );
}

export async function listPlayCommentReplies(
  rootId: string | number,
  params?: { pageSize?: number; mark?: string },
  options?: RequestInit,
): Promise<listCommentsResponse> {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : value.toString());
    }
  });

  const rootSegment = encodeSnowflakePathSegment(rootId);
  const base = `/api/mini-drama/public/comments/${rootSegment}/replies`;
  const stringifiedParams = normalizedParams.toString();
  const url =
    stringifiedParams.length > 0 ? `${base}?${stringifiedParams}` : base;

  return appAxiosInstance<listCommentsResponse>(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * 单集有效播放上报（`episodeId` 为列表/详情返回的雪花实体 id）。
 * `watchMs` 可选：进入时可省略；切集/阈值阈值/完播阈值等传累计观看毫秒。
 */
export async function reportPlayEpisode(
  dramaId: string,
  episodeId: string,
  options?: RequestInit & { watchMs?: number },
): Promise<playEpisodeResponse> {
  const episodeIdText = readSnowflakeId(episodeId);
  if (episodeIdText === undefined) {
    throw new Error('reportPlayEpisode: invalid episodeId');
  }

  const params = new URLSearchParams({ episodeId: episodeIdText });
  const watchMs = options?.watchMs;

  if (watchMs !== undefined && Number.isFinite(watchMs) && watchMs >= 0) {
    params.set('watchMs', String(Math.round(watchMs)));
  }

  const { watchMs: _watchMs, ...requestInit } = options ?? {};

  return appAxiosInstance<playEpisodeResponse>(
    `${userDramaPath(dramaId)}/play-episode?${params.toString()}`,
    {
      ...requestInit,
      method: 'POST',
      headers: playMetricsRequestHeaders(requestInit.headers),
    },
  );
}

/**
 * 短视频有效播放上报（生成物 `play(episodeId, params?)` 的雪花 string-safe 封装）。
 * `watchMs` / `progress` 可选；当前 RW-0008 推荐/剧场主链路仍走 `reportPlayEpisode`，
 * 本函数供后续 SHORT_VIDEO 播放路径复用同一 tracker.getWatchMs()。
 */
export async function reportPlayShortVideo(
  episodeId: string,
  options?: RequestInit & { watchMs?: number; progress?: number },
): Promise<playResponse> {
  const episodeIdText = readSnowflakeId(episodeId);
  if (episodeIdText === undefined) {
    throw new Error('reportPlayShortVideo: invalid episodeId');
  }

  const params = new URLSearchParams();
  const watchMs = options?.watchMs;
  const progress = options?.progress;

  if (watchMs !== undefined && Number.isFinite(watchMs) && watchMs >= 0) {
    params.set('watchMs', String(Math.round(watchMs)));
  }

  if (progress !== undefined && Number.isFinite(progress)) {
    params.set('progress', String(progress));
  }

  const {
    watchMs: _watchMs,
    progress: _progress,
    ...requestInit
  } = options ?? {};
  const query = params.toString();
  const base = `/api/mini-drama/user/short-videos/${encodeSnowflakePathSegment(episodeId)}/play`;
  const url = query.length > 0 ? `${base}?${query}` : base;

  return appAxiosInstance<playResponse>(url, {
    ...requestInit,
    method: 'POST',
    headers: playMetricsRequestHeaders(requestInit.headers),
  });
}

export async function reportCompletePlayShortVideo(
  episodeId: string,
  options?: RequestInit,
): Promise<completeResponse> {
  const episodeSegment = encodeSnowflakePathSegment(episodeId);
  return appAxiosInstance<completeResponse>(
    `/api/mini-drama/user/short-videos/${episodeSegment}/complete`,
    {
      ...options,
      method: 'POST',
      headers: playMetricsRequestHeaders(options?.headers),
    },
  );
}

/** 单集有效完播上报（`episodeId` 为详情接口返回的雪花实体 id） */
export async function reportCompletePlayEpisode(
  dramaId: string,
  episodeId: string,
  options?: RequestInit,
): Promise<completeEpisodeResponse> {
  const episodeIdText = readSnowflakeId(episodeId);
  if (episodeIdText === undefined) {
    throw new Error('reportCompletePlayEpisode: invalid episodeId');
  }

  const params = new URLSearchParams({ episodeId: episodeIdText });

  return appAxiosInstance<completeEpisodeResponse>(
    `${userDramaPath(dramaId)}/complete-episode?${params.toString()}`,
    {
      ...options,
      method: 'POST',
      headers: playMetricsRequestHeaders(options?.headers),
    },
  );
}

/** @deprecated 使用 reportCompletePlayEpisode */
export const completePlayEpisode = reportCompletePlayEpisode;
