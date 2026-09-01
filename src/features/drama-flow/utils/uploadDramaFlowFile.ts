import { createPresign } from '@/api/__generated__/story/create-common/create-common';
import type { UploadPresignResponse } from '@/api/__generated__/story/model/uploadPresignResponse';
import { extractStoryInnerData } from '@/features/create-actor/uploadCreatorActorAvatar';
import { formatFileSizeCompact } from '@/utils';

/** 与稿面「23M」一致：视频体积展示用短标签（K / M）。 */
export function formatVideoFileSizeLabel(bytes: number): string {
  return formatFileSizeCompact(bytes);
}

/**
 * 从对象存储 key 中提取 uploadSessionId（规范路径：
 * mini-drama/assets/{uploadSessionId}/{category}/{fileName}）。
 */
export function parseUploadSessionSegmentFromObjectKey(
  objectKey: string | undefined,
): string | undefined {
  const normalized = objectKey?.trim().replace(/^\/+/, '');
  if (!normalized) {
    return undefined;
  }

  const segments = normalized.split('/');
  const assetsIndex = segments.indexOf('assets');
  if (assetsIndex < 0) {
    return undefined;
  }

  const sessionSegment = segments[assetsIndex + 1];
  if (!sessionSegment || !/^\d+$/.test(sessionSegment)) {
    return undefined;
  }
  return sessionSegment;
}

/**
 * 校验 objectKey 是否绑定到当前上传会话。
 */
export function isObjectKeyMatchedUploadSession(
  objectKey: string | undefined,
  uploadSessionId: number | string | undefined,
): boolean {
  if (!objectKey || !uploadSessionId) {
    return false;
  }

  const keySessionId = parseUploadSessionSegmentFromObjectKey(objectKey);

  return keySessionId === String(uploadSessionId).trim();
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

function putFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  putHeaders: Headers,
  onUploadProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  throwIfAborted(signal);

  if (!onUploadProgress) {
    return fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: putHeaders,
      signal,
    }).then((putRes) => {
      throwIfAborted(signal);

      if (!putRes.ok) {
        throw new Error(`Upload failed: ${putRes.status}`);
      }
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let xhrErrored = false;
    let abortedBySignal = false;

    const settle = (ok: boolean, err?: Error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (ok) {
        onUploadProgress?.(100);
        resolve();
      } else {
        reject(err ?? new Error('Upload failed'));
      }
    };

    signal?.addEventListener(
      'abort',
      () => {
        abortedBySignal = true;
        xhr.abort();
      },
      { once: true },
    );

    xhr.open('PUT', uploadUrl);
    putHeaders.forEach((value, key) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        onUploadProgress?.(
          Math.min(100, Math.round((ev.loaded / ev.total) * 100)),
        );
      }
    };

    xhr.addEventListener('error', () => {
      xhrErrored = true;
      settle(false, new Error('Upload failed'));
    });

    // 部分对象存储跨域 PUT 在浏览器里会得到 `status === 0`（opaque / 读不到状态行），但字节已写完；若仅用 2xx 判定会导致 Promise 永不结束，界面卡在 100%。
    xhr.addEventListener('loadend', () => {
      if (settled) {
        return;
      }

      if (abortedBySignal || signal?.aborted) {
        settle(false, new DOMException('Aborted', 'AbortError'));
        return;
      }

      const { status } = xhr;
      if (status >= 200 && status < 300) {
        settle(true);
        return;
      }

      if (status === 0 && !xhrErrored) {
        settle(true);
        return;
      }

      settle(false, new Error(`Upload failed: ${status}`));
    });

    xhr.send(file);
  });
}

export async function uploadCreateDramaFile(
  file: File,
  fileCategory: 'cover' | 'banner' | 'episode' | 'avatar',
  uploadSessionId: number,
  onUploadProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<{ objectKey: string; uploadSessionId: number }> {
  throwIfAborted(signal);

  if (!uploadSessionId) {
    throw new Error('Missing uploadSessionId');
  }

  const safeName =
    file.name?.trim() ||
    (fileCategory === 'episode'
      ? 'drama-episode.mp4'
      : fileCategory === 'avatar'
        ? 'drama-avatar.jpg'
        : `drama-${fileCategory}.jpg`);
  const contentType =
    file.type && file.type.length > 0 ? file.type : 'application/octet-stream';

  const presignRes = await createPresign(
    {
      uploadSessionId,
      fileCategory,
      fileName: safeName,
      contentType,
    },
    { signal },
  );

  throwIfAborted(signal);

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

  await putFileToPresignedUrl(
    uploadUrl,
    file,
    putHeaders,
    onUploadProgress,
    signal,
  );

  throwIfAborted(signal);

  if (!objectKey) {
    throw new Error('Missing objectKey');
  }

  return { objectKey, uploadSessionId };
}
