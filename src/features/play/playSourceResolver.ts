import Hls from 'hls.js';

export type PlaySourceType = 'hls' | 'mp4';

export type PlaySource = {
  type: PlaySourceType;
  url: string;
};

function canUseDocument() {
  return typeof document !== 'undefined';
}

export function isRiskyAndroidBuiltinBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent.toLowerCase();
  return (
    /android/.test(ua) &&
    /miuibrowser|mibrowser|heytapbrowser|oppobrowser|opbrowser|vivobrowser/.test(
      ua,
    )
  );
}

export function canPlayHls(): boolean {
  if (!canUseDocument()) {
    return false;
  }

  const video = document.createElement('video');
  return (
    video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
    video.canPlayType('application/x-mpegURL') !== '' ||
    Hls.isSupported()
  );
}

export function isHlsUrl(url?: string): boolean {
  return /\.m3u8(?:$|[?#])/i.test(url?.trim() ?? '');
}

export function resolveInitialPlaySource({
  hlsUrl,
  mp4Url,
}: {
  hlsUrl?: string;
  mp4Url?: string;
}): PlaySource | undefined {
  const normalizedHlsUrl = hlsUrl?.trim();
  const normalizedMp4Url = mp4Url?.trim();

  if (isRiskyAndroidBuiltinBrowser() && normalizedMp4Url) {
    return { type: 'mp4', url: normalizedMp4Url };
  }

  if (normalizedHlsUrl && canPlayHls()) {
    return { type: 'hls', url: normalizedHlsUrl };
  }

  if (normalizedMp4Url) {
    return { type: 'mp4', url: normalizedMp4Url };
  }

  return undefined;
}

/** 推荐 Feed 的 mediaAccessUrl 可能是 HLS 或 mp4，按 URL 形态分流 */
export function resolveFeedPlaySource(
  mediaAccessUrl?: string,
): PlaySource | undefined {
  const url = mediaAccessUrl?.trim();
  if (!url) {
    return undefined;
  }

  const hls = isHlsUrl(url);
  return resolveInitialPlaySource({
    hlsUrl: hls ? url : undefined,
    mp4Url: hls ? undefined : url,
  });
}
