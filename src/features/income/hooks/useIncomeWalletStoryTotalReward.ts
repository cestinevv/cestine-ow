import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getGetTotalRewardQueryKey,
  getTotalReward,
} from '@/api/__generated__/mining/mining/mining';
import type { TotalRewardDTO } from '@/api/__generated__/mining/model/totalRewardDTO';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';

import { getTotalStoryEarningsFromReward } from '../incomeWalletEarningsFormat';

export function useIncomeWalletStoryTotalReward(enabled: boolean) {
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
  );

  const query = useQuery({
    queryKey: [...getGetTotalRewardQueryKey(), walletQueryKeyScope] as const,
    queryFn: ({ signal }) => getTotalReward({ signal }),
    retry: false,
    enabled: isLogin && enabled,
  });

  const totalStoryEarnings = useMemo(() => {
    const reward = unwrapOrvalPayload<TotalRewardDTO>(query.data);
    return getTotalStoryEarningsFromReward(reward);
  }, [query.data]);

  return {
    totalStoryEarnings,
    isPending: query.isPending,
    isError: query.isError,
    isLogin,
  };
}
