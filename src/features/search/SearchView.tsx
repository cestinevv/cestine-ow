import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type KeyboardEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FeedItemResponseType } from '@/api/__generated__/recommend/model/feedItemResponseType';
import type { SearchParams } from '@/api/__generated__/recommend/model/searchParams';
import type { SearchResponse } from '@/api/__generated__/recommend/model/searchResponse';
import { SearchType } from '@/api/__generated__/recommend/model/searchType';
import { searchActorCollections } from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { PageDtoActorCollectionResponse } from '@/api/__generated__/story/model/pageDtoActorCollectionResponse';
import type { PageResponseUserSearchItemResponse } from '@/api/__generated__/wallet/model/pageResponseUserSearchItemResponse';
import type { UserSearchItemResponse } from '@/api/__generated__/wallet/model/userSearchItemResponse';
import type { searchUsersResponse } from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import { ContentContainer } from '@/components/common/ContentContainer';
import { Button } from '@/components/ui/button';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { getActorCursorNextPageParam } from '@/features/actor/actorFormat';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { usePlayPlaylistStore } from '@/features/play/playPlaylistStore';
import { getFeedItemContentType } from '@/features/play/playRecommendFeed';
import {
  PlayFeedContentType,
  type PlayImmersiveItem,
  PlayPlaylistSource,
} from '@/features/play/types/playImmersive';
import { ProfileUnfollowConfirmDialog } from '@/features/profile/components/ProfileUnfollowConfirmDialog';
import {
  getProfileFollowStatsQueryKey,
  getProfileOtherUserInfoQueryKey,
  requestProfileFollow,
  requestProfileUnfollow,
} from '@/features/profile/profileWalletApi';
import { SearchActorResults } from '@/features/search/components/SearchActorResults';
import { SearchDramaResults } from '@/features/search/components/SearchDramaResults';
import { SearchRouteField } from '@/features/search/components/SearchRouteField';
import { SearchUserResults } from '@/features/search/components/SearchUserResults';
import { SearchWorkResults } from '@/features/search/components/SearchWorkResults';
import { addSearchHistory } from '@/features/search/searchHistory';
import {
  fetchRecommendSearch,
  getRecommendSearchNextPageParam,
} from '@/features/search/searchRecommendApi';
import { getSearchResultQueryKey } from '@/features/search/searchResultQueryKey';
import {
  getVisibleSearchTabs,
  isSearchKeywordValid,
  SEARCH_KEYWORD_VALIDATION_TOAST_ID,
  type SearchTab,
} from '@/features/search/searchTypes';
import {
  fetchSearchUsers,
  getSearchUsersNextPageParam,
} from '@/features/search/searchUserApi';
import {
  getSearchUserFollowAction,
  type SearchUserFollowAction,
  updateSearchUserFollowItem,
} from '@/features/search/searchUserFollow';
import { useAppLogin } from '@/hooks/useAppLogin';
import useGlobalStore from '@/stores/global';
import { cn, readSnowflakeId } from '@/utils';

type SearchViewProps = {
  query?: string;
  tab: SearchTab;
};

type PendingSearchUnfollowTarget = {
  userId: string;
  nickname: string;
};

const SEARCH_TAB_LABELS: Record<SearchTab, string> = {
  drama: '短剧',
  work: '作品',
  actor: '角色 IP',
  user: '用户',
};

const SEARCH_RESULTS_STALE_TIME_MS = 5 * 60 * 1000;

function updateSearchUserPages(
  data: InfiniteData<searchUsersResponse, number> | undefined,
  targetUserId: string,
  action: SearchUserFollowAction,
) {
  if (!data) {
    return data;
  }

  let cacheChanged = false;
  const pages = data.pages.map((page) => {
    if (page.status !== 200 || !page.data.data?.list) {
      return page;
    }

    const currentList = page.data.data.list;
    const list = currentList.map((item) =>
      updateSearchUserFollowItem(item, targetUserId, action),
    );
    if (list.every((item, index) => item === currentList[index])) {
      return page;
    }

    cacheChanged = true;
    return {
      ...page,
      data: {
        ...page.data,
        data: { ...page.data.data, list },
      },
    };
  });

  return cacheChanged ? { ...data, pages } : data;
}

function buildSearchPlaylist(
  items: NonNullable<SearchResponse['items']>,
  dedupeByDrama: boolean,
): PlayImmersiveItem[] {
  const seenIds = new Set<string>();
  const playlist: PlayImmersiveItem[] = [];

  for (const item of items) {
    const contentType = getFeedItemContentType(item);
    if (!contentType) {
      continue;
    }

    const isShortVideo = contentType === PlayFeedContentType.ShortVideo;
    const dramaId = readSnowflakeId(item.drama?.dramaId);
    const episodeId = readSnowflakeId(item.episode?.episodeId);
    const playPathId = isShortVideo ? episodeId : dramaId;
    if (!playPathId || !episodeId) {
      continue;
    }

    const uniqueId = dedupeByDrama ? playPathId : episodeId;
    if (seenIds.has(uniqueId)) {
      continue;
    }

    seenIds.add(uniqueId);
    playlist.push({
      dramaId: playPathId,
      episodeId,
      episodeNo: item.episode?.episodeNo,
      contentType,
      feed: item,
    });
  }

  return playlist;
}

export function SearchView({ query, tab }: SearchViewProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login } = useAppLogin();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const currentUserId = useGlobalStore((state) =>
    readSnowflakeId(state.userProfile?.userId),
  );
  const setPlaylist = usePlayPlaylistStore((state) => state.setPlaylist);
  const hasQuery = query !== undefined;
  const hasValidQuery = hasQuery && isSearchKeywordValid(query);
  const dramaSearchParams: Pick<SearchParams, 'keyword' | 'type'> = {
    keyword: query ?? '',
    type: SearchType.drama,
  };
  const dramaSearchQuery = useInfiniteQuery({
    queryKey: getSearchResultQueryKey(
      dramaSearchParams.keyword,
      'drama',
      i18n.language,
    ),
    queryFn: ({ pageParam, signal }) =>
      fetchRecommendSearch({
        ...dramaSearchParams,
        cursor: pageParam,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getRecommendSearchNextPageParam,
    retry: false,
    staleTime: SEARCH_RESULTS_STALE_TIME_MS,
    enabled: tab === 'drama' && hasValidQuery,
  });
  const dramaItems: NonNullable<SearchResponse['items']> = [];
  const seenDramaIds = new Set<string>();
  for (const page of dramaSearchQuery.data?.pages ?? []) {
    const pageData = unwrapOrvalPayload<SearchResponse>(page);
    for (const item of pageData?.items ?? []) {
      const dramaId = readSnowflakeId(item.drama?.dramaId);

      // test 实际回包仍可能用 DRAMA_EPISODE 表示短剧首页集。
      const isDramaResult =
        item.type === FeedItemResponseType.DRAMA ||
        item.type === FeedItemResponseType.DRAMA_EPISODE;
      if (!dramaId || !isDramaResult || seenDramaIds.has(dramaId)) {
        continue;
      }

      seenDramaIds.add(dramaId);
      dramaItems.push(item);
    }
  }
  const workSearchParams: Pick<SearchParams, 'keyword' | 'type'> = {
    keyword: query ?? '',
    type: SearchType.all,
  };
  const workSearchQuery = useInfiniteQuery({
    queryKey: getSearchResultQueryKey(
      workSearchParams.keyword,
      'work',
      i18n.language,
    ),
    queryFn: ({ pageParam, signal }) =>
      fetchRecommendSearch({
        ...workSearchParams,
        cursor: pageParam,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getRecommendSearchNextPageParam,
    retry: false,
    staleTime: SEARCH_RESULTS_STALE_TIME_MS,
    enabled: tab === 'work' && hasValidQuery,
  });
  const workItems: NonNullable<SearchResponse['items']> = [];
  for (const page of workSearchQuery.data?.pages ?? []) {
    const pageData = unwrapOrvalPayload<SearchResponse>(page);
    workItems.push(
      ...(pageData?.items ?? []).filter((item) => {
        if (!readSnowflakeId(item.episode?.episodeId)) {
          return false;
        }

        if (item.type === FeedItemResponseType.SHORT_VIDEO) {
          return true;
        }

        return (
          item.type === FeedItemResponseType.DRAMA_EPISODE &&
          !!readSnowflakeId(item.drama?.dramaId)
        );
      }),
    );
  }
  const actorSearchParams = {
    keyword: query ?? '',
    pageSize: DEFAULT_PAGE_SIZE,
  };
  const actorSearchQuery = useInfiniteQuery({
    queryKey: getSearchResultQueryKey(
      actorSearchParams.keyword,
      'actor',
      i18n.language,
    ),
    queryFn: ({ pageParam, signal }) =>
      searchActorCollections(
        {
          ...actorSearchParams,
          ...(pageParam !== undefined ? { mark: pageParam } : {}),
        },
        { signal },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getActorCursorNextPageParam,
    retry: false,
    staleTime: SEARCH_RESULTS_STALE_TIME_MS,
    enabled: tab === 'actor' && hasValidQuery,
  });
  const actorItems: ActorCollectionResponse[] = [];
  for (const page of actorSearchQuery.data?.pages ?? []) {
    const pageData = unwrapOrvalPayload<PageDtoActorCollectionResponse>(page);
    actorItems.push(...(pageData?.list ?? []));
  }
  const userSearchQueryKey = getSearchResultQueryKey(
    query ?? '',
    'user',
    i18n.language,
  );
  const userSearchQuery = useInfiniteQuery({
    queryKey: userSearchQueryKey,
    queryFn: ({ pageParam, signal }) =>
      fetchSearchUsers({ keyword: query ?? '', page: pageParam, signal }),
    initialPageParam: 1,
    getNextPageParam: getSearchUsersNextPageParam,
    retry: false,
    staleTime: SEARCH_RESULTS_STALE_TIME_MS,
    enabled: tab === 'user' && hasValidQuery,
  });
  const userItems: UserSearchItemResponse[] = [];
  for (const page of userSearchQuery.data?.pages ?? []) {
    const pageData =
      unwrapOrvalPayload<PageResponseUserSearchItemResponse>(page);
    userItems.push(...(pageData?.list ?? []));
  }
  const userFollowMutation = useMutation({
    mutationFn: ({
      targetUserId,
      shouldFollow,
    }: {
      targetUserId: string;
      shouldFollow: boolean;
    }) =>
      shouldFollow
        ? requestProfileFollow(targetUserId)
        : requestProfileUnfollow(targetUserId),
    onSuccess: async (_data, { targetUserId, shouldFollow }) => {
      queryClient.setQueryData<InfiniteData<searchUsersResponse, number>>(
        userSearchQueryKey,
        (data) =>
          updateSearchUserPages(
            data,
            targetUserId,
            shouldFollow ? 'follow' : 'unfollow',
          ),
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getProfileOtherUserInfoQueryKey(targetUserId),
        }),
        queryClient.invalidateQueries({
          queryKey: getProfileFollowStatsQueryKey(targetUserId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['/api/userWallet/users/follow-list'],
        }),
        currentUserId
          ? queryClient.invalidateQueries({
              queryKey: getProfileFollowStatsQueryKey(currentUserId),
            })
          : Promise.resolve(),
      ]);
    },
    onError: () => {
      toast.error(t('网络不稳定，请稍后重试'));
    },
  });
  const activeSearchSucceeded =
    (tab === 'drama' && dramaSearchQuery.isSuccess) ||
    (tab === 'work' && workSearchQuery.isSuccess) ||
    (tab === 'actor' && actorSearchQuery.isSuccess) ||
    (tab === 'user' && userSearchQuery.isSuccess);
  const [pendingUserUnfollow, setPendingUserUnfollow] =
    useState<PendingSearchUnfollowTarget>();

  useEffect(() => {
    if (!hasQuery || hasValidQuery) {
      return;
    }

    toast.info(t('请输入 2～50 个字符'), {
      id: SEARCH_KEYWORD_VALIDATION_TOAST_ID,
    });
  }, [hasQuery, hasValidQuery, t]);

  useEffect(() => {
    if (!query || !isSearchKeywordValid(query) || !activeSearchSucceeded) {
      return;
    }

    const timer = window.setTimeout(() => addSearchHistory(query), 1000);
    return () => window.clearTimeout(timer);
  }, [activeSearchSucceeded, query]);

  const visibleSearchTabs = getVisibleSearchTabs();

  const handleTabChange = (nextTab: SearchTab) => {
    void navigate({
      to: '/search',
      search: { q: query, type: nextTab },
      replace: true,
    });
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % visibleSearchTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        (currentIndex - 1 + visibleSearchTabs.length) %
        visibleSearchTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = visibleSearchTabs.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const nextTab = visibleSearchTabs[nextIndex];
    handleTabChange(nextTab);
    const tabList = event.currentTarget.closest('[role="tablist"]');
    const tabs = tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  };

  const handleBack = () => {
    const routerHistoryIndex = (
      window.history.state as { __TSR_index?: number } | null
    )?.__TSR_index;

    if (typeof routerHistoryIndex === 'number' && routerHistoryIndex > 0) {
      window.history.back();
      return;
    }

    void navigate({ to: '/', replace: true });
  };

  const handleDramaLoadMore = () => {
    void dramaSearchQuery.fetchNextPage();
  };

  const handleDramaBeforePlay = () => {
    setPlaylist(
      PlayPlaylistSource.Search,
      buildSearchPlaylist(dramaItems, true),
      {
        hasMore: !!dramaSearchQuery.hasNextPage,
        loadMore: async () => {
          const result = await dramaSearchQuery.fetchNextPage();
          const nextItems: NonNullable<SearchResponse['items']> = [];
          for (const page of result.data?.pages ?? []) {
            const pageData = unwrapOrvalPayload<SearchResponse>(page);
            nextItems.push(...(pageData?.items ?? []));
          }

          return {
            items: buildSearchPlaylist(nextItems, true),
            hasMore: !!result.hasNextPage,
          };
        },
      },
    );
  };

  const handleWorkLoadMore = () => {
    void workSearchQuery.fetchNextPage();
  };

  const handleWorkBeforePlay = () => {
    setPlaylist(
      PlayPlaylistSource.Search,
      buildSearchPlaylist(workItems, false),
      {
        hasMore: !!workSearchQuery.hasNextPage,
        loadMore: async () => {
          const result = await workSearchQuery.fetchNextPage();
          const nextItems: NonNullable<SearchResponse['items']> = [];
          for (const page of result.data?.pages ?? []) {
            const pageData = unwrapOrvalPayload<SearchResponse>(page);
            nextItems.push(...(pageData?.items ?? []));
          }

          return {
            items: buildSearchPlaylist(nextItems, false),
            hasMore: !!result.hasNextPage,
          };
        },
      },
    );
  };

  const handleActorLoadMore = () => {
    void actorSearchQuery.fetchNextPage();
  };

  const handleActorMintSuccess = () => actorSearchQuery.refetch();
  const handleUserLoadMore = () => {
    void userSearchQuery.fetchNextPage();
  };

  const handleUserFollowToggle = (item: UserSearchItemResponse) => {
    const targetUserId = readSnowflakeId(item.userId);
    const followAction = getSearchUserFollowAction(item.followStatus);
    if (
      userFollowMutation.isPending ||
      !targetUserId ||
      targetUserId === currentUserId ||
      followAction === undefined
    ) {
      return;
    }

    if (!isLogin) {
      login();
      return;
    }

    if (followAction === 'unfollow') {
      setPendingUserUnfollow({
        userId: targetUserId,
        nickname: item.nickname?.trim() || t('匿名用户'),
      });
      return;
    }

    userFollowMutation.mutate({ targetUserId, shouldFollow: true });
  };

  const handleUserUnfollowOpenChange = (open: boolean) => {
    if (!open) {
      setPendingUserUnfollow(undefined);
    }
  };

  const handleUserUnfollowConfirm = () => {
    if (!pendingUserUnfollow || userFollowMutation.isPending) {
      return;
    }

    userFollowMutation.mutate(
      { targetUserId: pendingUserUnfollow.userId, shouldFollow: false },
      { onSuccess: () => setPendingUserUnfollow(undefined) },
    );
  };

  return (
    <article className="flex min-h-dvh w-full flex-col bg-background md:min-h-0">
      <header className="sticky top-0 z-30 bg-background md:hidden">
        <div className="flex h-12 items-center gap-3 px-4 py-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label={t('返回')}
            className="size-6 shrink-0 rounded-none p-0 text-foreground hover:bg-transparent"
          >
            <IconChevronLeft className="size-6" />
          </Button>
          <div className="min-w-0 flex-1">
            <SearchRouteField
              query={query}
              tab={tab}
              variant="mobile"
              autoFocus
            />
          </div>
        </div>
      </header>

      <ContentContainer className="flex min-w-0 flex-1 flex-col gap-3 py-3">
        {hasQuery ? (
          <nav
            aria-label={t('搜索')}
            className="sticky top-12 z-20 bg-background md:top-14"
          >
            <div role="tablist" className="flex items-center gap-5 pt-2">
              {visibleSearchTabs.map((item, index) => {
                const active = item === tab;

                return (
                  <div key={item}>
                    <Button
                      type="button"
                      variant="ghost"
                      id={`search-tab-${item}`}
                      role="tab"
                      aria-selected={active}
                      aria-controls={`search-panel-${item}`}
                      tabIndex={active ? 0 : -1}
                      onClick={() => handleTabChange(item)}
                      onKeyDown={(event) => handleTabKeyDown(event, index)}
                      className={cn(
                        'h-auto flex-col rounded-none bg-transparent p-0 text-base leading-6 hover:bg-transparent',
                        active
                          ? 'font-bold text-foreground'
                          : 'font-normal text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="pb-1.25">
                        {t(SEARCH_TAB_LABELS[item])}
                      </span>
                      <span
                        className={cn(
                          'h-0.75 w-4 rounded-full bg-foreground',
                          active ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </Button>
                  </div>
                );
              })}
            </div>
          </nav>
        ) : null}

        {hasQuery && tab === 'drama' ? (
          <section
            id="search-panel-drama"
            role="tabpanel"
            aria-labelledby="search-tab-drama"
          >
            <SearchDramaResults
              items={dramaItems}
              isLoading={hasValidQuery && dramaSearchQuery.isPending}
              isError={dramaSearchQuery.isError}
              hasNextPage={dramaSearchQuery.hasNextPage}
              isFetchingNextPage={dramaSearchQuery.isFetchingNextPage}
              onBeforePlay={handleDramaBeforePlay}
              onLoadMore={handleDramaLoadMore}
            />
          </section>
        ) : null}

        {hasQuery && tab === 'work' ? (
          <section
            id="search-panel-work"
            role="tabpanel"
            aria-labelledby="search-tab-work"
          >
            <SearchWorkResults
              items={workItems}
              isLoading={hasValidQuery && workSearchQuery.isPending}
              isError={workSearchQuery.isError}
              hasNextPage={workSearchQuery.hasNextPage}
              isFetchingNextPage={workSearchQuery.isFetchingNextPage}
              onBeforePlay={handleWorkBeforePlay}
              onLoadMore={handleWorkLoadMore}
            />
          </section>
        ) : null}

        {hasQuery && tab === 'actor' ? (
          <section
            id="search-panel-actor"
            role="tabpanel"
            aria-labelledby="search-tab-actor"
          >
            <SearchActorResults
              items={actorItems}
              isLoading={hasValidQuery && actorSearchQuery.isPending}
              isError={actorSearchQuery.isError}
              hasNextPage={actorSearchQuery.hasNextPage}
              isFetchingNextPage={actorSearchQuery.isFetchingNextPage}
              onLoadMore={handleActorLoadMore}
              onMintSuccess={handleActorMintSuccess}
            />
          </section>
        ) : null}

        {hasQuery && tab === 'user' ? (
          <section
            id="search-panel-user"
            role="tabpanel"
            aria-labelledby="search-tab-user"
          >
            <SearchUserResults
              items={userItems}
              isLoading={hasValidQuery && userSearchQuery.isPending}
              isError={userSearchQuery.isError}
              hasNextPage={userSearchQuery.hasNextPage}
              isFetchingNextPage={userSearchQuery.isFetchingNextPage}
              currentUserId={currentUserId}
              pendingUserId={
                userFollowMutation.isPending
                  ? userFollowMutation.variables?.targetUserId
                  : undefined
              }
              onLoadMore={handleUserLoadMore}
              onFollowToggle={handleUserFollowToggle}
            />
          </section>
        ) : null}
      </ContentContainer>

      <ProfileUnfollowConfirmDialog
        open={Boolean(pendingUserUnfollow)}
        nickname={pendingUserUnfollow?.nickname}
        isPending={userFollowMutation.isPending}
        onOpenChange={handleUserUnfollowOpenChange}
        onConfirm={handleUserUnfollowConfirm}
      />
    </article>
  );
}
