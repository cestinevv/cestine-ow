import { createSession } from '@/api/__generated__/story/create-common/create-common';
import type { CreateUploadSessionResponse } from '@/api/__generated__/story/model/createUploadSessionResponse';
import { extractStoryInnerData } from '@/features/create-actor/uploadCreatorActorAvatar';
import { uploadCreateDramaFile } from '@/features/drama-flow/utils/uploadDramaFlowFile';
import { buildMiniDramaPublicObjectUrl } from '@/utils';

/**
 * 个人中心头像：预签直传（与创建流程角色头像同一 fileCategory）后拼公开 CDN URL，供 `updateAvatar` 提交。
 */
export async function uploadProfileAvatarFile(file: File): Promise<string> {
  const sessionRes = await createSession();
  const sessionPayload =
    extractStoryInnerData<CreateUploadSessionResponse>(sessionRes);
  const uploadSessionId = sessionPayload?.uploadSessionId;

  if (!uploadSessionId) {
    throw new Error('Failed to create upload session');
  }

  const { objectKey } = await uploadCreateDramaFile(
    file,
    'avatar',
    uploadSessionId,
  );
  const publicUrl = buildMiniDramaPublicObjectUrl(objectKey);

  if (!publicUrl) {
    throw new Error('Missing public avatar URL');
  }

  return publicUrl;
}
