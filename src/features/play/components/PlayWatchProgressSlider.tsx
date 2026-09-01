import { TimeSlider, useMediaState } from '@vidstack/react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';

/** 须在 MediaPlayer 内使用。默认 4px 灰条；悬停/拖动与暂停同为红条+红点 */
export function PlayWatchProgressSlider({
  variant = 'default',
}: {
  variant?: 'default' | 'cleanScreen';
}) {
  const { t } = useTranslation();
  const paused = useMediaState('paused');
  const isCleanScreen = variant === 'cleanScreen';
  const isPausedStyle = !isCleanScreen && paused;

  return (
    <TimeSlider.Root
      aria-label={t('播放进度')}
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        // 默认与暂停均为 4px，外框固定 h-4，透明占位避免切态跳动
        isCleanScreen ? 'h-3' : 'h-4',
        'group/timeslider',
      )}
    >
      <TimeSlider.Track
        className={cn(
          // 勿 overflow-hidden：暂停红点 15px 会超出轨道被裁切
          'relative w-full rounded-full',
          isCleanScreen
            ? 'h-0.5 bg-white/20'
            : isPausedStyle
              ? 'h-1 bg-[#4b4b4b]'
              : cn(
                  'h-1 bg-play-progress-track',
                  // 悬停/拖动与暂停同款加粗轨道
                  'group-hover/timeslider:h-1 group-hover/timeslider:bg-[#4b4b4b]',
                  'group-data-dragging/timeslider:h-1 group-data-dragging/timeslider:bg-[#4b4b4b]',
                ),
        )}
      >
        <TimeSlider.Progress
          className={cn(
            'absolute inset-y-0 left-0 z-0 rounded-full',
            isCleanScreen ? 'bg-[#858585]' : 'bg-transparent',
          )}
          style={{ width: 'var(--slider-progress)' }}
        />
        <TimeSlider.TrackFill
          className={cn(
            'absolute inset-y-0 left-0 z-10 rounded-full',
            isCleanScreen
              ? 'bg-white/40'
              : isPausedStyle
                ? 'bg-play-progress-paused'
                : cn(
                    'bg-play-progress-fill',
                    // 悬停/拖动与暂停同款红条
                    'group-hover/timeslider:bg-play-progress-paused',
                    'group-data-dragging/timeslider:bg-play-progress-paused',
                  ),
          )}
          style={{ width: 'var(--slider-fill)' }}
        />
      </TimeSlider.Track>
      <TimeSlider.Thumb
        className={cn(
          'absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2',
          'rounded-full',
          // Figma 521:72658 point in time 16×15
          'h-3.75 w-4 bg-play-progress-paused',
          isPausedStyle
            ? 'opacity-100'
            : cn(
                'scale-0 opacity-0',
                'group-hover/timeslider:scale-100 group-hover/timeslider:opacity-100',
                'group-data-dragging/timeslider:scale-100 group-data-dragging/timeslider:opacity-100',
              ),
          'transition-[transform,opacity]',
        )}
        style={{ left: 'clamp(8px, var(--slider-fill), calc(100% - 8px))' }}
      />
    </TimeSlider.Root>
  );
}
