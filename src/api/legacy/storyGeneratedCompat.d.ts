import type { NftInfo } from '@/api/__generated__/story/model/nftInfo';
import type {
  ActorCollectionInfo,
  CreatorInfo,
} from '@/api/legacy/storyCompatModels';

declare module '@/api/__generated__/story/model/dramaEditSessionResponse' {
  interface DramaEditSessionResponse {
    actorCollections?: ActorCollectionInfo[];
  }
}

declare module '@/api/__generated__/story/model/dramaInfo' {
  interface DramaInfo {
    desc?: string;
    coverImg?: string;
    favoriteCount?: number;
    totalRatingUserCount?: number;
    creatorName?: string;
    creatorUserId?: number | string;
    userInfo?: CreatorInfo;
    creator?: CreatorInfo;
    nft?: NftInfo;
  }
}
