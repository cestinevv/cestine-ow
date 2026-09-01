import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { EpisodeInfo } from '@/api/__generated__/recommend/model/episodeInfo';
import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import { FeedItemResponseType } from '@/api/__generated__/recommend/model/feedItemResponseType';
import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { PlayImmersiveView } from '@/features/play/PlayImmersiveView';
import { PlayWatchView } from '@/features/play/PlayWatchView';
import {
  getPlayShortVideoDetail,
  getPlayShortVideoDetailQueryKey,
} from '@/features/play/playDramaApi';
import {
  normalizeDramaPlayResponse,
  unwrapOrvalPayload,
} from '@/features/play/playFormat';
import { isPlayEpisodeNotTranscodedError } from '@/features/play/playMediaErrorCodes';
import {
  PlayFeedContentType,
  type PlayImmersiveItem,
  PlayImmersiveLayoutVariant,
  PlayImmersiveMode,
  PlayImmersiveSideTab,
} from '@/features/play/types/playImmersive';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { readSnowflakeId } from '@/utils/snowflakeId';

type PlayShortVideoViewProps = {
  episodeId: string;
  items?: PlayImmersiveItem[];
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loop?: boolean;
  initialSideTab?: PlayImmersiveSideTab;
};

type DramaPlayResponseWithFavorite = DramaPlayResponse & {
  favoriteCount?: number;
};

const SHORT_VIDEO_TRANSCODE_POLL_INTERVAL_MS = 10_000;

/**
 * 短视频详情 → Feed 条目。
 * 转码中允许无 mediaAccessUrl，保留封面 / 标题 / 计数，供沉浸壳铺底与互动栏。
 */
function mapShortVideoDetailToFeedItem(
  episodeId: string,
  detail: DramaPlayResponse | null | undefined,
  options?: {
    allowWithoutMedia?: boolean;
    fallbackFeed?: FeedItemResponse;
  },
): FeedItemResponse | undefined {
  const mediaAccessUrl =
    detail?.mediaAccessUrl?.trim() || detail?.videoUrl?.trim();
  if (!mediaAccessUrl && !options?.allowWithoutMedia) {
    return undefined;
  }

  const fallback = options?.fallbackFeed;
  const fallbackEpisode = fallback?.episode;
  const detailWithFavorite = detail as
    | DramaPlayResponseWithFavorite
    | null
    | undefined;
  const coverUrl =
    detail?.coverUrl?.trim() ||
    fallbackEpisode?.coverUrl?.trim() ||
    fallback?.drama?.coverUrl?.trim() ||
    undefined;

  return {
    type: FeedItemResponseType.SHORT_VIDEO,
    episode: {
      episodeId: episodeId as unknown as EpisodeInfo['episodeId'],
      episodeNo: detail?.episodeNo ?? fallbackEpisode?.episodeNo ?? 1,
      title: detail?.title ?? fallbackEpisode?.title,
      coverUrl,
      ...(mediaAccessUrl
        ? {
            mediaAccessUrl,
            playbackType: detail?.playbackType ?? fallbackEpisode?.playbackType,
          }
        : {}),
      likeCount: detail?.likeCount ?? fallbackEpisode?.likeCount,
      commentCount: detail?.commentCount ?? fallbackEpisode?.commentCount,
      favoriteCount:
        detailWithFavorite?.favoriteCount ?? fallbackEpisode?.favoriteCount,
      description: detail?.description ?? fallbackEpisode?.description,
    },
    likedByMe: detail?.likedByMe ?? fallback?.likedByMe,
    favoritedByMe: detail?.favoritedByMe ?? fallback?.favoritedByMe,
    followedByMe: fallback?.followedByMe,
    creatorName: detail?.creatorName ?? fallback?.creatorName,
    creatorAvatarUrl: detail?.creatorAvatarUrl ?? fallback?.creatorAvatarUrl,
    userId: (detail?.creatorId ??
      fallback?.userId) as FeedItemResponse['userId'],
  };
}

function hasShortVideoPlayableMedia(
  detail: DramaPlayResponse | null | undefined,
): boolean {
  return Boolean(detail?.mediaAccessUrl?.trim() || detail?.videoUrl?.trim());
}

export function PlayShortVideoView({
  episodeId,
  items,
  activeIndex = 0,
  onActiveIndexChange,
  hasMore = false,
  onLoadMore,
  loop = false,
  initialSideTab,
}: PlayShortVideoViewProps) {
  const isMobileViewport = useMobileViewport();
  const episodeIdText = readSnowflakeId(episodeId);
  // RQ：无 data 的 error 查询在 refetch 时会清空 error 并回到 pending；用锁存避免整页卸挂闪烁
  const latchedTranscodingRef = useRef(false);
  const latchedFeedItemRef = useRef<FeedItemResponse | undefined>(undefined);
  const latchedEpisodeIdRef = useRef(episodeIdText);

  if (latchedEpisodeIdRef.current !== episodeIdText) {
    latchedEpisodeIdRef.current = episodeIdText;
    latchedTranscodingRef.current = false;
    latchedFeedItemRef.current = undefined;
  }
  const detailQuery = useQuery({
    queryKey: getPlayShortVideoDetailQueryKey(episodeIdText ?? ''),
    queryFn: async ({ signal }) => {
      const response = await getPlayShortVideoDetail(episodeIdText ?? '', {
        signal,
      });
      return normalizeDramaPlayResponse(
        unwrapOrvalPayload<DramaPlayResponse>(response) ?? undefined,
      );
    },
    enabled: episodeIdText !== undefined,
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  const detail = detailQuery.data;
  const playlistFeed = items?.[activeIndex]?.feed;
  const playableMediaReady = hasShortVideoPlayableMedia(detail);
  const isTranscodingNow =
    isPlayEpisodeNotTranscodedError(detailQuery.error) ||
    (detailQuery.isSuccess && detail !== undefined && !playableMediaReady);

  if (playableMediaReady) {
    latchedTranscodingRef.current = false;
  } else if (isTranscodingNow) {
    latchedTranscodingRef.current = true;
  }

  const isTranscodingPending =
    isTranscodingNow || latchedTranscodingRef.current;
  const nextFeedItem = episodeIdText
    ? mapShortVideoDetailToFeedItem(episodeIdText, detail, {
        allowWithoutMedia: isTranscodingPending,
        fallbackFeed: playlistFeed ?? latchedFeedItemRef.current,
      })
    : undefined;

  if (nextFeedItem) {
    latchedFeedItemRef.current = nextFeedItem;
  }

  // 轮询把 query 打回 pending 时仍沿用上一帧 stub，避免 Immersive 卸载
  const feedItem =
    nextFeedItem ??
    (isTranscodingPending ? latchedFeedItemRef.current : undefined);
  const isHardError =
    episodeIdText === undefined ||
    (detailQuery.isError && !isTranscodingPending) ||
    (detailQuery.isSuccess && !feedItem && !isTranscodingPending);
  // 首屏 pending；转码轮询中的 pending 不阻断沉浸壳
  const showBootLoading =
    !isTranscodingPending && (detailQuery.isPending || !feedItem);
  const resolvedItems: PlayImmersiveItem[] = items
    ? items.map((item, index) =>
        index === activeIndex && feedItem
          ? {
              ...item,
              dramaId: '',
              episodeNo: feedItem.episode?.episodeNo ?? 1,
              contentType: PlayFeedContentType.ShortVideo,
              episodeId: episodeIdText ?? item.episodeId,
              feed: feedItem,
            }
          : item,
      )
    : episodeIdText && feedItem
      ? [
          {
            dramaId: '',
            episodeNo: feedItem.episode?.episodeNo ?? 1,
            contentType: PlayFeedContentType.ShortVideo,
            episodeId: episodeIdText,
            feed: feedItem,
          },
        ]
      : [];

  function handleActiveIndexChange(index: number) {
    onActiveIndexChange?.(index);
  }

  useEffect(() => {
    if (!isTranscodingPending || episodeIdText === undefined) {
      return;
    }

    const timer = window.setInterval(() => {
      void detailQuery.refetch();
    }, SHORT_VIDEO_TRANSCODE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [detailQuery.refetch, episodeIdText, isTranscodingPending]);

  if (showBootLoading || isHardError || !feedItem || !episodeIdText) {
    return (
      <AppLoadingContainer
        data={feedItem ? [feedItem] : []}
        isLoading={showBootLoading}
        isError={isHardError}
        minHeight={480}
      >
        {null}
      </AppLoadingContainer>
    );
  }

  if (isMobileViewport) {
    return (
      <PlayWatchView
        dramaId=""
        feedItem={feedItem}
        initialEpisode={1}
        initialEpisodeId={episodeIdText}
        // 仅显式带 sideTab=comment 时展开（搜索等）；个人作品等入口不自动开评论
        initialCommentOpen={initialSideTab === PlayImmersiveSideTab.Comment}
        isMediaTranscodingPending={isTranscodingPending}
      />
    );
  }

  return (
    <PlayImmersiveView
      mode={PlayImmersiveMode.Drama}
      layoutVariant={PlayImmersiveLayoutVariant.Fullscreen}
      items={resolvedItems}
      activeIndex={activeIndex}
      onActiveIndexChange={handleActiveIndexChange}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      loop={loop}
      initialSideTab={initialSideTab}
      isMediaTranscodingPending={isTranscodingPending}
    />
  );
}
