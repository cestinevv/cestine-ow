import Hls from 'hls.js';
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const HLS_MIME = 'application/vnd.apple.mpegurl';
const SEEK_STEP_SECONDS = 5;

export function focusPlaybackToPageTop() {
  if (typeof window === 'undefined') {
    return;
  }
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}

function isHlsSource(url: string) {
  return url.includes('.m3u8');
}

function canNativePlayHls(video: HTMLVideoElement) {
  return video.canPlayType(HLS_MIME) !== '';
}

export type UsePlaybackControllerOptions = {
  src: string;
  enabled: boolean;
  fullscreenTargetRef?: RefObject<HTMLElement | null>;
  onRequestClose?: () => void;
  onEnded?: () => void;
};

export type PlaybackController = {
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  isFullscreen: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => Promise<void>;
};

export function usePlaybackController({
  src,
  enabled,
  fullscreenTargetRef,
  onRequestClose,
  onEnded,
}: UsePlaybackControllerOptions): PlaybackController {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Attach media source (hls.js when needed, native src otherwise).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled || !src) {
      return;
    }

    // Reset transient state each time we rebind a source.
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsBuffering(true);

    let cancelled = false;

    if (isHlsSource(src) && !canNativePlayHls(video) && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) {
          return;
        }
        void video
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            setIsPlaying(false);
          });
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        }
      });
    } else {
      video.src = src;
      video.load();
      void video
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }

    return () => {
      cancelled = true;
      const currentHls = hlsRef.current;
      if (currentHls) {
        currentHls.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [src, enabled]);

  // Pause & reset when disabled.
  useEffect(() => {
    if (enabled) {
      return;
    }
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // Some browsers throw before metadata is ready; safe to ignore.
    }
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsBuffering(false);
  }, [enabled]);

  // Sync UI state with video events.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handleTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setIsPlaying(!video.paused && !video.ended);
      setIsBuffering(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };
    const handleVolumeChange = () => {
      setVolumeState(video.volume ?? 1);
      setIsMuted(video.muted);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onEnded]);

  // Track fullscreen state (global event; scope handled by toggleFullscreen).
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
    };
  }, []);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    void video.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      void video.play().catch(() => {});
      setIsPlaying(true);
      return;
    }
    video.pause();
    setIsPlaying(false);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const target = Math.max(
      0,
      Math.min(
        Number.isFinite(video.duration) ? video.duration : seconds,
        seconds,
      ),
    );
    video.currentTime = target;
    setCurrentTime(target);
  }, []);

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) {
        return;
      }
      seekTo((video.currentTime || 0) + delta);
    },
    [seekTo],
  );

  const setVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const next = Math.max(0, Math.min(1, value));
    video.volume = next;
    const nextMuted = next <= 0;
    video.muted = nextMuted;
    setVolumeState(next);
    setIsMuted(nextMuted);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    if (!nextMuted && video.volume === 0) {
      video.volume = 1;
      setVolumeState(1);
    }
    setIsMuted(nextMuted);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') {
      return;
    }
    const target = fullscreenTargetRef?.current ?? videoRef.current;
    if (!target) {
      return;
    }
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
      return;
    }
    try {
      await target.requestFullscreen();
    } catch {
      // ignore
    }
  }, [fullscreenTargetRef]);

  // Keyboard shortcuts: Space (toggle), ←/→ (seek), Esc (close when not fullscreen).
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        target?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT'
      ) {
        return;
      }

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        togglePlay();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekBy(-SEEK_STEP_SECONDS);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekBy(SEEK_STEP_SECONDS);
        return;
      }
      if (event.key === 'Escape' && !document.fullscreenElement) {
        onRequestClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, togglePlay, seekBy, onRequestClose]);

  return {
    videoRef,
    isPlaying,
    isMuted,
    volume,
    currentTime,
    duration,
    isBuffering,
    isFullscreen,
    play,
    pause,
    togglePlay,
    seekTo,
    seekBy,
    setVolume,
    toggleMute,
    toggleFullscreen,
  };
}
