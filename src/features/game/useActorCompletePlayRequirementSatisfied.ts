import { useMemo } from 'react';

import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { useActorCollectionDetail } from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import { getGameActorUpgradeConfig } from '@/features/game/constants/gameActorConfig';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { useConfigStore } from '@/stores/config';
import { isGreaterThanOrEqual } from '@/utils/mathUtil';

type UseActorCompletePlayRequirementSatisfiedOptions = {
  enabled?: boolean;
};

/** 角色 IP 合集累计完播是否满足当前咖位升级阈值（与升级弹窗展示口径一致） */
export function useActorCompletePlayRequirementSatisfied(
  actor: ActorDTO | null | undefined,
  options?: UseActorCompletePlayRequirementSatisfiedOptions,
) {
  const initConfig = useConfigStore((state) => state.initConfig);
  const enabled = options?.enabled ?? true;

  const heatThreshold = getGameActorUpgradeConfig(
    initConfig ?? undefined,
    actor?.level,
  )?.heatThreshold;

  const actorCollectionId = actor?.actorCollectionId;
  const canFetchActorCollection = enabled && actorCollectionId !== undefined;

  const {
    data: actorCollectionResponse,
    isPending: isActorCollectionPending,
    isFetching: isActorCollectionFetching,
  } = useActorCollectionDetail(actorCollectionId ?? 0, {
    query: {
      enabled: canFetchActorCollection,
      retry: false,
      refetchOnMount: true,
    },
  });

  const actorCollectionDetail = useMemo(
    () => unwrapOrvalPayload<ActorCollectionResponse>(actorCollectionResponse),
    [actorCollectionResponse],
  );

  const completedViewCount = actorCollectionDetail?.completedViewCount;

  const isActorCollectionLoading =
    canFetchActorCollection &&
    (isActorCollectionPending || isActorCollectionFetching);

  const isHeatRequirementMet =
    heatThreshold !== undefined &&
    completedViewCount !== undefined &&
    isGreaterThanOrEqual(completedViewCount, heatThreshold);

  return {
    completedViewCount,
    heatThreshold,
    isActorCollectionLoading,
    isHeatRequirementMet,
  };
}
