import {
  type getShortVideoEditSessionResponse,
  updateShortVideo,
  type updateShortVideoResponse,
} from '@/api/__generated__/story/create-shortvideo/create-shortvideo';
import type { UpdateShortVideoRequest } from '@/api/__generated__/story/model/updateShortVideoRequest';
import { appAxiosInstance } from '@/api/appRequest';
import {
  encodeSnowflakePathSegment,
  readSnowflakeId,
} from '@/utils/snowflakeId';

function creatorShortVideoPath(episodeId: string): string {
  return `/api/mini-drama/creator/short-videos/${encodeSnowflakePathSegment(episodeId)}`;
}

export function getCreatorShortVideoEditSessionQueryKey(episodeId: string) {
  const idText = readSnowflakeId(episodeId);

  return [
    `/api/mini-drama/creator/short-videos/${idText}/edit-sessions`,
  ] as const;
}

export async function getCreatorShortVideoEditSession(
  episodeId: string,
  options?: RequestInit,
): Promise<getShortVideoEditSessionResponse> {
  const idText = readSnowflakeId(episodeId);
  if (!idText) {
    throw new Error('短视频 ID 无效或已丢失精度，请刷新列表后重试');
  }

  return appAxiosInstance<getShortVideoEditSessionResponse>(
    `${creatorShortVideoPath(idText)}/edit-sessions`,
    {
      ...options,
      method: 'GET',
    },
  );
}

export async function submitCreatorShortVideoUpdate(
  episodeId: string,
  body: UpdateShortVideoRequest,
  options?: RequestInit,
): Promise<updateShortVideoResponse> {
  const idText = readSnowflakeId(episodeId);
  if (!idText) {
    throw new Error('短视频 ID 无效或已丢失精度，请刷新列表后重试');
  }

  return updateShortVideo(idText as unknown as number, body, options);
}
