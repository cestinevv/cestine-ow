import {
  createPresign,
  createSession,
} from '@/api/__generated__/story/create-common/create-common';
import type { CreateUploadSessionResponse } from '@/api/__generated__/story/model/createUploadSessionResponse';
import type { UploadPresignResponse } from '@/api/__generated__/story/model/uploadPresignResponse';

import { CREATOR_UPLOAD_FILE_CATEGORY_ACTOR_AVATAR } from './creatorUploadConstants';

/** 从短剧服务统一 ApiResponse 结构中取出内层 data。 */
export function extractStoryInnerData<T>(res: {
  status: number;
  data: unknown;
}): T | undefined {
  if (res.status !== 200) {
    return undefined;
  }

  const outer = res.data as Record<string, unknown> | null | undefined;
  if (!outer || typeof outer !== 'object') {
    return undefined;
  }

  return outer.data as T | undefined;
}

/**
 * 创作者形象照直传：串联短剧服务两步预签 + S3 PUT，返回提交审核请求的 avatarObjectKey。
 *
 * 1) POST `/api/mini-drama/creator/uploads/sessions` — createSession，取 uploadSessionId；
 * 2) POST `/api/mini-drama/creator/uploads/presign` — createPresign，取 uploadUrl / objectKey / requiredHeaders；
 * 3) 对 uploadUrl 发起 PUT（body 为文件字节），成功后返回 objectKey。
 */
export async function uploadCreatorActorAvatarObject(
  file: File,
): Promise<string> {
  const sessionRes = await createSession();
  const sessionPayload =
    extractStoryInnerData<CreateUploadSessionResponse>(sessionRes);
  const uploadSessionId = sessionPayload?.uploadSessionId;

  if (uploadSessionId === undefined || uploadSessionId === null) {
    throw new Error('Missing uploadSessionId');
  }

  const safeName = file.name?.trim() || 'actor-avatar.jpg';
  const contentType =
    file.type && file.type.length > 0 ? file.type : 'application/octet-stream';

  const presignRes = await createPresign({
    uploadSessionId,
    fileCategory: CREATOR_UPLOAD_FILE_CATEGORY_ACTOR_AVATAR,
    fileName: safeName,
    contentType,
  });

  const presignPayload =
    extractStoryInnerData<UploadPresignResponse>(presignRes);
  const uploadUrl = presignPayload?.uploadUrl?.trim();
  const objectKey = presignPayload?.objectKey?.trim();

  if (!uploadUrl) {
    throw new Error('Missing uploadUrl');
  }

  const putHeaders = new Headers();
  const required = presignPayload?.requiredHeaders;
  if (required && typeof required === 'object') {
    for (const [key, value] of Object.entries(required)) {
      if (value) {
        putHeaders.set(key, value);
      }
    }
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: putHeaders,
  });

  if (!putRes.ok) {
    throw new Error(`Upload failed: ${putRes.status}`);
  }

  if (!objectKey) {
    throw new Error('Missing objectKey');
  }

  return objectKey;
}
