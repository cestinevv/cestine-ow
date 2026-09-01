import { useMediaRemote, useMediaState, VolumeSlider } from '@vidstack/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconPlayerVolume2 from '@/assets/svg/IconPlayerVolume2';
import IconPlayerVolumeOff from '@/assets/svg/IconPlayerVolumeOff';
import { Button } from '@/components/ui/button';
import { usePlayMediaAudioStore } from '@/stores/playMediaAudioStore';
import { cn } from '@/utils';

type PlayImmersiveVolumeControlProps = {
  iconClassName: string;
};

/** 与 main `PlayVideoOverlay` 桌面喇叭一致：悬停出竖向音量条，点击切换静音 */
export function PlayImmersiveVolumeControl({
  iconClassName,
}: PlayImmersiveVolumeControlProps) {
  const { t } = useTranslation();
  const remote = useMediaRemote();
  const muted = useMediaState('muted');
  const volume = useMediaState('volume');
  const setMuted = usePlayMediaAudioStore((state) => state.setMuted);
  const [isVolumePanelVisible, setIsVolumePanelVisible] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const volumeAreaRef = useRef<HTMLFieldSetElement | null>(null);
  const showVolumePanel = isVolumePanelVisible || isVolumeDragging;

  useEffect(() => {
    if (!isVolumeDragging) {
      return;
    }

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

    window.addEventListener('pointerup', endVolumeDrag);
    window.addEventListener('pointercancel', endVolumeDrag);
    return () => {
      window.removeEventListener('pointerup', endVolumeDrag);
      window.removeEventListener('pointercancel', endVolumeDrag);
    };
  }, [isVolumeDragging]);

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
    event.stopPropagation();
    setIsVolumePanelVisible(true);
    setIsVolumeDragging(true);
  };

  const handleToggleMute = () => {
    const nextMuted = !usePlayMediaAudioStore.getState().muted;
    setMuted(nextMuted);

    if (nextMuted) {
      remote.mute();
      return;
    }

    remote.unmute();
  };

  return (
    <fieldset
      ref={volumeAreaRef}
      aria-label={t('音量')}
      className={cn(
        // Layout — 与 main PlayVideoOverlay 喇叭区域一致
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
            <VolumeSlider.Root
              orientation="vertical"
              aria-label={t('音量')}
              onPointerDown={handleVolumeSliderPointerDown}
              className={cn(
                // Layout & Positioning
                'relative flex h-full w-full touch-none select-none items-center justify-center',
                // State
                'group/volumeslider',
              )}
            >
              <VolumeSlider.Track
                className={cn(
                  // Layout & Positioning
                  'relative mx-auto h-full w-1.5',
                  // Visual
                  'overflow-hidden rounded-full bg-white/30',
                )}
              >
                <VolumeSlider.TrackFill
                  className="absolute inset-x-0 bottom-0 rounded-full bg-white"
                  style={{ height: 'var(--slider-fill)' }}
                />
              </VolumeSlider.Track>
              <VolumeSlider.Thumb
                className={cn(
                  // Layout & Positioning
                  'absolute left-1/2 z-20 -translate-x-1/2 translate-y-1/2',
                  // Sizing & Spacing
                  'size-3 rounded-full',
                  // Visual
                  'bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]',
                )}
                style={{ bottom: 'var(--slider-fill)' }}
              />
            </VolumeSlider.Root>
          </div>
        </div>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggleMute}
        className={cn('relative z-10', iconClassName)}
        aria-label={muted ? t('取消静音') : t('静音')}
      >
        {muted || volume === 0 ? (
          <IconPlayerVolumeOff className="size-6" />
        ) : (
          <IconPlayerVolume2 className="size-6" />
        )}
      </Button>
    </fieldset>
  );
}
