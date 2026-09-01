import type { SearchParams } from '@/api/__generated__/recommend/model/searchParams';
import { SearchType } from '@/api/__generated__/recommend/model/searchType';
import { getSearchActorCollectionsQueryKey } from '@/api/__generated__/story/actor-i-p/actor-i-p';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { getRecommendSearchInfiniteQueryKey } from '@/features/search/searchRecommendApi';
import type { SearchTab } from '@/features/search/searchTypes';
import { getSearchUsersQueryKey } from '@/features/search/searchUserApi';
import { withAcceptLanguageQueryKey } from '@/utils';

export function getSearchResultQueryKey(
  keyword: string,
  tab: SearchTab,
  language: string,
) {
  if (tab === 'drama' || tab === 'work') {
    const params: Pick<SearchParams, 'keyword' | 'type'> = {
      keyword,
      type: tab === 'drama' ? SearchType.drama : SearchType.all,
    };

    return withAcceptLanguageQueryKey(
      getRecommendSearchInfiniteQueryKey(params),
      language,
    );
  }

  if (tab === 'actor') {
    return withAcceptLanguageQueryKey(
      [
        ...getSearchActorCollectionsQueryKey({
          keyword,
          pageSize: DEFAULT_PAGE_SIZE,
        }),
        'infinite',
      ],
      language,
    );
  }

  return getSearchUsersQueryKey(keyword);
}
