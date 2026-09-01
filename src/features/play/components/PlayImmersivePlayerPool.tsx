import { type ReactNode, useMemo } from 'react';

import { getFeedItemMediaAccessUrl } from '@/features/play/playRecommendFeed';
import { resolveFeedPlaySource } from '@/features/play/playSourceResolver';
import type { PlayImmersiveItem } from '@/features/play/types/playImmersive';
import { cn } from '@/utils';

import { PlayWatchVideoPlayer } from './PlayWatchVideoPlayer';

function getSlotKey(item: PlayImmersiveItem | undefined): string {
  if (!item) {
    return '';
  }
  return `${item.dramaId ?? ''}:${item.episodeId ?? ''}:${item.episodeNo ?? 1}`;
}

type PlayImmersivePlayerPoolProps = {
  items: PlayImmersiveItem[];
  activeIndex: number;
  currentMediaUrl?: string;
  currentFallbackMp4Url?: string;
  /** current slot 无 mediaUrl 时铺封面（转码中 / gate） */
  currentCoverImage?: string;
  currentInitialTime?: number;
  isEpisodeSwitching?: boolean;
  shouldGatePlayback?: boolean;
  activePlayerProps: Omit<
    React.ComponentProps<typeof PlayWatchVideoPlayer>,
    | 'mediaUrl'
    | 'fallbackMediaUrl'
    | 'posterImage'
    | 'posterHidden'
    | 'posterFadingOut'
    | 'posterObjectFit'
    | 'onPosterTransitionEnd'
    | 'preloadOnly'
    | 'enableWatchHlsConfig'
    | 'autoplayMutedFirst'
  >;
  children?: ReactNode;
};

/**
 * Web feed 专用播放器池：prev / current / next 三个 PlayWatchVideoPlayer 平铺。
 * - 相邻 slot 用 opacity-0 + pointer-events-none，保持预渲染解码。
 * - 相邻 slot 不带 poster；current slot 无片源时带封面（含转码等待）。
 * - 仅 current slot 渲染业务 UI / 交互 / 上报。
 */
export function PlayImmersivePlayerPool({
  items,
  activeIndex,
  currentMediaUrl,
  currentFallbackMp4Url,
  currentCoverImage,
  currentInitialTime = 0,
  isEpisodeSwitching = false,
  shouldGatePlayback = false,
  activePlayerProps,
  children,
}: PlayImmersivePlayerPoolProps) {
  const currentItem = items[activeIndex];
  const nextItem = items[activeIndex + 1];
  const prevItem = items[activeIndex - 1];

  const currentKey = getSlotKey(currentItem);
  const nextKey = getSlotKey(nextItem);
  const prevKey = getSlotKey(prevItem);

  const mountedSlots = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ key: string; item: PlayImmersiveItem }> = [];

    if (prevItem && prevKey) {
      seen.add(prevKey);
      result.push({ key: prevKey, item: prevItem });
    }

    if (currentItem && currentKey && !seen.has(currentKey)) {
      seen.add(currentKey);
      result.push({ key: currentKey, item: currentItem });
    }

    if (nextItem && nextKey && !seen.has(nextKey)) {
      seen.add(nextKey);
      result.push({ key: nextKey, item: nextItem });
    }

    return result;
  }, [prevItem, prevKey, currentItem, currentKey, nextItem, nextKey]);

  return (
    <>
      {mountedSlots.map(({ key, item }) => {
        const isCurrent = key === currentKey;

        const mediaUrl = isCurrent
          ? shouldGatePlayback
            ? undefined
            : currentMediaUrl
          : resolveFeedPlaySource(getFeedItemMediaAccessUrl(item.feed))?.url;

        // 无片源时（含转码中 / gate）铺封面，避免纯黑
        const needsCoverPoster =
          isCurrent && !mediaUrl && Boolean(currentCoverImage);

        return (
          <div
            key={key}
            className={cn(
              'absolute inset-0 size-full',
              isCurrent ? 'z-1' : 'z-0 opacity-0 pointer-events-none',
            )}
          >
            <PlayWatchVideoPlayer
              mediaUrl={mediaUrl}
              fallbackMediaUrl={isCurrent ? currentFallbackMp4Url : undefined}
              isEpisodeSwitching={isCurrent ? isEpisodeSwitching : false}
              initialTime={isCurrent ? currentInitialTime : 0}
              preloadOnly={!isCurrent}
              enableWatchHlsConfig
              autoplayMutedFirst={isCurrent}
              posterImage={needsCoverPoster ? currentCoverImage : undefined}
              posterHidden={!needsCoverPoster}
              posterObjectFit={needsCoverPoster ? 'cover' : undefined}
              {...(isCurrent ? activePlayerProps : { onEnded: () => {} })}
            >
              {isCurrent ? children : null}
            </PlayWatchVideoPlayer>
          </div>
        );
      })}
    </>
  );
}
