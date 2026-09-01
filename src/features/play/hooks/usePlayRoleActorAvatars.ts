import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { RoleInfo } from '@/api/legacy/storyCompatModels';
import { resolveActorAvatarUrl } from '@/features/actor/actorFormat';
import {
  getActorPublicDetail,
  getActorPublicDetailQueryKey,
} from '@/features/actor/actorPublicApi';
import {
  getPlayRoleDisplayInfo,
  type PlayRoleDisplayInfo,
  unwrapOrvalPayload,
} from '@/features/play/playFormat';

/** 详情角色区：已绑定补拉演员 IP 头像，待定仍用角色 avatar */
export function usePlayRoleActorAvatars(roles: RoleInfo[] | undefined): {
  roleDisplays: PlayRoleDisplayInfo[];
} {
  const roleList = roles ?? [];

  const boundActorIdsMissingAvatar = useMemo(() => {
    const ids = new Set<string>();

    for (const role of roleList) {
      const display = getPlayRoleDisplayInfo(role);
      if (!display.isPending && display.actorId && !display.avatar) {
        ids.add(display.actorId);
      }
    }

    return [...ids];
  }, [roleList]);

  const actorDetailQueries = useQueries({
    queries: boundActorIdsMissingAvatar.map((actorId) => ({
      queryKey: getActorPublicDetailQueryKey(actorId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getActorPublicDetail(actorId, { signal }),
      enabled: actorId.length > 0,
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
  });

  const actorAvatarById = useMemo(() => {
    const map = new Map<string, string>();

    boundActorIdsMissingAvatar.forEach((actorId, index) => {
      const detail = unwrapOrvalPayload<ActorCollectionResponse>(
        actorDetailQueries[index]?.data,
      );
      const avatarUrl = detail ? resolveActorAvatarUrl(detail) : undefined;

      if (avatarUrl) {
        map.set(actorId, avatarUrl);
      }
    });

    return map;
  }, [actorDetailQueries, boundActorIdsMissingAvatar]);

  const roleDisplays = useMemo(
    () => roleList.map((role) => getPlayRoleDisplayInfo(role, actorAvatarById)),
    [actorAvatarById, roleList],
  );

  return { roleDisplays };
}
