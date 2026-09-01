import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import type { FeedResponse } from '@/api/__generated__/recommend/model/feedResponse';
import type { feedResponse } from '@/api/__generated__/recommend/recommend-feed/recommend-feed';
import type { DramaStatisticsResponse } from '@/api/legacy/storyLegacyTypes';
import { getPlayDramaDetailQueryKey } from '@/features/play/playDramaApi';
import { unwrapOrvalPayload } from '@/features/play/playFormat';
import { readSnowflakeId } from '@/utils/snowflakeId';

const RECOMMEND_FEED_QUERY_PATH = '/api/recommend/feed';
const PROFILE_FAVORITES_PATH_FRAGMENT = '/favorites';

type PatchRecommendFeedFavoriteArgs = {
  /** 按单集 / 短视频 episodeId 匹配 Feed 条目 */
  episodeId?: string;
  favoritedByMe: boolean;
  favoriteCount?: number;
};

type DramaInfoFavoriteExtras = {
  favoriteCount?: number;
  totalFavoriteCount?: number;
  favoritedByMe?: boolean;
};

function matchFeedFavoriteItem(
  item: FeedItemResponse,
  args: PatchRecommendFeedFavoriteArgs,
): boolean {
  const itemEpisodeId = readSnowflakeId(item.episode?.episodeId);
  return Boolean(args.episodeId) && itemEpisodeId === args.episodeId;
}

function patchFeedItemFavorite(
  item: FeedItemResponse,
  args: PatchRecommendFeedFavoriteArgs,
): FeedItemResponse {
  return {
    ...item,
    favoritedByMe: args.favoritedByMe,
    episode:
      item.episode === undefined
        ? item.episode
        : {
            ...item.episode,
            ...(args.favoriteCount === undefined
              ? {}
              : { favoriteCount: args.favoriteCount }),
          },
  };
}

/** 回写推荐 Feed 无限列表（仅按 episodeId；Feed 无整剧收藏概念） */
export function patchRecommendFeedFavorite(
  queryClient: QueryClient,
  args: PatchRecommendFeedFavoriteArgs,
) {
  if (!args.episodeId) {
    return;
  }

  queryClient.setQueriesData<InfiniteData<feedResponse> | undefined>(
    {
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === RECOMMEND_FEED_QUERY_PATH,
    },
    (current) => {
      if (!current?.pages?.length) {
        return current;
      }

      let changed = false;
      const pages = current.pages.map((page) => {
        const feedData = unwrapOrvalPayload<FeedResponse>(page);
        if (!feedData?.items?.length) {
          return page;
        }

        let pageChanged = false;
        const items = feedData.items.map((item) => {
          if (!matchFeedFavoriteItem(item, args)) {
            return item;
          }

          pageChanged = true;
          return patchFeedItemFavorite(item, args);
        });

        if (!pageChanged) {
          return page;
        }

        changed = true;
        const pageData = page.data as { data?: FeedResponse | null };
        return {
          ...page,
          data: {
            ...pageData,
            data: {
              ...feedData,
              items,
            },
          },
        };
      });

      if (!changed) {
        return current;
      }

      return {
        ...current,
        pages,
      };
    },
  );
}

function patchDramaDetailFavoriteFields(
  queryClient: QueryClient,
  dramaId: string,
  patch: DramaInfoFavoriteExtras,
) {
  const dramaIdText = readSnowflakeId(dramaId);
  if (!dramaIdText) {
    return;
  }

  const hasCount = patch.favoriteCount !== undefined;
  const hasFavorited = patch.favoritedByMe !== undefined;
  if (!hasCount && !hasFavorited) {
    return;
  }

  queryClient.setQueryData(
    getPlayDramaDetailQueryKey(dramaIdText),
    (current: unknown) => {
      if (!current || typeof current !== 'object') {
        return current;
      }

      const response = current as {
        data?: { data?: DramaStatisticsResponse | null };
      };
      const payload = response.data?.data;
      if (!payload?.dramaInfo) {
        return current;
      }

      const nextDramaInfo: typeof payload.dramaInfo & DramaInfoFavoriteExtras =
        {
          ...payload.dramaInfo,
          ...(hasCount
            ? {
                favoriteCount: patch.favoriteCount,
                totalFavoriteCount: patch.favoriteCount,
              }
            : {}),
          ...(hasFavorited ? { favoritedByMe: patch.favoritedByMe } : {}),
        };

      return {
        ...response,
        data: {
          ...response.data,
          data: {
            ...payload,
            dramaInfo: nextDramaInfo,
          },
        },
      };
    },
  );
}

/** 短剧整剧收藏数写剧详情缓存（favoriteCount / totalFavoriteCount 双写） */
export function syncPlayDramaDetailFavoriteCount(
  queryClient: QueryClient,
  dramaId: string,
  nextCount?: number,
) {
  if (nextCount === undefined) {
    return;
  }

  patchDramaDetailFavoriteFields(queryClient, dramaId, {
    favoriteCount: nextCount,
  });
}

/** 短剧整剧收藏态写剧详情缓存（后端即将回显 favoritedByMe） */
export function syncPlayDramaDetailFavoritedByMe(
  queryClient: QueryClient,
  dramaId: string,
  favoritedByMe: boolean,
) {
  patchDramaDetailFavoriteFields(queryClient, dramaId, { favoritedByMe });
}

/** 个人中心收藏列表：收藏变更后失效，进页时重新拉 */
export function invalidateProfileFavoritesQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === 'string' &&
      query.queryKey[0].includes(PROFILE_FAVORITES_PATH_FRAGMENT),
  });
}
