import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getListDramasQueryKey,
  listDramas,
} from '@/api/__generated__/story/create-drama/create-drama';
import type { ListDramasParams } from '@/api/__generated__/story/model/listDramasParams';
import { withAcceptLanguageQueryKey } from '@/utils';

import type { NarratorReviewFilter } from '../constants/narratorManagementTabs';
import {
  buildCreatorDramaListParams,
  getCreatorDramaCursorNextPageParam,
  mergeCreatorDramaPages,
} from '../narratorCreatorDramaFormat';

export function useNarratorCreatorDramaList(filter: NarratorReviewFilter) {
  const { i18n } = useTranslation();

  const listParams = useMemo(
    () => buildCreatorDramaListParams(filter),
    [filter],
  );

  const query = useInfiniteQuery({
    queryKey: withAcceptLanguageQueryKey(
      getListDramasQueryKey(listParams),
      i18n.language,
    ),
    queryFn: ({ pageParam, signal }) => {
      const params: ListDramasParams = {
        ...listParams,
        ...(pageParam !== undefined ? { mark: pageParam as number } : {}),
      };

      return listDramas(params, { signal });
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: getCreatorDramaCursorNextPageParam,
    retry: false,
  });

  const dramaRows = useMemo(
    () => mergeCreatorDramaPages(query.data?.pages),
    [query.data?.pages],
  );

  return {
    listParams,
    dramaRows,
    isPending: query.isPending,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
