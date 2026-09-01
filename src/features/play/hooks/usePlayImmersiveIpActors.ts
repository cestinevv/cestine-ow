import { useMemo } from 'react';

import type { ActorCollectionInfoResponse } from '@/api/__generated__/recommend/model/actorCollectionInfoResponse';
import type { RoleInfo } from '@/api/legacy/storyCompatModels';
import { PLAY_DRAMA_ACTOR_DISPLAY_LIMIT } from '@/features/play/constants/playDramaActorLimit';
import { usePlayRoleActorAvatars } from '@/features/play/hooks/usePlayRoleActorAvatars';
import {
  getPlayRoleBoundActor,
  type PlayRoleDisplayInfo,
} from '@/features/play/playFormat';
import { readSnowflakeId } from '@/utils';

export type PlayImmersiveIpActor = PlayRoleDisplayInfo & {
  /** 暂用算力顶片酬：Feed 取 actors.computingPower，剧场取详情 boundActorCollection.computingPower */
  computingPower?: number;
};

/** 推荐 Feed 左侧 IP 列：只读 feed.actors，翻页不再打 actor 公开详情 */
export function mapFeedActorsToIpActors(
  actors: ActorCollectionInfoResponse[] | undefined,
): PlayImmersiveIpActor[] {
  if (!actors || actors.length === 0) {
    return [];
  }

  const out: PlayImmersiveIpActor[] = [];
  for (const actor of actors) {
    if (out.length >= PLAY_DRAMA_ACTOR_DISPLAY_LIMIT) {
      break;
    }

    out.push({
      actorId: readSnowflakeId(actor.actorCollectionId),
      actorName: actor.actorCollectionName,
      avatar: actor.actorCollectionAvatar?.trim() || undefined,
      isPending: false,
      computingPower: actor.computingPower,
    });
  }

  return out;
}

/**
 * 剧场剧集播放左侧 IP 列：短剧详情经 resolvePlayDetailRoles 归一化后的 roles。
 * 短视频沉浸页无角色 Tab，左侧 IP 走 Feed.actors（mapFeedActorsToIpActors）。
 */
export function usePlayImmersiveIpActors(
  roles: RoleInfo[] | undefined,
): PlayImmersiveIpActor[] {
  const { roleDisplays } = usePlayRoleActorAvatars(roles);

  return useMemo(() => {
    const roleList = roles ?? [];
    const out: PlayImmersiveIpActor[] = [];

    for (let index = 0; index < roleDisplays.length; index++) {
      if (out.length >= PLAY_DRAMA_ACTOR_DISPLAY_LIMIT) {
        break;
      }

      const display = roleDisplays[index];
      if (display.isPending || !display.actorId) {
        continue;
      }

      out.push({
        ...display,
        computingPower: getPlayRoleBoundActor(roleList[index])?.computingPower,
      });
    }

    return out;
  }, [roleDisplays, roles]);
}
