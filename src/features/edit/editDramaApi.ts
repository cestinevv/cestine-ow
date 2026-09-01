import {
  type updateDramaResponse as DramaEditSubmissionResponse,
  updateDrama,
} from '@/api/__generated__/story/create-drama/create-drama';
import type { DramaEditSessionResponse as DramaEditContextResponse } from '@/api/__generated__/story/model/dramaEditSessionResponse';
import type { UpdateDramaRequest as SubmitDramaEditRequest } from '@/api/__generated__/story/model/updateDramaRequest';
import { appAxiosInstance } from '@/api/appRequest';
import {
  encodeSnowflakePathSegment,
  readSnowflakeId,
} from '@/utils/snowflakeId';

export const EDIT_CONTEXT_DRAMA_ID_TYPE_MISMATCH_CODE = 100400;
export const EDIT_CONTEXT_DRAMA_NOT_FOUND_CODE = 120001;
export const EDIT_CONTEXT_PENDING_REVISION_CODE = 123001;

export const EDIT_CONTEXT_FATAL_ERROR_CODES = [
  EDIT_CONTEXT_DRAMA_ID_TYPE_MISMATCH_CODE,
  EDIT_CONTEXT_DRAMA_NOT_FOUND_CODE,
  EDIT_CONTEXT_PENDING_REVISION_CODE,
] as const;

function creatorDramaPath(dramaId: string): string {
  return `/api/mini-drama/creator/dramas/${encodeSnowflakePathSegment(dramaId)}`;
}

export function getCreatorEditContextQueryKey(dramaId: string) {
  const idText = readSnowflakeId(dramaId);
  return [`/api/mini-drama/creator/dramas/${idText}/edit-sessions`] as const;
}

type EditContextApiResponse = {
  data: DramaEditContextResponse;
  status: 200;
  headers: Headers;
};

type EditSubmissionApiResponse = DramaEditSubmissionResponse;

export async function getCreatorEditContext(
  dramaId: string,
  options?: RequestInit,
): Promise<EditContextApiResponse> {
  const idText = readSnowflakeId(dramaId);
  if (!idText) {
    throw new Error('短剧 ID 无效或已丢失精度，请刷新列表后重试');
  }

  return appAxiosInstance<EditContextApiResponse>(
    `${creatorDramaPath(idText)}/edit-sessions`,
    {
      ...options,
      method: 'GET',
    },
    { silentBusinessCodes: [...EDIT_CONTEXT_FATAL_ERROR_CODES] },
  );
}

export async function submitCreatorDramaUpdate(
  dramaId: string,
  body: SubmitDramaEditRequest,
  options?: RequestInit,
): Promise<EditSubmissionApiResponse> {
  const idText = readSnowflakeId(dramaId);
  if (!idText) {
    throw new Error('短剧 ID 无效或已丢失精度，请刷新列表后重试');
  }

  return updateDrama(idText as unknown as number, body, options);
}
