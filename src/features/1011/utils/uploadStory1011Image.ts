import type { PreSignedPutUrlResult } from '@/api/__generated__/wallet/model/preSignedPutUrlResult';

/**
 * 故事提交后的预签名直传：对 urlResult.uploadUrl 发起 PUT。
 */
export async function uploadStory1011Image(
  file: File,
  urlResult: PreSignedPutUrlResult,
): Promise<void> {
  const uploadUrl = urlResult.uploadUrl?.trim();

  if (!uploadUrl) {
    throw new Error('Missing uploadUrl');
  }

  const putHeaders = new Headers();
  const required = urlResult.requiredHeaders;

  if (required && typeof required === 'object') {
    for (const [key, value] of Object.entries(required)) {
      if (value) {
        putHeaders.set(key, value);
      }
    }
  }

  if (file.type && !putHeaders.has('Content-Type')) {
    putHeaders.set('Content-Type', file.type);
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: putHeaders,
  });

  if (!putRes.ok) {
    throw new Error(`Upload failed: ${putRes.status}`);
  }
}
