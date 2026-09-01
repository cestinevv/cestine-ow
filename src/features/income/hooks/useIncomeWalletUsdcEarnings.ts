import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  getUsdcIncomeQueryKey,
  usdcIncome,
} from '@/api/__generated__/wallet/userwallet-income/userwallet-income';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';
import {
  getUsdcIncomeTotalFromPages,
  getWalletEarningsCursorNextPageParam,
  mapUsdcIncomeItemToRow,
  mergeUsdcIncomePages,
} from '../incomeWalletEarningsFormat';

export function useIncomeWalletUsdcEarnings(enabled: boolean) {
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );

  const requestParams = useMemo(
    () => ({
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
  );

  const query = useInfiniteQuery({
    queryKey: [
      ...getUsdcIncomeQueryKey(requestParams),
      walletQueryKeyScope,
    ] as const,
    queryFn: ({ pageParam }) =>
      usdcIncome({
        ...requestParams,
        // mark 游标可能是雪花 ID 字符串，运行时原样透传，禁止 Number() 转换
        mark: pageParam as number,
      }),
    initialPageParam: 0 as string | number,
    getNextPageParam: getWalletEarningsCursorNextPageParam,
    retry: false,
    enabled: isLogin && enabled,
  });

  const rawRows = useMemo(
    () => mergeUsdcIncomePages(query.data?.pages),
    [query.data?.pages],
  );

  const rows = useMemo(
    () => rawRows.map((item, index) => mapUsdcIncomeItemToRow(item, index)),
    [rawRows],
  );

  const totalUsdcEarnings = useMemo(
    () => getUsdcIncomeTotalFromPages(query.data?.pages),
    [query.data?.pages],
  );

  return {
    rows,
    totalUsdcEarnings,
    isPending: query.isPending,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLogin,
  };
}
