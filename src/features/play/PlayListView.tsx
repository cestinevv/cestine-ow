import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import type { DramaTagItemResponse } from '@/api/__generated__/story/model/dramaTagItemResponse';
import { ListPublicDramasSort } from '@/api/__generated__/story/model/listPublicDramasSort';
import type { PageDtoDramaListItemResponse } from '@/api/__generated__/story/model/pageDtoDramaListItemResponse';
import {
  getListPublicDramasQueryKey,
  getListPublicTagsQueryKey,
  listPublicDramas,
  useListPublicTags,
} from '@/api/__generated__/story/public-drama/public-drama';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { BackToTop } from '@/components/common/BackToTop';
import { ContentContainer } from '@/components/common/ContentContainer';
import { getStickyContentToolbarTopPx } from '@/components/common/StickyContentToolbar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PlayDramaCard } from '@/features/play/components/PlayDramaCard';
import { PlayDramaGridCard } from '@/features/play/components/PlayDramaGridCard';
import { PlayTheaterBannerSection } from '@/features/play/components/PlayTheaterBannerSection';
import { PlayTheaterBannerSkeleton } from '@/features/play/components/PlayTheaterBannerSkeleton';
import { PlayTheaterDramaListSkeleton } from '@/features/play/components/PlayTheaterDramaListSkeleton';
import { PlayTheaterListToolbar } from '@/features/play/components/PlayTheaterListToolbar';
import { PlayTheaterListToolbarSkeleton } from '@/features/play/components/PlayTheaterListToolbarSkeleton';
import {
  PlayTheaterViewMode,
  readStoredPlayTheaterViewMode,
  storePlayTheaterViewMode,
} from '@/features/play/constants/playTheaterViewMode';
import { useTheaterBannerEnrichment } from '@/features/play/hooks/useTheaterBannerEnrichment';
import { useTheaterBannerItems } from '@/features/play/hooks/useTheaterBannerItems';
import {
  getPlayCursorNextPageParam,
  getPlayDramaActorNames,
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
  PLAY_THEATER_LIST_GRID_CLASS,
  unwrapOrvalPayload,
} from '@/features/play/playFormat';
import { usePlayPlaylistStore } from '@/features/play/playPlaylistStore';
import {
  readPlayTheaterSession,
  writePlayTheaterSession,
} from '@/features/play/playTheaterSession';
import type { PlayTheaterBannerItem } from '@/features/play/types/playTheaterBannerItem';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { subscribeSiteHomeListRefresh } from '@/routing/siteHomeListRefresh';
import { cn, withAcceptLanguageQueryKey } from '@/utils';

const PLAY_LIST_PAGE_SIZE = 20;
const PLAY_BANNER_FEATURED_COUNT = 10;

function isHlsPreviewUrl(url?: string): boolean {
  return /\.m3u8(?:$|[?#])/i.test(url?.trim() ?? '');
}

// Figma 14:7238 / 119:117989 — 最热 → 完播 → 最新 → 最高收藏
const SORT_OPTIONS = [
  { value: ListPublicDramasSort.hot, labelKey: '最高热度' },
  { value: ListPublicDramasSort.completed_view, labelKey: '最高完播' },
  { value: ListPublicDramasSort.latest, labelKey: '最新上架' },
  { value: ListPublicDramasSort.favorite, labelKey: '最高收藏' },
] as const;

function getDramaList(items: Awaited<ReturnType<typeof listPublicDramas>>[]) {
  const out: DramaListItemResponse[] = [];
  for (const page of items) {
    const pageData = unwrapOrvalPayload<PageDtoDramaListItemResponse>(page);
    const list = pageData?.list ?? [];
    for (const item of list) {
      out.push(item);
    }
  }
  return out;
}

function getTags(data: { data?: unknown } | undefined) {
  return unwrapOrvalPayload<DramaTagItemResponse[]>(data) ?? [];
}

function mapListItemToFallbackBannerItem(
  item: DramaListItemResponse,
  index: number,
): PlayTheaterBannerItem | null {
  const dramaId = item.dramaId !== undefined ? String(item.dramaId) : undefined;
  const title = item.dramaTitle?.trim();
  const bannerUrl = item.dramaCoverUrl?.trim();

  if (!dramaId || !title || !bannerUrl) {
    return null;
  }

  return {
    dramaId,
    title,
    description: item.dramaDescription,
    badge: item.badge,
    bannerUrl,
    thumbUrl: bannerUrl,
    tags: item.tags,
    totalEpisodes: item.totalEpisodes,
    creatorName: item.creatorName,
    totalPlayCount: item.totalCompletedViewCount ?? item.totalPlayCount,
    totalHeatValue: item.totalHeatValue,
    avgRating: item.avgRating,
    actorCollections: item.actorCollections,
    sortOrder: index,
  };
}

export function PlayListView() {
  const { t, i18n } = useTranslation();
  const { ref, inView } = useInView();
  const queryClient = useQueryClient();
  const initialSession = readPlayTheaterSession();
  const hasRestoredScrollRef = useRef(false);
  /** 筛选 + 列表区块：切筛选时内容区回顶对齐到此 */
  const filtersListBlockRef = useRef<HTMLDivElement>(null);
  /** 列表区容器：切筛选时锁住高度，避免骨架替换导致筛选条位置跳动 */
  const listAreaRef = useRef<HTMLDivElement>(null);
  const [listAreaMinHeight, setListAreaMinHeight] = useState(0);

  const clearPlaylist = usePlayPlaylistStore((state) => state.clearPlaylist);
  const isMobile = useMobileViewport();

  const [activeBannerIndex, setActiveBannerIndex] = useState(
    () => initialSession.activeBannerIndex ?? 0,
  );
  const [bannerMuted, setBannerMuted] = useState(true);
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>(
    () => initialSession.selectedTagId,
  );
  const [selectedSort, setSelectedSort] = useState<ListPublicDramasSort>(
    () => initialSession.selectedSort ?? ListPublicDramasSort.hot,
  );
  const [viewMode, setViewMode] = useState<PlayTheaterViewMode>(
    readStoredPlayTheaterViewMode,
  );
  const [searchDraft, setSearchDraft] = useState(
    () => initialSession.searchDraft ?? '',
  );
  const [searchKeyword, setSearchKeyword] = useState<string | undefined>(
    () => initialSession.searchKeyword,
  );
  // 首屏整区 loading 只出现一次；之后切标签/排序只刷列表区
  const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(
    () => initialSession.hasCompletedInitialLoad ?? false,
  );

  useEffect(() => {
    const trimmed = searchDraft.trim();
    const timer = window.setTimeout(() => {
      setSearchKeyword(trimmed.length > 0 ? trimmed : undefined);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const listQueryParams = useMemo(
    () => ({
      pageSize: PLAY_LIST_PAGE_SIZE,
      sort: selectedSort,
      ...(selectedTagId !== undefined ? { tagId: selectedTagId } : {}),
    }),
    [selectedSort, selectedTagId],
  );

  const tagsQuery = useListPublicTags({
    query: {
      retry: false,
      queryKey: withAcceptLanguageQueryKey(
        getListPublicTagsQueryKey(),
        i18n.language,
      ),
    },
  });

  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: withAcceptLanguageQueryKey(
      getListPublicDramasQueryKey(listQueryParams),
      i18n.language,
    ),
    queryFn: ({ pageParam }) =>
      listPublicDramas({
        ...listQueryParams,
        mark: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getPlayCursorNextPageParam,
    retry: false,
  });

  const listItems = useMemo(() => {
    return data?.pages?.length ? getDramaList(data.pages) : [];
  }, [data?.pages]);

  const tags = useMemo(() => getTags(tagsQuery.data), [tagsQuery.data]);

  // 仅首次进入页面：标签或列表未就绪时冻结 Banner 重网络
  const isInitialSectionLoading =
    !hasCompletedInitialLoad && (tagsQuery.isPending || isPending);

  useEffect(() => {
    if (hasCompletedInitialLoad || tagsQuery.isPending || isPending) {
      return;
    }

    setHasCompletedInitialLoad(true);
  }, [hasCompletedInitialLoad, tagsQuery.isPending, isPending]);

  // 列表加载结束后解除高度锁定
  useEffect(() => {
    if (isPending || listAreaMinHeight <= 0) {
      return;
    }

    setListAreaMinHeight(0);
  }, [isPending, listAreaMinHeight]);

  useEffect(() => {
    writePlayTheaterSession({
      selectedTagId,
      selectedSort,
      searchDraft,
      searchKeyword,
      activeBannerIndex,
      hasCompletedInitialLoad,
    });
  }, [
    activeBannerIndex,
    hasCompletedInitialLoad,
    searchDraft,
    searchKeyword,
    selectedSort,
    selectedTagId,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      writePlayTheaterSession({ scrollY: window.scrollY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 硬刷新：清 scrollY，保留筛选；与同页再点刷新口径一致（RQ 缓存本身会丢）
  useEffect(() => {
    const clearScrollYOnUnload = () => {
      writePlayTheaterSession({ scrollY: 0 });
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        return;
      }

      clearScrollYOnUnload();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', clearScrollYOnUnload);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', clearScrollYOnUnload);
    };
  }, []);

  // 侧栏同页再点「短剧」：保留筛选，回顶并从第 1 页重拉
  useEffect(() => {
    return subscribeSiteHomeListRefresh('/play', () => {
      queryClient.removeQueries({
        queryKey: getListPublicDramasQueryKey(),
        exact: false,
      });
      hasRestoredScrollRef.current = true;
      writePlayTheaterSession({ scrollY: 0 });
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [queryClient]);

  useEffect(() => {
    if (hasRestoredScrollRef.current || isPending || listItems.length === 0) {
      return;
    }

    const savedScrollY = readPlayTheaterSession().scrollY;
    if (typeof savedScrollY !== 'number' || savedScrollY <= 0) {
      return;
    }

    hasRestoredScrollRef.current = true;
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollY, behavior: 'auto' });
    });
  }, [isPending, listItems.length]);

  const { featuredBannerItems, isBannerEnabled, isBannerExplicitlyDisabled } =
    useTheaterBannerItems(PLAY_BANNER_FEATURED_COUNT);

  const fallbackBannerItems = useMemo(
    () =>
      listItems
        .map(mapListItemToFallbackBannerItem)
        .filter((item): item is PlayTheaterBannerItem => item !== null)
        .slice(0, PLAY_BANNER_FEATURED_COUNT),
    [listItems],
  );

  const bannerSourceItems =
    featuredBannerItems.length > 0 ? featuredBannerItems : fallbackBannerItems;

  // 列表区未就绪时不传入 list、不打 drama detail，Banner 与下方请求完全并行
  const { enrichedItems } = useTheaterBannerEnrichment(
    bannerSourceItems,
    isInitialSectionLoading ? [] : listItems,
    isInitialSectionLoading,
  );

  // 列表区 loading 期间只用 config 封面渲染 Banner，避免与列表数据路径耦合
  const displayBannerItems = isInitialSectionLoading
    ? featuredBannerItems
    : enrichedItems;

  const hasBannerCache = featuredBannerItems.length > 0;

  const showBannerSkeleton =
    !isBannerExplicitlyDisabled && !hasBannerCache && isInitialSectionLoading;

  const shouldShowBanner =
    !showBannerSkeleton &&
    !isBannerExplicitlyDisabled &&
    (isBannerEnabled || featuredBannerItems.length === 0) &&
    displayBannerItems.length > 0;

  const bannerPlaybackEntries = useMemo(() => {
    // 下方 tags/list 未完成前不挂载预览视频，避免 HLS/MP4 抢带宽与主线程
    if (isInitialSectionLoading) {
      return displayBannerItems.map((item) => ({
        dramaId: item.dramaId,
        mediaAccessUrl: undefined,
        videoUrl: undefined,
      }));
    }

    return displayBannerItems.map((item) => {
      // 移动端跳过 HLS 初始化开销，直接读 MP4；PC 端用 HLS 以支持自适应码率与后台预加载
      if (isMobile) {
        return {
          dramaId: item.dramaId,
          mediaAccessUrl: undefined,
          videoUrl: item.previewVideoUrl || undefined,
        };
      }

      return {
        dramaId: item.dramaId,
        mediaAccessUrl:
          item.previewHlsUrl ??
          (isHlsPreviewUrl(item.previewVideoUrl)
            ? item.previewVideoUrl
            : undefined),
        videoUrl:
          item.previewVideoUrl && !isHlsPreviewUrl(item.previewVideoUrl)
            ? item.previewVideoUrl
            : undefined,
      };
    });
  }, [displayBannerItems, isMobile, isInitialSectionLoading]);

  const searchItems = useMemo(() => {
    const keyword = searchKeyword?.trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    return listItems.filter((item) => {
      const searchableText = [
        item.dramaTitle,
        item.dramaDescription,
        item.creatorName,
        ...(item.tags ?? []),
        ...getPlayDramaActorNames(item),
      ]
        .filter((part): part is string => Boolean(part?.trim()))
        .join(' ')
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [listItems, searchKeyword]);

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage) {
      return;
    }
    void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (activeBannerIndex >= displayBannerItems.length) {
      setActiveBannerIndex(0);
    }
  }, [activeBannerIndex, displayBannerItems.length]);

  const handleSearchClear = () => {
    setSearchDraft('');
    setSearchKeyword(undefined);
  };

  const handleSearchSubmit = () => {
    const trimmed = searchDraft.trim();
    setSearchKeyword(trimmed.length > 0 ? trimmed : undefined);
  };

  // 切换标签/排序：重拉第 1 页 + 列表骨架。
  // 未吸顶：不改 window 滚动，筛选条留在原位；已吸顶：仅滚回吸顶起点（清列表深滚，不回 Banner）
  const lockListAreaHeight = () => {
    const height = listAreaRef.current?.offsetHeight;
    if (height && height > 0) {
      setListAreaMinHeight(height);
    }
  };

  const isFiltersSticky = () => {
    const block = filtersListBlockRef.current;
    if (!block) {
      return false;
    }

    // 与 StickyContentToolbar topOffset=header（top-11）对齐
    return (
      block.getBoundingClientRect().top <= getStickyContentToolbarTopPx() + 1
    );
  };

  const scrollContentAreaToStickyStart = () => {
    const block = filtersListBlockRef.current;
    if (!block) {
      return;
    }

    const stickyTopPx = getStickyContentToolbarTopPx();
    const absoluteTop = block.getBoundingClientRect().top + window.scrollY;
    const targetY = Math.max(0, absoluteTop - stickyTopPx);
    window.scrollTo({ top: targetY, behavior: 'auto' });
    writePlayTheaterSession({ scrollY: targetY });
  };

  const handleTagChange = (tagId: number | undefined) => {
    lockListAreaHeight();
    if (isFiltersSticky()) {
      scrollContentAreaToStickyStart();
    }
    const nextParams = {
      pageSize: PLAY_LIST_PAGE_SIZE,
      sort: selectedSort,
      ...(tagId !== undefined ? { tagId } : {}),
    };
    queryClient.removeQueries({
      queryKey: withAcceptLanguageQueryKey(
        getListPublicDramasQueryKey(nextParams),
        i18n.language,
      ),
    });
    hasRestoredScrollRef.current = true;
    setSelectedTagId(tagId);
  };

  const handleSortChange = (sort: ListPublicDramasSort) => {
    lockListAreaHeight();
    if (isFiltersSticky()) {
      scrollContentAreaToStickyStart();
    }
    const nextParams = {
      pageSize: PLAY_LIST_PAGE_SIZE,
      sort,
      ...(selectedTagId !== undefined ? { tagId: selectedTagId } : {}),
    };
    queryClient.removeQueries({
      queryKey: withAcceptLanguageQueryKey(
        getListPublicDramasQueryKey(nextParams),
        i18n.language,
      ),
    });
    hasRestoredScrollRef.current = true;
    setSelectedSort(sort);
  };

  const handleViewModeChange = (mode: PlayTheaterViewMode) => {
    setViewMode(mode);
    storePlayTheaterViewMode(mode);
  };

  // 剧场点进单部剧：清掉搜索队列等 playlist，二级页上下键改翻本剧集数
  const handleBeforePlay = () => {
    clearPlaylist();
  };

  const showMobileGrid = isMobile || viewMode === PlayTheaterViewMode.Grid;

  return (
    <article className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-points-page-surface-muted">
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <ContentContainer className="flex min-h-0 max-w-none flex-1 flex-col">
          {showBannerSkeleton ? <PlayTheaterBannerSkeleton /> : null}
          {shouldShowBanner ? (
            <PlayTheaterBannerSection
              featuredItems={displayBannerItems}
              playbackEntries={bannerPlaybackEntries}
              activeIndex={activeBannerIndex}
              bannerMuted={bannerMuted}
              onActiveIndexChange={setActiveBannerIndex}
              onToggleMute={() => setBannerMuted((prev) => !prev)}
              onBeforePlay={handleBeforePlay}
            />
          ) : null}

          <div ref={filtersListBlockRef} className="flex flex-col gap-0 pb-8">
            {tagsQuery.isPending ? (
              <PlayTheaterListToolbarSkeleton />
            ) : (
              <PlayTheaterListToolbar
                selectedTagId={selectedTagId}
                selectedSort={selectedSort}
                tags={tags}
                sortOptions={SORT_OPTIONS}
                searchDraft={searchDraft}
                searchKeyword={searchKeyword}
                searchItems={searchItems}
                isSearchLoading={isPending && Boolean(searchKeyword)}
                isSearchError={isError && Boolean(searchKeyword)}
                viewMode={viewMode}
                onTagChange={handleTagChange}
                onSortChange={handleSortChange}
                onSearchDraftChange={setSearchDraft}
                onSearchClear={handleSearchClear}
                onSearchSubmit={handleSearchSubmit}
                onViewModeChange={handleViewModeChange}
              />
            )}

            <div
              ref={listAreaRef}
              className="flex w-full min-w-0 flex-col"
              style={
                listAreaMinHeight > 0
                  ? { minHeight: listAreaMinHeight }
                  : undefined
              }
            >
              {isPending ? (
                <PlayTheaterDramaListSkeleton showMobileGrid={showMobileGrid} />
              ) : isError ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <p className="text-sm text-muted-foreground">
                    {t('加载失败')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => refetch()}
                  >
                    {t('再试一次')}
                  </Button>
                </div>
              ) : (
                <AppLoadingContainer
                  data={listItems}
                  isLoading={false}
                  minHeight="calc(100dvh - 60px - 11.5rem)"
                  emptyDescription={t('没有找到结果')}
                  scrollable={false}
                >
                  <ul
                    className={cn(
                      showMobileGrid
                        ? cn(
                            PLAY_THEATER_GRID_VIEW_CLASS,
                            PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
                          )
                        : PLAY_THEATER_LIST_GRID_CLASS,
                    )}
                  >
                    {listItems.map((item) => (
                      <li
                        key={item.dramaId ?? item.dramaTitle}
                        className="h-full"
                      >
                        {showMobileGrid ? (
                          <>
                            <div className="md:hidden">
                              <PlayDramaGridCard
                                item={item}
                                onBeforePlay={handleBeforePlay}
                              />
                            </div>
                            <div className="hidden md:block">
                              <PlayDramaCard
                                item={item}
                                onBeforePlay={handleBeforePlay}
                              />
                            </div>
                          </>
                        ) : (
                          <PlayDramaCard
                            item={item}
                            onBeforePlay={handleBeforePlay}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                  {hasNextPage ? (
                    <div
                      ref={ref}
                      className="flex justify-center py-6"
                      aria-hidden={!isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <Spinner className="size-6 text-muted-foreground" />
                      ) : null}
                    </div>
                  ) : null}
                </AppLoadingContainer>
              )}
            </div>
          </div>
        </ContentContainer>
      </main>
      <BackToTop />
    </article>
  );
}
