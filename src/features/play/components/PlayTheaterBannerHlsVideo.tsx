import Hls from 'hls.js';
import { useEffect, useRef } from 'react';

import { PLAY_HLS_CONFIG } from '@/features/play/playHlsCredentials';
import {
  type PlaySource,
  resolveInitialPlaySource,
} from '@/features/play/playSourceResolver';
import { THEATER_BANNER_ACTIVE_SEGMENT_COUNT } from '@/features/play/playTheaterBannerHlsConstants';
import { cn } from '@/utils';

type PlayTheaterBannerHlsVideoProps = {
  mediaAccessUrl?: string;
  videoUrl?: string;
  isActive: boolean;
  muted: boolean;
  className?: string;
  onPlaying?: () => void;
};

function createBannerHls(): Hls {
  return new Hls({
    enableWorker: true,
    maxMaxBufferLength: 60,
    ...PLAY_HLS_CONFIG,
  });
}

export function PlayTheaterBannerHlsVideo({
  mediaAccessUrl,
  videoUrl,
  isActive,
  muted,
  className,
  onPlaying,
}: PlayTheaterBannerHlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const activeSourceRef = useRef<PlaySource | undefined>(undefined);
  const bufferedFragCountRef = useRef(0);
  const isActiveRef = useRef(isActive);
  const onPlayingRef = useRef(onPlaying);

  isActiveRef.current = isActive;
  onPlayingRef.current = onPlaying;

  useEffect(() => {
    const video = videoRef.current;
    const source = resolveInitialPlaySource({
      hlsUrl: mediaAccessUrl,
      mp4Url: videoUrl,
    });
    const url = source?.url;
    activeSourceRef.current = source;

    bufferedFragCountRef.current = 0;

    if (!video || !url) {
      return;
    }

    const tryStartActivePlayback = () => {
      if (!isActiveRef.current) {
        return;
      }

      void video.play().catch(() => {
        // autoplay policy
      });
    };

    const handleFragBuffered = () => {
      bufferedFragCountRef.current += 1;
      const buffered = bufferedFragCountRef.current;

      if (
        isActiveRef.current &&
        buffered >= THEATER_BANNER_ACTIVE_SEGMENT_COUNT
      ) {
        tryStartActivePlayback();
      }

      // 不在 idle 时 stopLoad，让 HLS.js 持续在后台缓冲（上限由 maxMaxBufferLength:60 管控），
      // 切换 banner 时无需重建连接，起播零等待
    };

    if (source.type === 'mp4') {
      video.src = url;
      video.addEventListener(
        'loadeddata',
        () => {
          tryStartActivePlayback();
        },
        { once: true },
      );
    } else if (Hls.isSupported()) {
      const hls = createBannerHls();
      hlsRef.current = hls;
      hls.on(Hls.Events.FRAG_BUFFERED, handleFragBuffered);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal || !videoUrl?.trim()) {
          return;
        }
        hls.destroy();
        hlsRef.current = null;
        activeSourceRef.current = { type: 'mp4', url: videoUrl.trim() };
        video.src = videoUrl.trim();
        tryStartActivePlayback();
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.startLoad();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener(
        'loadeddata',
        () => {
          tryStartActivePlayback();
        },
        { once: true },
      );
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [mediaAccessUrl, videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = muted;
    video.loop = true;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video || !activeSourceRef.current?.url) {
      return;
    }

    const handlePlaying = () => {
      onPlayingRef.current?.();
    };

    video.addEventListener('playing', handlePlaying);

    if (!isActive) {
      video.pause();
      return () => {
        video.removeEventListener('playing', handlePlaying);
      };
    }

    if (hls) {
      // HLS 路径：idle 时已持续缓冲，startLoad 为 no-op；buffer 足够则立即起播
      hls.startLoad();
      if (bufferedFragCountRef.current >= THEATER_BANNER_ACTIVE_SEGMENT_COUNT) {
        void video.play().catch(() => {
          // autoplay policy
        });
      }
    } else {
      // MP4 路径（移动端 / Safari HLS 原生）：浏览器自行管理缓冲，直接 play
      void video.play().catch(() => {
        // autoplay policy
      });
    }

    return () => {
      video.removeEventListener('playing', handlePlaying);
    };
  }, [isActive]);

  return (
    <video
      ref={videoRef}
      className={cn('absolute inset-0 size-full object-cover', className)}
      muted={muted}
      playsInline
      loop
      preload="auto"
    />
  );
}
