import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import type { FeedResponse } from '@/api/__generated__/recommend/model/feedResponse';
import {
  feed,
  getFeedQueryKey,
  useDislike,
} from '@/api/__generated__/recommend/recommend-feed/recommend-feed';
import IconLoading2 from '@/assets/svg/IconLoading2';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { usePlayRequireLogin } from '@/features/play/hooks/usePlayRequireLogin';
import { PlayImmersiveView } from '@/features/play/PlayImmersiveView';
import { PlayWatchView } from '@/features/play/PlayWatchView';
import {
  getPlayFeedAuthScope,
  PLAY_FEED_AUTH_SCOPE_PENDING,
} from '@/features/play/playFeedAuthScope';
import { unwrapOrvalPayload } from '@/features/play/playFormat';
import { getFeedItemContentType } from '@/features/play/playRecommendFeed';
import { getRecommendReplacementAfterRemoval } from '@/features/play/playRecommendFeedPolicy';
import {
  clearPlayRecommendSession,
  type RecommendPlaybackSession,
  readPlayRecommendSession,
} from '@/features/play/playRecommendSessionStore';
import {
  PlayFeedContentType,
  type PlayImmersiveItem,
  PlayImmersiveLayoutVariant,
  PlayImmersiveMode,
} from '@/features/play/types/playImmersive';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import useGlobalStore from '@/stores/global';
import { cn, readSnowflakeId, withAcceptLanguageQueryKey } from '@/utils';

/** 与 Recommend Feed OpenAPI 默认 size 对齐；最大 50 */
const FEED_PAGE_SIZE = 10;

/** 当前已加载批次刷到第 5 条（1-based）时预取下一页 */
const FEED_PREFETCH_AT_COUNT = 5;

/** H5 首页推荐区高度：避开底栏（顶栏在 `/` 已隐藏） */
const MOBILE_FEED_ROOT_CLASS =
  'h-[calc(100dvh-var(--site-mobile-bottom-nav-height))] max-h-[calc(100dvh-var(--site-mobile-bottom-nav-height))]';

function DesktopFeedLoadingPlaceholder() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-points-page-surface-muted">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col p-3 md:p-4">
          <div
            className="flex flex-1 flex-col items-center justify-center rounded-xl bg-secondary"
            style={{ minHeight: 'calc(100dvh - 56px - 24px)' }}
          >
            <IconLoading2 className="size-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-[15px] leading-5.5 text-muted-foreground">
              {t('加载中')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildRecommendActiveKey(
  item?: Pick<PlayImmersiveItem, 'contentType' | 'dramaId' | 'episodeId'>,
): RecommendPlaybackSession['activeKey'] | undefined {
  if (!item?.episodeId) {
    return undefined;
  }

  return {
    contentType:
      item.contentType === PlayFeedContentType.ShortVideo
        ? PlayFeedContentType.ShortVideo
        : PlayFeedContentType.DramaEpisode,
    ...(item.dramaId ? { dramaId: item.dramaId } : {}),
    episodeId: item.episodeId,
  };
}

function isSameRecommendActiveKey(
  left?: RecommendPlaybackSession['activeKey'],
  right?: RecommendPlaybackSession['activeKey'],
): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.contentType === right.contentType &&
    left.dramaId === right.dramaId &&
    left.episodeId === right.episodeId
  );
}

function buildRecommendIdentityKey(
  item?: Pick<PlayImmersiveItem, 'contentType' | 'dramaId' | 'episodeId'>,
): string | undefined {
  const activeKey = buildRecommendActiveKey(item);
  if (!activeKey) {
    return undefined;
  }

  return `${activeKey.contentType}:${activeKey.dramaId ?? ''}:${activeKey.episodeId}`;
}

function flattenFeedItems(
  pages: Awaited<ReturnType<typeof feed>>[],
): FeedItemResponse[] {
  const out: FeedItemResponse[] = [];
  for (const page of pages) {
    const pageData = unwrapOrvalPayload<FeedResponse>(page);
    for (const item of pageData?.items ?? []) {
      out.push(item);
    }
  }
  return out;
}

/** Recommend Feed 使用 cursor/hasMore，与短剧 mark 分页不同 */
function getRecommendFeedNextPageParam(
  lastPage: Awaited<ReturnType<typeof feed>>,
): string | undefined {
  const pageData = unwrapOrvalPayload<FeedResponse>(lastPage);
  if (!pageData?.hasMore) {
    return undefined;
  }
  if (pageData.cursor === undefined || pageData.cursor === null) {
    return undefined;
  }
  return String(pageData.cursor);
}

function toPlayImmersiveItem(
  item: FeedItemResponse,
): PlayImmersiveItem | undefined {
  const episodeId = readSnowflakeId(item.episode?.episodeId);
  const dramaId = readSnowflakeId(item.drama?.dramaId);
  const contentType = getFeedItemContentType(item);
  const isShortVideo = contentType === PlayFeedContentType.ShortVideo;

  // 短视频可无 dramaId；短剧必须有 dramaId
  if (isShortVideo) {
    if (!episodeId) {
      return undefined;
    }

    return {
      dramaId: dramaId ?? '',
      episodeNo: item.episode?.episodeNo,
      contentType,
      episodeId,
      feed: item,
    };
  }

  if (!dramaId) {
    return undefined;
  }

  return {
    dramaId,
    episodeNo: item.episode?.episodeNo,
    contentType,
    episodeId,
    feed: item,
  };
}

/**
 * 推荐 Feed：GET /api/recommend/feed + POST /api/recommend/dislike/{videoId}。
 * 桌面：公共沉浸播放器；H5：PlayWatchView + 上下滑切条。
 */
export function PlayRecommendView() {
  const { t, i18n } = useTranslation();
  const { requireLogin } = usePlayRequireLogin();
  const isMobileViewport = useMobileViewport();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userId = useGlobalStore((state) => state.userProfile?.userId);
  const authScope = getPlayFeedAuthScope(isLogin, userId);
  const recommendSessionScope = useMemo(
    () => ({ auth: authScope, language: i18n.language }),
    [authScope, i18n.language],
  );
  const dislikeMutation = useDislike();
  const restoreLanguageRef = useRef(i18n.language);
  const authScopeRef = useRef(authScope);

  const [activeItemKey, setActiveItemKey] = useState<string>();
  const [pendingAdvanceAfterLoad, setPendingAdvanceAfterLoad] = useState(false);
  const [hasResolvedPlaybackRestore, setHasResolvedPlaybackRestore] =
    useState(false);
  const [skippedEpisodeIds, setSkippedEpisodeIds] = useState(
    () => new Set<string>(),
  );
  const feedQueryKey = withAcceptLanguageQueryKey(
    [...getFeedQueryKey({ size: FEED_PAGE_SIZE }), authScope] as const,
    i18n.language,
  );

  const listQuery = useInfiniteQuery({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam }) =>
      feed({
        size: FEED_PAGE_SIZE,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getRecommendFeedNextPageParam,
    maxPages: 10,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: authScope !== PLAY_FEED_AUTH_SCOPE_PENDING,
  });

  const feedItems = useMemo(() => {
    const raw = flattenFeedItems(listQuery.data?.pages ?? []);
    const out: PlayImmersiveItem[] = [];

    for (const item of raw) {
      const mapped = toPlayImmersiveItem(item);
      if (!mapped) {
        continue;
      }

      if (mapped.episodeId && skippedEpisodeIds.has(mapped.episodeId)) {
        continue;
      }

      out.push(mapped);
    }

    return out;
  }, [listQuery.data?.pages, skippedEpisodeIds]);

  const feedIndex = useMemo(() => {
    if (!activeItemKey) {
      return 0;
    }

    const matchedIndex = feedItems.findIndex(
      (item) => buildRecommendIdentityKey(item) === activeItemKey,
    );

    return matchedIndex >= 0 ? matchedIndex : 0;
  }, [activeItemKey, feedItems]);
  const currentItem = feedItems[feedIndex];
  const currentItemKey = currentItem
    ? buildRecommendIdentityKey(currentItem)
    : undefined;

  useEffect(() => {
    if (restoreLanguageRef.current === i18n.language) {
      return;
    }

    restoreLanguageRef.current = i18n.language;
    clearPlayRecommendSession();
    setHasResolvedPlaybackRestore(false);
    setActiveItemKey(undefined);
    setPendingAdvanceAfterLoad(false);
    setSkippedEpisodeIds(new Set());
  }, [i18n.language]);

  useEffect(() => {
    if (authScopeRef.current === authScope) {
      return;
    }

    authScopeRef.current = authScope;
    clearPlayRecommendSession();
    setHasResolvedPlaybackRestore(false);
    setActiveItemKey(undefined);
    setPendingAdvanceAfterLoad(false);
    setSkippedEpisodeIds(new Set());
  }, [authScope]);

  useEffect(() => {
    // 登录/退出会换 authScope 并清空当前 feed 缓存；空列表时不能回退到 feedItems[0]
    if (
      !hasResolvedPlaybackRestore ||
      currentItemKey !== undefined ||
      feedItems.length === 0
    ) {
      return;
    }

    setActiveItemKey(buildRecommendIdentityKey(feedItems[0]));
  }, [currentItemKey, feedItems, hasResolvedPlaybackRestore]);

  useEffect(() => {
    if (
      hasResolvedPlaybackRestore ||
      listQuery.isPending ||
      feedItems.length === 0
    ) {
      return;
    }

    const savedSession = readPlayRecommendSession(recommendSessionScope);
    if (!savedSession) {
      setHasResolvedPlaybackRestore(true);
      return;
    }

    const restoredIndex = feedItems.findIndex((item) =>
      isSameRecommendActiveKey(
        savedSession.activeKey,
        buildRecommendActiveKey(item),
      ),
    );

    if (restoredIndex >= 0) {
      setActiveItemKey(buildRecommendIdentityKey(feedItems[restoredIndex]));
    } else {
      clearPlayRecommendSession();
      setActiveItemKey(buildRecommendIdentityKey(feedItems[0]));
    }

    setHasResolvedPlaybackRestore(true);
  }, [
    feedItems,
    hasResolvedPlaybackRestore,
    listQuery.isPending,
    recommendSessionScope,
  ]);

  // 点末条下一条时先记下“待推进一条”，等下一页 items 到齐后再按当前 identity 推导下标
  useEffect(() => {
    if (!pendingAdvanceAfterLoad || !currentItemKey) {
      return;
    }

    if (feedIndex < feedItems.length - 1) {
      setActiveItemKey(buildRecommendIdentityKey(feedItems[feedIndex + 1]));
      setPendingAdvanceAfterLoad(false);
      return;
    }

    if (!listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
      setPendingAdvanceAfterLoad(false);
    }
  }, [
    currentItemKey,
    feedIndex,
    feedItems,
    feedItems.length,
    listQuery.hasNextPage,
    listQuery.isFetchingNextPage,
    pendingAdvanceAfterLoad,
  ]);

  // 刷到当前批次第 5 条即预取下一页，桌面 / H5 共用，避免滑到末尾才发请求
  useEffect(() => {
    if (!listQuery.hasNextPage || listQuery.isFetchingNextPage) {
      return;
    }

    if (
      feedIndex <
      feedItems.length - (FEED_PAGE_SIZE - FEED_PREFETCH_AT_COUNT + 1)
    ) {
      return;
    }

    void listQuery.fetchNextPage();
  }, [
    feedIndex,
    feedItems.length,
    listQuery.fetchNextPage,
    listQuery.hasNextPage,
    listQuery.isFetchingNextPage,
  ]);

  // GET /api/recommend/feed 下一页（cursor 原样透传）
  const handleLoadMore = () => {
    if (!listQuery.hasNextPage || listQuery.isFetchingNextPage) {
      return;
    }

    void listQuery.fetchNextPage();
  };

  // 推荐 Feed 翻到指定下标；越界时拉下一页后再跳
  const handleActiveIndexChange = (index: number) => {
    if (index < feedItems.length) {
      setActiveItemKey(buildRecommendIdentityKey(feedItems[index]));
      setPendingAdvanceAfterLoad(false);
      return;
    }

    setPendingAdvanceAfterLoad(true);
    handleLoadMore();
  };

  // 不感兴趣：登录后 POST dislike(episodeId)，本地跳过当前项并切到相邻条。
  // 不失效 feed 缓存，否则无限列表会从第一页整表拉新，当前项落到新数据第一条。
  const handleNotInterested = () => {
    if (!requireLogin()) {
      return;
    }

    const videoId = currentItem?.episodeId;
    if (!videoId) {
      toast.error(t('再试一次'));
      return;
    }

    if (dislikeMutation.isPending) {
      return;
    }

    const dislikedItemKey = currentItemKey;
    const replacementItem = getRecommendReplacementAfterRemoval(
      feedItems,
      feedIndex,
    );
    const replacementItemKey = replacementItem
      ? buildRecommendIdentityKey(replacementItem)
      : undefined;

    dislikeMutation.mutate(
      { videoId },
      {
        onSuccess: () => {
          toast.success(t('已反馈，将减少此类内容推荐'));
          setActiveItemKey((activeKey) =>
            activeKey === dislikedItemKey ? replacementItemKey : activeKey,
          );
          setSkippedEpisodeIds((prev) => {
            const next = new Set(prev);
            next.add(videoId);
            return next;
          });
        },
      },
    );
  };

  // H5：切上一条
  const handleFeedPrev = () => {
    if (feedIndex <= 0) {
      return;
    }

    handleActiveIndexChange(feedIndex - 1);
  };

  // H5：切下一条（末条触发翻页）
  const handleFeedNext = () => {
    handleActiveIndexChange(feedIndex + 1);
  };

  const isRecommendLoading =
    listQuery.isPending ||
    !hasResolvedPlaybackRestore ||
    authScope === PLAY_FEED_AUTH_SCOPE_PENDING;

  if (isRecommendLoading) {
    if (isMobileViewport) {
      return (
        <div className={cn('w-full overflow-hidden bg-black')}>
          <div
            className={cn(
              'flex w-full items-center justify-center bg-black',
              MOBILE_FEED_ROOT_CLASS,
            )}
          >
            <div className="flex flex-col items-center gap-3">
              <IconLoading2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-[15px] leading-5.5 text-muted-foreground">
                {t('加载中')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return <DesktopFeedLoadingPlaceholder />;
  }

  if (listQuery.isError || feedItems.length === 0) {
    return (
      <AppLoadingContainer
        data={feedItems}
        isLoading={false}
        isError={listQuery.isError}
        minHeight={isMobileViewport ? 360 : 480}
        emptyDescription={t('暂无短剧')}
      >
        {null}
      </AppLoadingContainer>
    );
  }

  if (isMobileViewport && currentItem?.feed) {
    return (
      <div className={cn('w-full overflow-hidden bg-black')}>
        <PlayWatchView
          key={
            currentItem.episodeId ??
            `${currentItem.dramaId}:${currentItem.episodeNo ?? 0}`
          }
          dramaId={currentItem.dramaId}
          feedItem={currentItem.feed}
          initialEpisode={currentItem.episodeNo}
          initialEpisodeId={currentItem.episodeId}
          rootClassName={MOBILE_FEED_ROOT_CLASS}
          recommendSessionScope={recommendSessionScope}
          feedMode={{
            canPrev: feedIndex > 0,
            canNext:
              feedIndex < feedItems.length - 1 || !!listQuery.hasNextPage,
            onPrev: handleFeedPrev,
            onNext: handleFeedNext,
            onNotInterested: handleNotInterested,
          }}
        />
      </div>
    );
  }

  return (
    <PlayImmersiveView
      mode={PlayImmersiveMode.Feed}
      layoutVariant={PlayImmersiveLayoutVariant.Embedded}
      items={feedItems}
      activeIndex={feedIndex}
      onActiveIndexChange={handleActiveIndexChange}
      hasMore={!!listQuery.hasNextPage}
      onLoadMore={handleLoadMore}
      onNotInterested={handleNotInterested}
      recommendSessionScope={recommendSessionScope}
    />
  );
}
