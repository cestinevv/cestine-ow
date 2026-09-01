import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconPlayerFullscreen from '@/assets/svg/IconPlayerFullscreen';
import IconPlayerPause from '@/assets/svg/IconPlayerPause';
import IconPlayerPlay from '@/assets/svg/IconPlayerPlay';
import IconPlayerVolume2 from '@/assets/svg/IconPlayerVolume2';
import IconPlayerVolumeOff from '@/assets/svg/IconPlayerVolumeOff';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

type CreateEpisodePreviewVideoPlayerProps = {
  videoSrc: string;
  isActive: boolean;
};

function formatPreviewTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainSeconds = total % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
}

function clampPreviewVolume(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function DramaFlowEpisodePreviewVideoPlayer({
  videoSrc,
  isActive,
}: CreateEpisodePreviewVideoPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const volumeAreaRef = useRef<HTMLFieldSetElement | null>(null);
  const volumeTrackRef = useRef<HTMLDivElement | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isVolumePanelVisible, setIsVolumePanelVisible] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);

  const showVolumePanel = isVolumePanelVisible || isVolumeDragging;
  const displayVolume = muted ? 0 : volume;
  const volumeFillPercent = `${displayVolume * 100}%`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!isActive) {
      video.pause();
      video.currentTime = 0;
      setPaused(true);
      setCurrentTime(0);
      setIsVolumePanelVisible(false);
      setIsVolumeDragging(false);
      return;
    }

    const tryAutoplay = () => {
      void video.play().catch(() => {});
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryAutoplay();
      return;
    }

    video.addEventListener('loadeddata', tryAutoplay, { once: true });

    return () => {
      video.removeEventListener('loadeddata', tryAutoplay);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isVolumeDragging) {
      return;
    }

    const moveVolumeDrag = (event: PointerEvent) => {
      const track = volumeTrackRef.current;
      const video = videoRef.current;
      if (!track || !video) {
        return;
      }

      const rect = track.getBoundingClientRect();
      if (rect.height <= 0) {
        return;
      }

      const nextVolume = clampPreviewVolume(
        (rect.bottom - event.clientY) / rect.height,
      );
      video.volume = nextVolume;
      video.muted = nextVolume === 0;
      setVolume(nextVolume);
      setMuted(video.muted);
    };

    const endVolumeDrag = (event: PointerEvent) => {
      setIsVolumeDragging(false);
      const volumeArea = volumeAreaRef.current;
      if (!volumeArea) {
        return;
      }

      const hitTarget = document.elementFromPoint(event.clientX, event.clientY);
      if (!hitTarget || !volumeArea.contains(hitTarget)) {
        setIsVolumePanelVisible(false);
      }
    };

    window.addEventListener('pointermove', moveVolumeDrag);
    window.addEventListener('pointerup', endVolumeDrag);
    window.addEventListener('pointercancel', endVolumeDrag);
    return () => {
      window.removeEventListener('pointermove', moveVolumeDrag);
      window.removeEventListener('pointerup', endVolumeDrag);
      window.removeEventListener('pointercancel', endVolumeDrag);
    };
  }, [isVolumeDragging]);

  const applyVolume = (nextVolume: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const normalizedVolume = clampPreviewVolume(nextVolume);
    video.volume = normalizedVolume;
    video.muted = normalizedVolume === 0;
    setVolume(normalizedVolume);
    setMuted(video.muted);
  };

  const applyVolumeFromPointer = (clientY: number) => {
    const track = volumeTrackRef.current;
    if (!track) {
      return;
    }

    const rect = track.getBoundingClientRect();
    if (rect.height <= 0) {
      return;
    }

    applyVolume(clampPreviewVolume((rect.bottom - clientY) / rect.height));
  };
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      return;
    }

    setIsPortrait(height > width);
    setAspectRatio(`${width}/${height}`);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    setCurrentTime(video.currentTime);
  };

  const handlePlayStateChange = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    setPaused(video.paused);
  };

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  };

  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextTime = Number(event.target.value);
    if (!Number.isFinite(nextTime)) {
      return;
    }

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);

    if (!nextMuted && video.volume === 0) {
      applyVolume(1);
    }
  };

  const handleVolumePanelMouseEnter = () => {
    setIsVolumePanelVisible(true);
  };

  const handleVolumePanelMouseLeave = () => {
    if (isVolumeDragging) {
      return;
    }

    setIsVolumePanelVisible(false);
  };

  const handleVolumeSliderPointerDown = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setIsVolumePanelVisible(true);
    setIsVolumeDragging(true);
    applyVolumeFromPointer(event.clientY);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void video.requestFullscreen();
  };

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className={cn(
        'relative flex w-full items-center justify-center overflow-hidden rounded bg-muted',
        isPortrait ? 'aspect-square max-h-[539px]' : 'max-h-[539px]',
      )}
      style={isPortrait ? undefined : { aspectRatio }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        playsInline
        preload="metadata"
        className="size-full object-contain"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlayStateChange}
        onPause={handlePlayStateChange}
      >
        <track kind="captions" label={t('播放预览')} />
      </video>
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col',
          'gap-5 bg-gradient-to-b from-transparent to-black/50 p-5',
        )}
      >
        <div className={cn('flex w-full flex-col gap-1.5')}>
          <div
            className={cn(
              'flex w-full items-center justify-between',
              'text-xs leading-4 font-semibold text-white',
            )}
          >
            <span>{formatPreviewTime(currentTime)}</span>
            <span>{formatPreviewTime(duration)}</span>
          </div>
          <div className={cn('relative h-1 w-full rounded-full bg-white/40')}>
            <div
              className={cn('absolute inset-y-0 left-0 rounded-full bg-white')}
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 0}
              step={0.1}
              value={currentTime}
              onChange={handleProgressChange}
              aria-label={t('播放进度')}
              className={cn(
                'absolute inset-0 size-full cursor-pointer opacity-0',
              )}
            />
          </div>
        </div>
        <div className={cn('flex w-full items-center justify-between')}>
          <div className={cn('flex items-center gap-5')}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleTogglePlay}
              className={cn('size-6 text-white hover:bg-white/10')}
              aria-label={paused ? t('播放') : t('暂停')}
            >
              {paused ? (
                <IconPlayerPlay className="size-6" />
              ) : (
                <IconPlayerPause className="size-6" />
              )}
            </Button>
          </div>
          <div className={cn('flex items-center gap-5')}>
            <fieldset
              ref={volumeAreaRef}
              aria-label={t('音量')}
              className={cn(
                // Layout — 对齐播放器 PlayImmersiveVolumeControl
                'relative m-0 flex h-6 min-w-0 shrink-0 items-center overflow-visible border-0 p-0',
              )}
              onMouseEnter={handleVolumePanelMouseEnter}
              onMouseLeave={handleVolumePanelMouseLeave}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {showVolumePanel ? (
                <div
                  className={cn(
                    // Layout & Positioning — 与喇叭重叠 4px，避免移入滑条时断悬停
                    'absolute bottom-[calc(100%-4px)] left-1/2 z-50 flex -translate-x-1/2',
                    // Sizing & Spacing
                    'h-[148px] w-10 flex-col items-stretch justify-end',
                    // Visual
                    'pointer-events-auto touch-none',
                  )}
                >
                  <div
                    className={cn(
                      // Layout & Positioning
                      'flex min-h-0 flex-1 items-center justify-center',
                      // Sizing & Spacing
                      'p-2',
                      // Visual
                      'rounded-xl bg-black/80 backdrop-blur-md',
                    )}
                  >
                    <div
                      role="slider"
                      tabIndex={0}
                      aria-label={t('音量')}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(displayVolume * 100)}
                      aria-orientation="vertical"
                      onPointerDown={handleVolumeSliderPointerDown}
                      className={cn(
                        // Layout & Positioning
                        'relative flex h-full w-full touch-none select-none items-center justify-center',
                        // State
                        'cursor-pointer outline-none',
                      )}
                    >
                      <div
                        ref={volumeTrackRef}
                        className={cn(
                          // Layout & Positioning
                          'relative mx-auto h-full w-1.5',
                          // Visual
                          'overflow-hidden rounded-full bg-white/30',
                        )}
                      >
                        <div
                          className="absolute inset-x-0 bottom-0 rounded-full bg-white"
                          style={{ height: volumeFillPercent }}
                        />
                      </div>
                      <div
                        className={cn(
                          // Layout & Positioning
                          'absolute left-1/2 z-20 -translate-x-1/2 translate-y-1/2',
                          // Sizing & Spacing
                          'size-3 rounded-full',
                          // Visual
                          'bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]',
                        )}
                        style={{ bottom: volumeFillPercent }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleToggleMute}
                className={cn(
                  'relative z-10 size-6 text-white hover:bg-white/10',
                )}
                aria-label={muted ? t('取消静音') : t('静音')}
              >
                {muted || volume === 0 ? (
                  <IconPlayerVolumeOff className="size-6" />
                ) : (
                  <IconPlayerVolume2 className="size-6" />
                )}
              </Button>
            </fieldset>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className={cn(
                'hidden size-6 text-white hover:bg-white/10 md:inline-flex',
              )}
              aria-label={t('全屏')}
            >
              <IconPlayerFullscreen className="size-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
