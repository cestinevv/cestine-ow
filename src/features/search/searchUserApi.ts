import type { PageResponseUserSearchItemResponse } from '@/api/__generated__/wallet/model/pageResponseUserSearchItemResponse';
import { searchUsers } from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';

export const SEARCH_USER_PAGE_SIZE = 20;

export function getSearchUsersQueryKey(keyword: string) {
  return [
    '/api/userWallet/user/search',
    { keyword, pageSize: SEARCH_USER_PAGE_SIZE },
    'infinite',
  ] as const;
}

export function fetchSearchUsers({
  keyword,
  page,
  signal,
}: {
  keyword: string;
  page: number;
  signal?: AbortSignal;
}) {
  return searchUsers(
    {
      keyword,
      page,
      pageSize: SEARCH_USER_PAGE_SIZE,
    },
    { signal },
  );
}

export function getSearchUsersNextPageParam(
  lastPage: { data?: unknown },
  _allPages: unknown[],
  lastPageParam: number,
) {
  const pageData =
    unwrapOrvalPayload<PageResponseUserSearchItemResponse>(lastPage);
  if (!pageData?.hasMore) {
    return undefined;
  }

  const currentPage =
    typeof pageData.page === 'number' &&
    Number.isInteger(pageData.page) &&
    pageData.page >= 1
      ? pageData.page
      : lastPageParam;

  return currentPage + 1;
}
