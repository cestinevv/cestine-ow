import type { DramaInfo } from '@/api/__generated__/story/model/dramaInfo';
import type {
  ActorCollectionInfo,
  RoleInfo,
} from '@/api/legacy/storyCompatModels';

export type PlaybackRule = {
  totalEpisodes?: number;
  freeEps?: number;
  priceUsdtPerEp?: number;
  batchUnlockDiscountRate?: number;
  unlockedEpsCount?: number;
};

export type CloudFrontSignedCookies = {
  policy?: string;
  signature?: string;
  keyPairId?: string;
  expires?: number;
};

/**
 * 公开详情运行时形状。
 * - 现行 OpenAPI：`roles`（短剧角色 + boundActorCollection）
 * - 过渡期 / 中间版 generate：曾用扁平 `actorCollections`（仅 IP）
 * 展示层请走 `resolvePlayDetailRoles`，勿只读其中一个字段。
 */
export type DramaStatisticsResponse = {
  dramaInfo?: DramaInfo;
  roles?: RoleInfo[];
  actorCollections?: ActorCollectionInfo[];
  playbackRule?: PlaybackRule;
  cloudFrontSignedCookies?: CloudFrontSignedCookies;
  cloudFrontCookieDomain?: string;
  totalEpisodes?: number;
};
