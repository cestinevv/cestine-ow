import type {
  actorCastDramasResponse,
  actorCollectionDetailResponse,
} from '@/api/__generated__/story/actor-i-p/actor-i-p';
import {
  actorCastDramas,
  actorCollectionDetail,
  getActorCastDramasQueryKey,
  getActorCollectionDetailQueryKey,
} from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { ActorCastDramasParams } from '@/api/__generated__/story/model/actorCastDramasParams';
import { readSnowflakeId } from '@/utils/snowflakeId';

function toGeneratedActorCollectionId(actorId: string): number {
  return actorId as unknown as number;
}

export function getActorPublicDetailQueryKey(actorId: string) {
  const idText = readSnowflakeId(actorId);
  return getActorCollectionDetailQueryKey(
    toGeneratedActorCollectionId(idText ?? ''),
  );
}

export function getActorPublicCastDramasQueryKey(
  actorId: string,
  params?: ActorCastDramasParams,
) {
  const idText = readSnowflakeId(actorId);
  return getActorCastDramasQueryKey(
    toGeneratedActorCollectionId(idText ?? ''),
    params,
  );
}

export async function getActorPublicDetail(
  actorId: string,
  options?: RequestInit,
): Promise<actorCollectionDetailResponse> {
  return actorCollectionDetail(toGeneratedActorCollectionId(actorId), options);
}

export async function getActorPublicCastDramas(
  actorId: string,
  params?: ActorCastDramasParams,
  options?: RequestInit,
): Promise<actorCastDramasResponse> {
  return actorCastDramas(
    toGeneratedActorCollectionId(actorId),
    params,
    options,
  );
}
