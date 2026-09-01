import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import type { FeedResponse } from '@/api/__generated__/recommend/model/feedResponse';
import type { SearchResponse } from '@/api/__generated__/recommend/model/searchResponse';
import type {
  feedResponse,
  searchResponse,
} from '@/api/__generated__/recommend/recommend-feed/recommend-feed';
import { unwrapOrvalPayload } from '@/features/play/playFormat';
import { readSnowflakeId } from '@/utils/snowflakeId';

const RECOMMEND_FEED_QUERY_PATH = '/api/recommend/feed';
const RECOMMEND_SEARCH_QUERY_PATH = '/api/recommend/search';

type FeedLikePageData = FeedResponse | SearchResponse;

function patchFeedCreatorFollowedItem(
  item: FeedItemResponse,
  creatorUserId: string,
  followedByMe: boolean,
): FeedItemResponse {
  if (readSnowflakeId(item.userId) !== creatorUserId) {
    return item;
  }

  return {
    ...item,
    followedByMe,
  };
}

function patchFeedCreatorFollowedPages<TPage extends { data?: unknown }>(
  current: InfiniteData<TPage> | undefined,
  creatorUserId: string,
  followedByMe: boolean,
): InfiniteData<TPage> | undefined {
  if (!current?.pages?.length) {
    return current;
  }

  let changed = false;
  const pages = current.pages.map((page) => {
    const pageData = unwrapOrvalPayload<FeedLikePageData>(page);
    if (!pageData?.items?.length) {
      return page;
    }

    let pageChanged = false;
    const items = pageData.items.map((item) => {
      const nextItem = patchFeedCreatorFollowedItem(
        item,
        creatorUserId,
        followedByMe,
      );

      if (nextItem !== item) {
        pageChanged = true;
      }

      return nextItem;
    });

    if (!pageChanged) {
      return page;
    }

    changed = true;
    const rawPageData = page.data as { data?: FeedLikePageData | null };
    return {
      ...page,
      data: {
        ...rawPageData,
        data: {
          ...pageData,
          items,
        },
      },
    } as TPage;
  });

  return changed ? { ...current, pages } : current;
}

export function patchPlayFeedCreatorFollowedByMe(
  queryClient: QueryClient,
  {
    creatorUserId,
    followedByMe,
  }: {
    creatorUserId?: string;
    followedByMe: boolean;
  },
) {
  const targetUserId = readSnowflakeId(creatorUserId);
  if (!targetUserId) {
    return;
  }

  queryClient.setQueriesData<InfiniteData<feedResponse> | undefined>(
    {
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === RECOMMEND_FEED_QUERY_PATH,
    },
    (current) =>
      patchFeedCreatorFollowedPages(current, targetUserId, followedByMe),
  );
  queryClient.setQueriesData<InfiniteData<searchResponse> | undefined>(
    {
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === RECOMMEND_SEARCH_QUERY_PATH,
    },
    (current) =>
      patchFeedCreatorFollowedPages(current, targetUserId, followedByMe),
  );
}
