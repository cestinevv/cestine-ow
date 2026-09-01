import { useMemo } from 'react';

import { useListDeployedActors } from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { getGameActorRowKey } from '@/features/game/constants/gameActorConfig';
import { GAME_DEPLOY_SLOT_COUNT } from '@/features/game/constants/gameConstants';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import useGlobalStore from '@/stores/global';

export type GameTodoItem =
  | {
      id: string;
      kind: 'vacancy';
      vacancyCount: number;
    }
  | {
      id: string;
      kind: 'exhausted';
      actor: ActorDTO;
    };

export function useGameTodoItems() {
  const isLogin = useGlobalStore((state) => state.isLogin);

  const { data: deployedResponse } = useListDeployedActors({
    query: {
      enabled: isLogin,
      retry: false,
    },
  });

  const deployedActors = useMemo(
    () => unwrapOrvalPayload<ActorDTO[]>(deployedResponse) ?? [],
    [deployedResponse],
  );

  const vacancyCount = Math.max(
    0,
    GAME_DEPLOY_SLOT_COUNT - deployedActors.length,
  );

  const todoItems = useMemo((): GameTodoItem[] => {
    const items: GameTodoItem[] = [];

    if (vacancyCount > 0) {
      items.push({
        id: 'vacancy',
        kind: 'vacancy',
        vacancyCount,
      });
    }

    for (const actor of deployedActors.filter(
      (deployed) => deployed.stamina === 0,
    )) {
      items.push({
        id: `exhausted-${getGameActorRowKey(actor)}`,
        kind: 'exhausted',
        actor,
      });
    }

    return items;
  }, [deployedActors, vacancyCount]);

  const exhaustedCount = useMemo(
    () => deployedActors.filter((deployed) => deployed.stamina === 0).length,
    [deployedActors],
  );

  // 标题计数：槽位内体力为 0 的数量 + 有空槽时计 1 项（与 vacancy 单行待办一致）
  const todoCount = exhaustedCount + (vacancyCount > 0 ? 1 : 0);

  return {
    todoItems,
    todoCount,
  };
}
