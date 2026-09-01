import { useMediaRemote, useMediaState } from '@vidstack/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import IconPlayerAspectRatio from '@/assets/svg/IconPlayerAspectRatio';
import IconPlayerAspectRatioExit from '@/assets/svg/IconPlayerAspectRatioExit';
import IconPlayerFullscreen from '@/assets/svg/IconPlayerFullscreen';
import IconPlayerFullscreenExit from '@/assets/svg/IconPlayerFullscreenExit';
import IconPlayerPause from '@/assets/svg/IconPlayerPause';
import IconPlayerPlay from '@/assets/svg/IconPlayerPlay';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PlayImmersiveVolumeControl } from '@/features/play/components/PlayImmersiveVolumeControl';
import { PlayWatchProgressSlider } from '@/features/play/components/PlayWatchProgressSlider';
import { cn } from '@/utils';

const PLAYBACK_SEEK_STEP_SECONDS = 5;

type PlayImmersiveDesktopControlsProps = {
  continuousPlay: boolean;
  onContinuousPlayChange: (value: boolean) => void;
  isCleanScreen: boolean;
  onCleanScreenChange: (value: boolean) => void;
  isWebFullscreen: boolean;
  onWebFullscreen: () => void;
  isSystemFullscreen: boolean;
  onSystemFullscreen: () => void;
  onUserPause: () => void;
  onUserPlay: () => void;
};

function formatTime(seconds: number) {
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

/** 桌面沉浸播放底栏 — Figma「底部播放条」9:627 */
export function PlayImmersiveDesktopControls({
  continuousPlay,
  onContinuousPlayChange,
  isCleanScreen,
  onCleanScreenChange,
  isWebFullscreen,
  onWebFullscreen,
  isSystemFullscreen,
  onSystemFullscreen,
  onUserPause,
  onUserPlay,
}: PlayImmersiveDesktopControlsProps) {
  const { t } = useTranslation();
  const remote = useMediaRemote();
  const paused = useMediaState('paused');
  const currentTime = useMediaState('currentTime');
  const duration = useMediaState('duration');
  const pausedRef = useRef(paused);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const onUserPauseRef = useRef(onUserPause);
  const onUserPlayRef = useRef(onUserPlay);

  pausedRef.current = paused;
  currentTimeRef.current = currentTime;
  durationRef.current = duration;
  onUserPauseRef.current = onUserPause;
  onUserPlayRef.current = onUserPlay;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        target?.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'
      ) {
        return;
      }

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        if (pausedRef.current) {
          remote.play();
          onUserPlayRef.current();
        } else {
          remote.pause();
          onUserPauseRef.current();
        }
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        remote.seek(
          Math.max(0, currentTimeRef.current - PLAYBACK_SEEK_STEP_SECONDS),
        );
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        const playedTime = currentTimeRef.current;
        const totalDuration = durationRef.current;
        const ceiling =
          Number.isFinite(totalDuration) && totalDuration > 0
            ? totalDuration
            : playedTime + PLAYBACK_SEEK_STEP_SECONDS;
        remote.seek(Math.min(ceiling, playedTime + PLAYBACK_SEEK_STEP_SECONDS));
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [remote]);

  const handleTogglePlay = () => {
    if (paused) {
      remote.play();
      onUserPlay();
      return;
    }

    remote.pause();
    onUserPause();
  };

  // 默认 #696e77，悬停稿面 text/primary #edeef0（11:1442）
  const controlIconClassName = cn(
    'size-6 rounded-none p-0',
    'text-play-controls-fg hover:bg-transparent hover:text-play-controls-hover',
  );
  const controlLabelClassName = cn(
    'text-sm leading-5 text-play-controls-fg',
    'group-hover/control:text-play-controls-hover',
  );
  const controlSwitchClassName = cn(
    'data-checked:bg-play-toggle-checked data-unchecked:bg-play-toggle-unchecked',
    '[&_[data-slot=switch-thumb]]:!bg-play-toggle-thumb',
  );

  return (
    <div
      className={cn(
        // Layout
        'pointer-events-auto relative flex w-full flex-col overflow-visible',
        // Visual
        'bg-black',
      )}
    >
      <PlayWatchProgressSlider
        variant={isCleanScreen ? 'cleanScreen' : 'default'}
      />
      <div
        className={cn(
          // Layout
          'flex items-center justify-between overflow-visible',
          // Spacing
          'gap-3 px-4 py-2.5',
        )}
      >
        <div className={cn('flex items-center gap-2')}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleTogglePlay}
            aria-label={paused ? t('播放') : t('暂停')}
            className={controlIconClassName}
          >
            {paused ? (
              <IconPlayerPlay className="size-6" />
            ) : (
              <IconPlayerPause className="size-6" />
            )}
          </Button>
          <span
            className={cn(
              'text-sm leading-5 tracking-normal tabular-nums',
              'text-play-controls-fg hover:text-play-controls-hover',
            )}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className={cn('flex h-6 items-center gap-3 overflow-visible')}>
          <div className={cn('group/control flex items-center gap-1')}>
            <Switch
              size="sm"
              checked={continuousPlay}
              onCheckedChange={onContinuousPlayChange}
              aria-label={t('连播')}
              className={controlSwitchClassName}
            />
            <span className={controlLabelClassName}>{t('连播')}</span>
          </div>
          <div className={cn('group/control flex items-center gap-1')}>
            <Switch
              size="sm"
              checked={isCleanScreen}
              onCheckedChange={onCleanScreenChange}
              aria-label={t('清屏')}
              className={controlSwitchClassName}
            />
            <span className={controlLabelClassName}>{t('清屏')}</span>
          </div>
          <PlayImmersiveVolumeControl iconClassName={controlIconClassName} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onWebFullscreen}
            aria-label={isWebFullscreen ? t('退出网页全屏') : t('网页全屏')}
            className={controlIconClassName}
          >
            {isWebFullscreen ? (
              <IconPlayerAspectRatioExit className="size-6" />
            ) : (
              <IconPlayerAspectRatio className="size-6" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onSystemFullscreen}
            aria-label={isSystemFullscreen ? t('退出系统全屏') : t('系统全屏')}
            className={controlIconClassName}
          >
            {isSystemFullscreen ? (
              <IconPlayerFullscreenExit className="size-6" />
            ) : (
              <IconPlayerFullscreen className="size-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
