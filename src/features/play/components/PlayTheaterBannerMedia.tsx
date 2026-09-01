import { useEffect, useState } from 'react';

import { PlayTheaterBannerHlsVideo } from '@/features/play/components/PlayTheaterBannerHlsVideo';
import type { PlayTheaterBannerItem } from '@/features/play/types/playTheaterBannerItem';
import { cn } from '@/utils';

const BANNER_CROSSFADE_MS = 700;

export type PlayTheaterBannerPlaybackEntry = {
  dramaId: string;
  mediaAccessUrl?: string;
  videoUrl?: string;
};

type PlayTheaterBannerMediaProps = {
  featuredItems: PlayTheaterBannerItem[];
  playbackEntries: PlayTheaterBannerPlaybackEntry[];
  activeIndex: number;
  muted: boolean;
};

export function PlayTheaterBannerMedia({
  featuredItems,
  playbackEntries,
  activeIndex,
  muted,
}: PlayTheaterBannerMediaProps) {
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  const activeEntry = playbackEntries[activeIndex];

  // biome-ignore lint/correctness/useExhaustiveDependencies: 切换 Banner 时重置封面渐隐状态
  useEffect(() => {
    setHasStartedPlaying(false);
  }, [activeIndex, activeEntry?.mediaAccessUrl, activeEntry?.videoUrl]);

  const handleStartedPlaying = () => {
    setHasStartedPlaying(true);
  };

  const showVideoLayer = hasStartedPlaying;

  return (
    <>
      {featuredItems.map((item, index) => {
        const isActive = index === activeIndex;

        return (
          <div
            key={item.dramaId}
            className={cn(
              'absolute inset-0 size-full will-change-[opacity,transform]',
              'transition-[opacity,transform] ease-in-out',
              isActive ? 'scale-100 opacity-100' : 'scale-105 opacity-0',
            )}
            style={{
              transitionDuration: `${BANNER_CROSSFADE_MS}ms`,
            }}
          >
            <img
              src={item.bannerUrl}
              alt=""
              width={1920}
              height={720}
              className={cn(
                'absolute inset-0 size-full object-cover',
                'transition-opacity ease-in-out',
                isActive && showVideoLayer ? 'opacity-0' : 'opacity-100',
              )}
              style={{
                transitionDuration: `${BANNER_CROSSFADE_MS}ms`,
              }}
            />
          </div>
        );
      })}

      {playbackEntries.map((entry, index) => {
        const isActive = index === activeIndex;

        if (!entry.mediaAccessUrl?.trim() && !entry.videoUrl?.trim()) {
          return null;
        }

        return (
          <PlayTheaterBannerHlsVideo
            key={entry.dramaId}
            mediaAccessUrl={entry.mediaAccessUrl}
            videoUrl={entry.videoUrl}
            isActive={isActive}
            muted={muted || !isActive}
            className={cn(
              'z-[1] transition-opacity ease-in-out',
              isActive && showVideoLayer ? 'opacity-100' : 'opacity-0',
              !isActive && 'pointer-events-none invisible',
            )}
            onPlaying={isActive ? handleStartedPlaying : undefined}
          />
        );
      })}

      {featuredItems.length === 0 ? (
        <div className="absolute inset-0 bg-muted" aria-hidden />
      ) : null}
    </>
  );
}
