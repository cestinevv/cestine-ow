import { useMemo } from 'react';

import { useUpgradableCount } from '@/api/__generated__/mining/actor-level-upgrade/actor-level-upgrade';
import type { UpgradableActorCountResponse } from '@/api/__generated__/mining/model/upgradableActorCountResponse';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import useGlobalStore from '@/stores/global';

export function useGameUpgradableActorCount() {
  const isLogin = useGlobalStore((state) => state.isLogin);

  const {
    data: upgradableCountResponse,
    isPending,
    isError,
  } = useUpgradableCount({
    query: {
      enabled: isLogin,
      retry: false,
    },
  });

  const upgradableActorCount = useMemo(() => {
    if (isPending || isError) {
      return undefined;
    }

    return unwrapOrvalPayload<UpgradableActorCountResponse>(
      upgradableCountResponse,
    )?.count;
  }, [isError, isPending, upgradableCountResponse]);

  return {
    upgradableActorCount,
    isPending,
    isError,
  };
}
