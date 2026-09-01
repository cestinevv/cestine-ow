import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import type { CreatorInfo } from '@/api/legacy/storyCompatModels';
import { readSnowflakeId } from '@/utils/snowflakeId';

type CreatorUserInfoExtras = {
  userId?: number | string;
};

type DramaListItemCreatorExtras = {
  creatorId?: number | string;
  userId?: number | string;
  creatorUserId?: number | string;
  userInfo?: CreatorUserInfoExtras;
  creator?: CreatorInfo & CreatorUserInfoExtras;
};

/** 列表项作者 userId（雪花 ID 保持字符串，避免精度丢失）。 */
export function getDramaListItemCreatorProfileUserId(
  item: DramaListItemResponse,
): string | undefined {
  const extended = item as DramaListItemResponse & DramaListItemCreatorExtras;

  return (
    readSnowflakeId(extended.creatorId) ??
    readSnowflakeId(extended.creatorUserId) ??
    readSnowflakeId(extended.userId) ??
    readSnowflakeId(extended.userInfo?.userId) ??
    readSnowflakeId(extended.creator?.userId)
  );
}
