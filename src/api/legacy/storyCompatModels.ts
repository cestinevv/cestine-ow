import type { ActorCollectionInfo as GeneratedActorCollectionInfo } from '@/api/__generated__/story/model/actorCollectionInfo';

/**
 * 与旧 `BoundActorCollection` / 现行 generate `ActorCollectionInfo` 同构。
 * OpenAPI 已将 schema 更名为 ActorCollectionInfo，业务侧仍可用此别名。
 */
export type BoundActorCollection = GeneratedActorCollectionInfo;

/**
 * OpenAPI 已移除 `CreatorInfo` schema。
 * 过渡期详情、Feed 映射与 module augmentation 仍依赖此形状，故落在 legacy。
 */
export type CreatorInfo = {
  userId?: number | string;
  nickname?: string;
  avatarUrl?: string;
};

/** 扁平 actorCollections（过渡期详情 / 仅 IP）形状 */
export type ActorCollectionInfo = BoundActorCollection & {
  actorCollectionId?: number;
  actorCollectionName?: string;
  actorCollectionAvatar?: string;
  avatarUrl?: string;
};

/**
 * OpenAPI 已移除 `RoleInfo`（详情改回扁平 actorCollections）。
 * 播放角色面板仍统一消费此形状，由 `resolvePlayDetailRoles` 做映射。
 */
export type RoleInfo = {
  id?: number;
  name?: string;
  description?: string;
  avatar?: string;
  sortNo?: number;
  boundActorCollection?: BoundActorCollection;
};
