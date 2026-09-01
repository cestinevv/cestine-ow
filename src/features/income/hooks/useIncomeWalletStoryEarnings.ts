import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  getListRewardDetailsQueryKey,
  listRewardDetails,
} from '@/api/__generated__/mining/mining/mining';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';
import {
  getWalletEarningsCursorNextPageParam,
  type IncomeStoryEarningsFilter,
  mapStoryEarningsFilterToListRewardDetailsType,
  mapStoryRewardDetailToRow,
  mergeStoryRewardDetailPages,
} from '../incomeWalletEarningsFormat';

type UseIncomeWalletStoryEarningsOptions = {
  enabled: boolean;
  filter: IncomeStoryEarningsFilter;
};

export function useIncomeWalletStoryEarnings({
  enabled,
  filter,
}: UseIncomeWalletStoryEarningsOptions) {
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );

  const rewardType = useMemo(
    () => mapStoryEarningsFilterToListRewardDetailsType(filter),
    [filter],
  );

  const queryParams = useMemo(
    () => ({
      type: rewardType,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    [rewardType],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
  );

  const query = useInfiniteQuery({
    queryKey: [
      ...getListRewardDetailsQueryKey(queryParams),
      walletQueryKeyScope,
    ] as const,
    queryFn: ({ pageParam }) =>
      listRewardDetails({
        ...queryParams,
        mark: pageParam as number,
      }),
    initialPageParam: 0 as string | number,
    getNextPageParam: getWalletEarningsCursorNextPageParam,
    retry: false,
    enabled: isLogin && enabled,
  });

  const rows = useMemo(() => {
    const rewardDetails = mergeStoryRewardDetailPages(query.data?.pages);
    return rewardDetails.map((item, index) =>
      mapStoryRewardDetailToRow(item, index),
    );
  }, [query.data?.pages]);

  return {
    rows,
    isPending: query.isPending,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLogin,
  };
}
