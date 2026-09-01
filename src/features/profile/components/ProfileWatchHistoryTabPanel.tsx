import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import { FeedItemResponseType } from '@/api/__generated__/recommend/model/feedItemResponseType';
import type { PageDtoWatchHistoryDramaItemResponse } from '@/api/__generated__/story/model/pageDtoWatchHistoryDramaItemResponse';
import type { PageDtoWatchHistoryVideoItemResponse } from '@/api/__generated__/story/model/pageDtoWatchHistoryVideoItemResponse';
import type { WatchHistoryDramaItemResponse } from '@/api/__generated__/story/model/watchHistoryDramaItemResponse';
import type { WatchHistoryVideoItemResponse } from '@/api/__generated__/story/model/watchHistoryVideoItemResponse';
import {
  listDramas1,
  listVideos,
} from '@/api/__generated__/story/watch-history/watch-history';
import IconNoData from '@/assets/svg/IconNoData';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import {
  PLAY_THEATER_CARD_ROW_MIN_HEIGHT_PX,
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/play/playFormat';
import { getPlayPlaylistNavigateSearch } from '@/features/play/playPlaylistNavigate';
import { usePlayPlaylistStore } from '@/features/play/playPlaylistStore';
import {
  PlayFeedContentType,
  type PlayImmersiveItem,
  PlayPlaylistSource,
} from '@/features/play/types/playImmersive';
import { cn, readSnowflakeId } from '@/utils';

export type ProfileHistoryType = 'SHORT_DRAMA' | 'SHORT_VIDEO';

type ProfileWatchHistoryTabPanelProps = {
  enabled: boolean;
  historyType: ProfileHistoryType;
};

const WATCH_HISTORY_PAGE_SIZE = 20;

type WatchHistoryDramaFeedExtras = WatchHistoryDramaItemResponse & {
  followedByMe?: boolean;
  userId?: number | string;
  creatorUserId?: number | string;
  creatorName?: string;
  creatorAvatarUrl?: string;
};

function mapWatchHistoryDramaToFeedItem(
  item: WatchHistoryDramaItemResponse,
): FeedItemResponse {
  const extended = item as WatchHistoryDramaFeedExtras;

  return {
    userId: (extended.userId ??
      extended.creatorUserId) as FeedItemResponse['userId'],
    creatorName: extended.creatorName,
    creatorAvatarUrl: extended.creatorAvatarUrl,
    followedByMe: extended.followedByMe,
    type: FeedItemResponseType.DRAMA_EPISODE,
    drama: {
      dramaId: item.dramaId,
      title: item.dramaTitle,
      coverUrl: item.dramaCoverUrl,
      totalEpisodes: item.totalEpisodes,
      badge: item.badge as NonNullable<FeedItemResponse['drama']>['badge'],
    },
    episode: {
      episodeId: item.lastEpisodeId,
      episodeNo: item.lastEpisodeNo,
      title: item.dramaTitle,
      coverUrl: item.dramaCoverUrl,
    },
  };
}

function buildWatchHistoryDramaPlaylist(
  items: WatchHistoryDramaItemResponse[],
): PlayImmersiveItem[] {
  const playlist: PlayImmersiveItem[] = [];

  for (const item of items) {
    const dramaId = readSnowflakeId(item.dramaId);
    if (!dramaId) {
      continue;
    }

    playlist.push({
      dramaId,
      episodeId: readSnowflakeId(item.lastEpisodeId),
      episodeNo: item.lastEpisodeNo,
      contentType: PlayFeedContentType.DramaEpisode,
      feed: mapWatchHistoryDramaToFeedItem(item),
    });
  }

  return playlist;
}

export function ProfileWatchHistoryTabPanel({
  enabled,
  historyType,
}: ProfileWatchHistoryTabPanelProps) {
  const { t } = useTranslation();
  const { ref, inView } = useInView();
  const setPlaylist = usePlayPlaylistStore((state) => state.setPlaylist);

  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      'profile',
      'watch-history',
      historyType,
      WATCH_HISTORY_PAGE_SIZE,
    ],
    queryFn: ({ pageParam }) => {
      const params = {
        mark: pageParam as string | undefined,
        pageSize: WATCH_HISTORY_PAGE_SIZE,
      };
      return historyType === 'SHORT_DRAMA'
        ? listDramas1(params)
        : listVideos(params);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const pageData =
        historyType === 'SHORT_DRAMA'
          ? unwrapOrvalPayload<PageDtoWatchHistoryDramaItemResponse>(lastPage)
          : unwrapOrvalPayload<PageDtoWatchHistoryVideoItemResponse>(lastPage);
      if (!pageData?.hasMore) {
        return undefined;
      }
      if (!pageData.mark || pageData.mark === '-1') {
        return undefined;
      }
      return pageData.mark;
    },
    retry: false,
    enabled,
  });

  const dramaItems = useMemo(() => {
    if (historyType !== 'SHORT_DRAMA' || !data?.pages?.length) {
      return [] as WatchHistoryDramaItemResponse[];
    }

    const out: WatchHistoryDramaItemResponse[] = [];
    for (const page of data.pages) {
      const pageData =
        unwrapOrvalPayload<PageDtoWatchHistoryDramaItemResponse>(page);
      for (const item of pageData?.list ?? []) {
        out.push(item);
      }
    }
    return out;
  }, [data?.pages, historyType]);

  const videoItems = useMemo(() => {
    if (historyType !== 'SHORT_VIDEO' || !data?.pages?.length) {
      return [] as WatchHistoryVideoItemResponse[];
    }

    const out: WatchHistoryVideoItemResponse[] = [];
    for (const page of data.pages) {
      const pageData =
        unwrapOrvalPayload<PageDtoWatchHistoryVideoItemResponse>(page);
      out.push(...(pageData?.list ?? []));
    }
    return out;
  }, [data?.pages, historyType]);

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 触发条件：观看历史短剧卡片进入播放页
  // 行为目的：把历史接口返回的 followedByMe 带给播放器关注按钮
  function handleHistoryDramaBeforePlay() {
    setPlaylist(
      PlayPlaylistSource.History,
      buildWatchHistoryDramaPlaylist(dramaItems),
      {
        hasMore: Boolean(hasNextPage),
        loadMore: async () => {
          const result = await fetchNextPage();
          const nextItems: WatchHistoryDramaItemResponse[] = [];
          for (const page of result.data?.pages ?? []) {
            const pageData =
              unwrapOrvalPayload<PageDtoWatchHistoryDramaItemResponse>(page);
            nextItems.push(...(pageData?.list ?? []));
          }

          return {
            items: buildWatchHistoryDramaPlaylist(nextItems),
            hasMore: Boolean(result.hasNextPage),
          };
        },
      },
    );
  }

  if (isError) {
    return (
      <div className={cn('flex flex-col items-center gap-4 py-12')}>
        <p className={cn('text-sm text-muted-foreground')}>{t('再试一次')}</p>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          {t('再试一次')}
        </Button>
      </div>
    );
  }

  return (
    <AppLoadingContainer
      data={historyType === 'SHORT_DRAMA' ? dramaItems : videoItems}
      isLoading={isPending}
      // 与创作管理列表一致：加载 / 空态固定一行卡片高度
      minHeight={PLAY_THEATER_CARD_ROW_MIN_HEIGHT_PX}
      scrollable={false}
      // Loading 无卡片底；空态保留 bg-card
      stateClassName={isPending ? undefined : 'gap-6 rounded-xl bg-card px-10'}
      emptyContent={<WatchHistoryEmptyState />}
    >
      {historyType === 'SHORT_DRAMA' ? (
        <ul
          className={cn(
            PLAY_THEATER_GRID_VIEW_CLASS,
            PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
          )}
        >
          {dramaItems.map((item) => (
            <li key={`${item.dramaId ?? item.dramaTitle ?? 'history-drama'}`}>
              <WatchHistoryDramaCard
                item={item}
                onBeforePlay={handleHistoryDramaBeforePlay}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul
          className={cn(
            PLAY_THEATER_GRID_VIEW_CLASS,
            PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
          )}
        >
          {videoItems.map((item) => (
            <li
              key={`${item.episodeId ?? item.dramaId ?? item.title ?? 'history-video'}`}
            >
              <WatchHistoryVideoCard item={item} />
            </li>
          ))}
        </ul>
      )}
      {hasNextPage ? (
        <div
          ref={ref}
          className={cn('flex justify-center py-6')}
          aria-hidden={!isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <Spinner className="size-6 text-muted-foreground" />
          ) : null}
        </div>
      ) : null}
    </AppLoadingContainer>
  );
}

function WatchHistoryEmptyState() {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex w-52 max-w-full flex-col items-center gap-4">
        <IconNoData className="size-22 shrink-0" />
        <p className="min-w-full text-center text-sm leading-5 font-normal text-muted-foreground">
          {t('暂无相关内容')}
        </p>
      </div>
      <Button
        className={cn(
          'h-auto rounded-xl px-8 py-2.5 text-sm leading-5 font-normal',
          'bg-foreground text-background hover:bg-foreground/90 hover:text-background',
        )}
        render={<Link to="/play" />}
      >
        {t('去看看')}
      </Button>
    </>
  );
}

function WatchHistoryVideoCard({
  item,
}: {
  item: WatchHistoryVideoItemResponse;
}) {
  const { t } = useTranslation();
  const description = item.description?.trim();
  const title = item.title?.trim();
  const isShortVideo = item.contentType === 'SHORT_VIDEO';
  const episodeId = readSnowflakeId(item.episodeId);
  const dramaId = readSnowflakeId(item.dramaId);

  // 短视频以 episodeId 进播；短剧分集以 dramaId 进播并带上集数
  const playPathId = isShortVideo ? episodeId : dramaId;

  // 独立短视频无分集语义，不展示右下角集数
  const episodeLabel =
    !isShortVideo && item.episodeNo !== undefined
      ? t('第{{n}}集', { n: item.episodeNo })
      : undefined;

  const card = (
    <article
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-[10px]',
        'border border-border/70 bg-card text-card-foreground',
      )}
    >
      <div className="relative aspect-232/310 w-full overflow-hidden">
        {item.coverUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            height={620}
            loading="lazy"
            src={item.coverUrl}
            width={464}
          />
        ) : (
          <div className="size-full bg-muted" />
        )}
        {episodeLabel ? (
          <span
            className={cn(
              'pointer-events-none absolute right-2 bottom-2',
              'rounded-md bg-black/55 px-2 py-1 text-xs leading-4 text-white',
            )}
          >
            {episodeLabel}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 items-start p-3">
        <p className="line-clamp-1 text-sm leading-5 text-muted-foreground">
          {description || ''}
        </p>
      </div>
    </article>
  );

  if (!playPathId || (isShortVideo && !episodeId)) {
    return card;
  }

  return (
    <Link
      to="/play/$dramaId"
      params={{ dramaId: playPathId }}
      search={{
        ...getPlayPlaylistNavigateSearch({
          dramaId: playPathId,
          episodeId,
          episodeNo: item.episodeNo,
          contentType: isShortVideo
            ? PlayFeedContentType.ShortVideo
            : undefined,
        }),
        autoplay: 1,
        commentId: undefined,
        sideTab: undefined,
      }}
      className="block h-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={title || description || undefined}
    >
      {card}
    </Link>
  );
}

function WatchHistoryDramaCard({
  item,
  onBeforePlay,
}: {
  item: WatchHistoryDramaItemResponse;
  onBeforePlay?: () => void;
}) {
  const { t } = useTranslation();
  const dramaId = readSnowflakeId(item.dramaId) ?? '';
  const lastEpisodeId = readSnowflakeId(item.lastEpisodeId);

  const title = item.dramaTitle?.trim() ?? '';
  const totalEpisodes = item.totalEpisodes;
  const lastEpisodeNo = item.lastEpisodeNo;

  const metaLabel =
    lastEpisodeNo !== undefined && totalEpisodes !== undefined
      ? t('{{current}}/{{total}}集', {
          current: lastEpisodeNo,
          total: totalEpisodes,
        })
      : totalEpisodes !== undefined
        ? t('{{count}}集', { count: totalEpisodes })
        : undefined;

  if (!dramaId) {
    return null;
  }

  // 续看：跳转到最近观看集并自动播放
  const playSearch = {
    ...getPlayPlaylistNavigateSearch({
      dramaId,
      episodeId: lastEpisodeId,
      episodeNo: lastEpisodeNo,
    }),
    autoplay: 1,
    commentId: undefined,
    sideTab: undefined,
  };

  return (
    <article
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden rounded-[10px]',
        'border-[0.3px] border-theater-drama-card-border bg-theater-drama-card-surface text-card-foreground',
      )}
    >
      <div className="relative aspect-232/310 w-full overflow-hidden">
        {item.dramaCoverUrl ? (
          <img
            alt=""
            className={cn(
              'absolute top-1/2 left-1/2 size-full max-w-none -translate-x-1/2 -translate-y-1/2 object-cover',
              'transition-[width,height] duration-300 ease-out group-hover:size-[calc(100%+16px)]',
            )}
            decoding="async"
            height={620}
            loading="lazy"
            src={item.dramaCoverUrl}
            width={464}
          />
        ) : (
          <div className="size-full bg-muted" />
        )}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-black/60"
          aria-hidden
        />

        {/* badge corner: 本场景仅移除左下角 icon/统计文案；角标样式后续如需可再按具体稿面复用现有 ContentBadge。 */}

        {/* 覆盖层移除：这里不再渲染左下角 icon/统计文案 */}
        <Link
          to="/play/$dramaId"
          params={{ dramaId }}
          search={playSearch}
          onClick={onBeforePlay}
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="sr-only">{title}</span>
        </Link>
      </div>

      <Link
        to="/play/$dramaId"
        params={{ dramaId }}
        search={playSearch}
        onClick={onBeforePlay}
        className="flex min-w-0 flex-col no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex min-w-0 flex-col gap-2 p-3">
          {title ? (
            <h2
              className="w-full truncate text-base leading-6 font-[510] text-foreground"
              title={title}
            >
              {title}
            </h2>
          ) : null}

          <div className="flex min-w-0 items-start justify-between gap-2">
            {metaLabel ? (
              <span className="min-w-0 truncate text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                {metaLabel}
              </span>
            ) : (
              <span />
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
