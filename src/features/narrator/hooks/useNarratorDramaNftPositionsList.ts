import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PositionsParams } from '@/api/__generated__/wallet/model/positionsParams';
import {
  getPositionsQueryKey,
  positions,
} from '@/api/__generated__/wallet/userwallet-dramanft/userwallet-dramanft';
import { withAcceptLanguageQueryKey } from '@/utils';

import {
  getDramaNftPositionsCursorNextPageParam,
  mergeDramaNftPositionPages,
  NARRATOR_DRAMA_NFT_POSITIONS_LIST_PARAMS,
} from '../narratorCreatorDramaFormat';

export function useNarratorDramaNftPositionsList() {
  const { i18n } = useTranslation();

  const query = useInfiniteQuery({
    queryKey: withAcceptLanguageQueryKey(
      getPositionsQueryKey(NARRATOR_DRAMA_NFT_POSITIONS_LIST_PARAMS),
      i18n.language,
    ),
    queryFn: ({ pageParam, signal }) => {
      const params: PositionsParams = {
        ...NARRATOR_DRAMA_NFT_POSITIONS_LIST_PARAMS,
        mark: pageParam as number,
      };

      return positions(params, { signal });
    },
    initialPageParam: NARRATOR_DRAMA_NFT_POSITIONS_LIST_PARAMS.mark,
    getNextPageParam: getDramaNftPositionsCursorNextPageParam,
    retry: false,
  });

  const positionRows = useMemo(
    () => mergeDramaNftPositionPages(query.data?.pages),
    [query.data?.pages],
  );

  return {
    positionRows,
    isPending: query.isPending,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
