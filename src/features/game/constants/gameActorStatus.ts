import type { ActorDTOStatus } from '@/api/__generated__/mining/model/actorDTOStatus';
import { ActorDTOStatus as ActorDTOStatusEnum } from '@/api/__generated__/mining/model/actorDTOStatus';

/** listAllActors ActorDTO.status → i18n key */
const GAME_ACTOR_STATUS_LABEL_KEYS: Record<ActorDTOStatus, '挖矿中' | '闲置'> =
  {
    [ActorDTOStatusEnum.MINING]: '挖矿中',
    [ActorDTOStatusEnum.REST]: '闲置',
  } as const;

export function getGameActorStatusLabelKey(
  status: ActorDTOStatus | undefined,
): (typeof GAME_ACTOR_STATUS_LABEL_KEYS)[ActorDTOStatus] | undefined {
  if (status === undefined) {
    return undefined;
  }

  return GAME_ACTOR_STATUS_LABEL_KEYS[status];
}
