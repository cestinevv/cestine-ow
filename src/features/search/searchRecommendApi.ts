import type { SearchParams } from '@/api/__generated__/recommend/model/searchParams';
import type { SearchResponse } from '@/api/__generated__/recommend/model/searchResponse';
import {
  getSearchQueryKey,
  search,
} from '@/api/__generated__/recommend/recommend-feed/recommend-feed';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';

export const SEARCH_RECOMMEND_PAGE_SIZE = 20;

export function getRecommendSearchInfiniteQueryKey(
  params: Pick<SearchParams, 'keyword' | 'type'>,
) {
  return [
    ...getSearchQueryKey({ ...params, size: SEARCH_RECOMMEND_PAGE_SIZE }),
    'infinite',
  ] as const;
}

export function fetchRecommendSearch({
  keyword,
  type,
  cursor,
  signal,
}: Pick<SearchParams, 'keyword' | 'type' | 'cursor'> & {
  signal?: AbortSignal;
}) {
  return search(
    {
      keyword,
      type,
      size: SEARCH_RECOMMEND_PAGE_SIZE,
      ...(cursor !== undefined ? { cursor } : {}),
    },
    { signal },
  );
}

export function getRecommendSearchNextPageParam(lastPage: { data?: unknown }) {
  const pageData = unwrapOrvalPayload<SearchResponse>(lastPage);
  if (!pageData?.hasMore || pageData.cursor === undefined) {
    return undefined;
  }

  const cursor = String(pageData.cursor);
  return cursor.length > 0 ? cursor : undefined;
}
