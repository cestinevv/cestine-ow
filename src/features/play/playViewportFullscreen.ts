import { MOBILE_MAX_WIDTH_MEDIA_QUERY } from '@/hooks/useAppBreakpoints';

export function prefersMobileViewportFullscreen() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia(MOBILE_MAX_WIDTH_MEDIA_QUERY).matches ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

export function findPlayWatchVideoElement(): HTMLVideoElement | null {
  const video =
    document.querySelector('.play-immersive-video-frame video') ??
    document.querySelector('[data-media-player] video') ??
    document.querySelector('article video');
  return video instanceof HTMLVideoElement ? video : null;
}

export function findPlayWatchPlayerRoot(
  video: HTMLVideoElement | null,
): HTMLElement | null {
  const root = video?.closest('[data-media-player]');
  return root instanceof HTMLElement ? root : null;
}

export function tryEnterNativeVideoFullscreen(
  video: HTMLVideoElement | null,
): boolean {
  const webkitEnterFullscreen = (
    video as
      | (HTMLVideoElement & {
          webkitEnterFullscreen?: () => void;
        })
      | null
  )?.webkitEnterFullscreen;

  if (!webkitEnterFullscreen) {
    return false;
  }

  try {
    webkitEnterFullscreen.call(video);
    return true;
  } catch {
    return false;
  }
}

export function exitDocumentFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  }
}
