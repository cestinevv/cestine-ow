import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getGetSettlingRewardQueryKey,
  getSettlingReward,
} from '@/api/__generated__/mining/mining/mining';
import type { SettlingRewardDTO } from '@/api/__generated__/mining/model/settlingRewardDTO';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';

import { getSettlingStoryEarningsFromReward } from '../incomeWalletEarningsFormat';

export function useIncomeWalletStorySettlingReward(enabled: boolean) {
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
    queryKey: [...getGetSettlingRewardQueryKey(), walletQueryKeyScope] as const,
    queryFn: ({ signal }) => getSettlingReward({ signal }),
    retry: false,
    enabled: isLogin && enabled,
  });

  const settlingStoryEarnings = useMemo(() => {
    const reward = unwrapOrvalPayload<SettlingRewardDTO>(query.data);
    return getSettlingStoryEarningsFromReward(reward);
  }, [query.data]);

  return {
    settlingStoryEarnings,
    isPending: query.isPending,
    isError: query.isError,
    isLogin,
  };
}
