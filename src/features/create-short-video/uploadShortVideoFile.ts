import {
  createPresign,
  createSession,
} from '@/api/__generated__/story/create-common/create-common';
import type { CreateUploadSessionResponse } from '@/api/__generated__/story/model/createUploadSessionResponse';
import type { UploadPresignResponse } from '@/api/__generated__/story/model/uploadPresignResponse';
import { extractStoryInnerData } from '@/features/create-actor/uploadCreatorActorAvatar';
import { SHORT_VIDEO_MAX_SIZE_BYTES } from '@/features/create-short-video/createShortVideo';

type ShortVideoUploadCategory = 'episode' | 'cover';

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
        onUploadProgress(100);
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

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onUploadProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      }
    };

    xhr.addEventListener('error', () => {
      xhrErrored = true;
      settle(false, new Error('Upload failed'));
    });

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

export async function createShortVideoUploadSession(
  signal?: AbortSignal,
): Promise<number> {
  const sessionRes = await createSession({ signal });
  const sessionPayload =
    extractStoryInnerData<CreateUploadSessionResponse>(sessionRes);
  const uploadSessionId = sessionPayload?.uploadSessionId;

  if (uploadSessionId === undefined || uploadSessionId === null) {
    throw new Error('Missing uploadSessionId');
  }

  return uploadSessionId;
}

export async function uploadShortVideoFile({
  file,
  fileCategory,
  uploadSessionId,
  onUploadProgress,
  signal,
}: {
  file: File;
  fileCategory: ShortVideoUploadCategory;
  uploadSessionId: number;
  onUploadProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<{ objectKey: string; uploadSessionId: number }> {
  throwIfAborted(signal);

  if (fileCategory === 'episode' && file.size > SHORT_VIDEO_MAX_SIZE_BYTES) {
    throw new Error('Short video file size exceeds limit');
  }

  const safeName =
    file.name?.trim() ||
    (fileCategory === 'episode' ? 'short-video.mp4' : 'short-video-cover.jpg');
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

export function isShortVideoUploadAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
