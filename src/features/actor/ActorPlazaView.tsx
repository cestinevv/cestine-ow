import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import {
  getListActorCollectionsQueryKey,
  listActorCollections,
} from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { ListActorCollectionsParams } from '@/api/__generated__/story/model/listActorCollectionsParams';
import { ListActorCollectionsSort } from '@/api/__generated__/story/model/listActorCollectionsSort';
import type { PageDtoActorCollectionResponse } from '@/api/__generated__/story/model/pageDtoActorCollectionResponse';
import IconFilterChevronDown from '@/assets/svg/IconFilterChevronDown';
import IconFilterSort from '@/assets/svg/IconFilterSort';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { BackToTop } from '@/components/common/BackToTop';
import { ContentContainer } from '@/components/common/ContentContainer';
import {
  getStickyContentToolbarTopPx,
  StickyContentToolbar,
} from '@/components/common/StickyContentToolbar';
import {
  filterPillButtonActiveClassName,
  filterPillButtonBaseClassName,
  filterPillButtonInactiveClassName,
} from '@/components/common/Tabs';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import {
  ACTOR_PLAZA_GRID_VIEW_CLASS,
  ACTOR_PLAZA_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/actor/constants/actorPlazaCardGrid';
import { subscribeSiteHomeListRefresh } from '@/routing/siteHomeListRefresh';
import { cn } from '@/utils';
import {
  getActorCursorNextPageParam,
  getActorPlazaCardDisplay,
  unwrapOrvalPayload,
} from './actorFormat';
import {
  ActorPlazaSortKey,
  readActorPlazaSession,
  writeActorPlazaSession,
} from './actorPlazaSession';
import { ActorHowToPlayDialog } from './components/ActorHowToPlayDialog';
import { ActorPlazaCard } from './components/ActorPlazaCard';
import { ActorPlazaListSkeleton } from './components/ActorPlazaListSkeleton';

const ACTOR_SORT_OPTIONS = [
  {
    key: ActorPlazaSortKey.Price,
    labelKey: '价格',
    direction: 'both',
  },
  {
    key: ActorPlazaSortKey.Lv1Salary,
    labelKey: '片酬',
    direction: 'down',
  },
] as const;

function getActorSortPrice(item: ActorCollectionResponse) {
  return getActorPlazaCardDisplay(item).currentPriceUsdc;
}

function buildActorListQueryParams(
  activeSort: ActorPlazaSortKey,
  priceSortOrder: 'asc' | 'desc',
): ListActorCollectionsParams {
  return {
    pageSize: DEFAULT_PAGE_SIZE,
    sort:
      activeSort === ActorPlazaSortKey.Price
        ? priceSortOrder === 'asc'
          ? ListActorCollectionsSort.price_asc
          : ListActorCollectionsSort.price_desc
        : ListActorCollectionsSort.computing_power,
  };
}

export function ActorPlazaView() {
  const { t } = useTranslation();
  const { ref, inView } = useInView();
  const queryClient = useQueryClient();

  const [activeSort, setActiveSort] = useState<ActorPlazaSortKey>(
    () => readActorPlazaSession().activeSort ?? ActorPlazaSortKey.Price,
  );
  const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc'>(
    () => readActorPlazaSession().priceSortOrder ?? 'asc',
  );
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const hasRestoredScrollRef = useRef(false);
  /** 筛选 + 列表区块：切排序时内容区回顶对齐到此 */
  const filtersListBlockRef = useRef<HTMLDivElement>(null);
  /** 列表区容器：切排序时锁住高度，避免骨架替换导致筛选条位置跳动 */
  const listAreaRef = useRef<HTMLDivElement>(null);
  const [listAreaMinHeight, setListAreaMinHeight] = useState(0);

  const listQueryParams = useMemo(
    () => buildActorListQueryParams(activeSort, priceSortOrder),
    [activeSort, priceSortOrder],
  );

  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: getListActorCollectionsQueryKey(listQueryParams),
    queryFn: ({ pageParam }) =>
      listActorCollections({
        ...listQueryParams,
        ...(pageParam !== undefined
          ? {
              mark: pageParam as unknown as ListActorCollectionsParams['mark'],
            }
          : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getActorCursorNextPageParam,
    retry: false,
  });

  const listItems = useMemo(() => {
    if (!data?.pages?.length) {
      return [];
    }

    const out: ActorCollectionResponse[] = [];
    for (const page of data.pages) {
      const pageData = unwrapOrvalPayload<PageDtoActorCollectionResponse>(page);
      const list = pageData?.list ?? [];
      for (const item of list) {
        out.push(item);
      }
    }
    return out;
  }, [data?.pages]);

  const sortedListItems = useMemo(() => {
    const out = [...listItems];
    if (activeSort !== ActorPlazaSortKey.Price) {
      return out;
    }
    out.sort((a, b) => {
      const priceA = getActorSortPrice(a);
      const priceB = getActorSortPrice(b);
      return priceSortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    });
    return out;
  }, [activeSort, listItems, priceSortOrder]);

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage) {
      return;
    }
    void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    writeActorPlazaSession({ activeSort, priceSortOrder });
  }, [activeSort, priceSortOrder]);

  useEffect(() => {
    const handleScroll = () => {
      writeActorPlazaSession({ scrollY: window.scrollY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 硬刷新：清 scrollY，保留筛选；与同页再点刷新口径一致（RQ 缓存本身会丢）
  useEffect(() => {
    const clearScrollYOnUnload = () => {
      writeActorPlazaSession({ scrollY: 0 });
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

  // 侧栏同页再点「IP市场」：保留筛选，回顶并从第 1 页重拉
  useEffect(() => {
    return subscribeSiteHomeListRefresh('/actor', () => {
      queryClient.removeQueries({
        queryKey: getListActorCollectionsQueryKey(),
        exact: false,
      });
      hasRestoredScrollRef.current = true;
      writeActorPlazaSession({ scrollY: 0 });
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [queryClient]);

  useEffect(() => {
    if (
      hasRestoredScrollRef.current ||
      isPending ||
      sortedListItems.length === 0
    ) {
      return;
    }

    const savedScrollY = readActorPlazaSession().scrollY;
    if (typeof savedScrollY !== 'number' || savedScrollY <= 0) {
      return;
    }

    hasRestoredScrollRef.current = true;
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollY, behavior: 'auto' });
    });
  }, [isPending, sortedListItems.length]);

  // 列表加载结束后解除高度锁定
  useEffect(() => {
    if (isPending || listAreaMinHeight <= 0) {
      return;
    }

    setListAreaMinHeight(0);
  }, [isPending, listAreaMinHeight]);

  const isListLoading = isPending;

  // 切换排序：重拉第 1 页 + 列表骨架。
  // 未吸顶：不改 window 滚动，筛选条留在原位；已吸顶：仅滚回吸顶起点（清列表深滚）
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

    // 与 StickyContentToolbar topOffset=site-nav（top-11 / md:top-14）对齐
    return (
      block.getBoundingClientRect().top <=
      getStickyContentToolbarTopPx('site-nav') + 1
    );
  };

  const scrollContentAreaToStickyStart = () => {
    const block = filtersListBlockRef.current;
    if (!block) {
      return;
    }

    const stickyTopPx = getStickyContentToolbarTopPx('site-nav');
    const absoluteTop = block.getBoundingClientRect().top + window.scrollY;
    const targetY = Math.max(0, absoluteTop - stickyTopPx);
    window.scrollTo({ top: targetY, behavior: 'auto' });
    writeActorPlazaSession({ scrollY: targetY });
  };

  // 价格 pill 点击切换升降序；片酬 pill 仅切换激活项
  const handleSortClick = (sortKey: ActorPlazaSortKey) => () => {
    lockListAreaHeight();
    if (isFiltersSticky()) {
      scrollContentAreaToStickyStart();
    }

    const nextPriceSortOrder =
      sortKey === ActorPlazaSortKey.Price
        ? priceSortOrder === 'asc'
          ? 'desc'
          : 'asc'
        : priceSortOrder;
    const nextParams = buildActorListQueryParams(sortKey, nextPriceSortOrder);

    queryClient.removeQueries({
      queryKey: getListActorCollectionsQueryKey(nextParams),
    });
    hasRestoredScrollRef.current = true;

    if (sortKey === ActorPlazaSortKey.Price) {
      setActiveSort(ActorPlazaSortKey.Price);
      setPriceSortOrder(nextPriceSortOrder);
      return;
    }
    setActiveSort(sortKey);
  };

  // 打开角色 IP 怎么玩弹窗
  const handleHowToPlayClick = () => {
    setHowToPlayOpen(true);
  };

  // 列表加载失败后手动重试
  const handleRetryClick = () => {
    void refetch();
  };

  return (
    <article
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-points-page-surface-muted',
      )}
    >
      <main className={cn('flex min-h-0 w-full min-w-0 flex-1 flex-col')}>
        <ContentContainer
          className={cn(
            'flex min-h-0 max-w-none flex-1 flex-col pb-4',
            'md:pb-8',
          )}
        >
          <div
            ref={filtersListBlockRef}
            className={cn('flex min-h-0 flex-1 flex-col gap-4')}
          >
            <StickyContentToolbar
              as="div"
              topOffset="site-nav"
              className={cn(
                // Spacing — 标题 + 筛选；pt 随吸顶一起固定
                'gap-4 pb-2 pt-4 md:pt-8',
              )}
            >
              <header className="flex shrink-0 items-center justify-between gap-4">
                <h1
                  className={cn(
                    'min-w-0 text-2xl leading-8 font-bold tracking-[-0.12px] text-foreground',
                    'md:text-[30px] md:leading-9',
                  )}
                >
                  {t('角色IP市场')}
                </h1>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleHowToPlayClick}
                  className={cn(
                    'h-9 shrink-0 rounded-full border-[0.5px] border-border bg-muted px-3 py-1.5',
                    'text-sm leading-5 font-normal text-foreground',
                    'hover:bg-muted/80',
                  )}
                >
                  {t('玩法说明')}
                </Button>
              </header>

              <div className="flex gap-2 overflow-x-auto">
                {ACTOR_SORT_OPTIONS.map((option) => {
                  const active = activeSort === option.key;
                  return (
                    <Button
                      key={option.key}
                      type="button"
                      variant="ghost"
                      onClick={handleSortClick(option.key)}
                      className={cn(
                        filterPillButtonBaseClassName,
                        'gap-1 px-4 py-1.5',
                        active
                          ? filterPillButtonActiveClassName
                          : filterPillButtonInactiveClassName,
                        'font-bold',
                      )}
                    >
                      {t(option.labelKey)}
                      {option.direction === 'both' ? (
                        <IconFilterSort activeOrder={priceSortOrder} />
                      ) : (
                        <IconFilterChevronDown />
                      )}
                    </Button>
                  );
                })}
              </div>
            </StickyContentToolbar>

            {isError ? (
              <div className={cn('flex flex-col items-center gap-4 py-12')}>
                <p className={cn('text-sm text-muted-foreground')}>
                  {t('加载失败')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRetryClick}
                >
                  {t('再试一次')}
                </Button>
              </div>
            ) : (
              <div
                ref={listAreaRef}
                className={cn('flex min-h-0 flex-1 flex-col')}
                style={
                  listAreaMinHeight > 0
                    ? { minHeight: listAreaMinHeight }
                    : undefined
                }
              >
                {isListLoading ? (
                  <ActorPlazaListSkeleton />
                ) : (
                  <AppLoadingContainer
                    data={sortedListItems}
                    isLoading={false}
                    minHeight="calc(100dvh - 60px - 11.5rem)"
                    maxHeight="none"
                    emptyDescription={t('暂无角色 IP')}
                    scrollable={false}
                  >
                    <ul
                      className={cn(
                        ACTOR_PLAZA_GRID_VIEW_CLASS,
                        ACTOR_PLAZA_GRID_VIEW_DESKTOP_CLASS,
                      )}
                    >
                      {sortedListItems.map((item) => (
                        <li key={item.id ?? item.name} className="min-w-0">
                          <ActorPlazaCard item={item} />
                        </li>
                      ))}
                    </ul>
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
                )}
              </div>
            )}
          </div>
        </ContentContainer>
      </main>
      <BackToTop />
      <ActorHowToPlayDialog
        open={howToPlayOpen}
        onOpenChange={setHowToPlayOpen}
      />
    </article>
  );
}
