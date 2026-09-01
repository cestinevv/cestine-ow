import { useEffect } from 'react';

import { isHlsUrl } from '@/features/play/playSourceResolver';

type NetworkInformationLike = EventTarget & {
  effectiveType?: string;
  saveData?: boolean;
};

function getNetworkInformation(): NetworkInformationLike | undefined {
  return (
    navigator as Navigator & {
      connection?: NetworkInformationLike;
    }
  ).connection;
}

function shouldSkipMediaPreload() {
  const connection = getNetworkInformation();
  return (
    document.visibilityState === 'hidden' ||
    connection?.saveData === true ||
    connection?.effectiveType === '2g' ||
    connection?.effectiveType === 'slow-2g'
  );
}

/**
 * 预热相邻条目的 HLS manifest 或 MP4 metadata，不建立第二个播放器实例。
 * HLS：仅 fetch master m3u8（利用浏览器 HTTP 缓存，hls.js 切换时命中）。
 * MP4：创建隐藏 video 拉 metadata。
 */
export function usePlayAdjacentMediaPreload(mediaUrl?: string) {
  useEffect(() => {
    const url = mediaUrl?.trim();
    if (!url) {
      return;
    }

    let controller: AbortController | undefined;
    let video: HTMLVideoElement | undefined;

    const stopPreload = () => {
      controller?.abort();
      controller = undefined;

      if (video) {
        video.removeAttribute('src');
        video.load();
        video = undefined;
      }
    };

    const startPreload = () => {
      stopPreload();
      if (shouldSkipMediaPreload()) {
        return;
      }

      if (isHlsUrl(url)) {
        controller = new AbortController();
        void fetch(url, {
          credentials: 'include',
          signal: controller.signal,
        }).catch(() => {});
        return;
      }

      video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = url;
      video.load();
    };

    const handleEnvironmentChange = () => {
      startPreload();
    };
    const connection = getNetworkInformation();

    startPreload();
    document.addEventListener('visibilitychange', handleEnvironmentChange);
    connection?.addEventListener('change', handleEnvironmentChange);

    return () => {
      document.removeEventListener('visibilitychange', handleEnvironmentChange);
      connection?.removeEventListener('change', handleEnvironmentChange);
      stopPreload();
    };
  }, [mediaUrl]);
}
