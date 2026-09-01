import type { UserSearchItemResponse } from '@/api/__generated__/wallet/model/userSearchItemResponse';
import {
  getUserFollowAction,
  getUserFollowLabel,
  getUserNextFollowStatus,
  isUserFollowing,
  parseUserFollowStatus,
  USER_FOLLOW_STATUS,
  type UserFollowAction,
  type UserFollowStatus,
} from '@/features/profile/profileFollowStatus';
import { isNumeric, isPositive, minus, plus } from '@/utils/mathUtil';
import { readSnowflakeId } from '@/utils/snowflakeId';

export const SEARCH_USER_FOLLOW_STATUS = USER_FOLLOW_STATUS;
export type SearchUserFollowStatus = UserFollowStatus;
export type SearchUserFollowAction = UserFollowAction;
export const parseSearchUserFollowStatus = parseUserFollowStatus;
export const getSearchUserFollowAction = getUserFollowAction;
export const getSearchUserNextFollowStatus = getUserNextFollowStatus;
export const getSearchUserFollowLabel = getUserFollowLabel;
export const isSearchUserFollowing = isUserFollowing;

export function updateSearchUserFollowItem(
  item: UserSearchItemResponse,
  targetUserId: string,
  action: SearchUserFollowAction,
): UserSearchItemResponse {
  if (readSnowflakeId(item.userId) !== targetUserId) {
    return item;
  }

  const followStatus = getSearchUserNextFollowStatus(item.followStatus, action);
  if (!followStatus) {
    return item;
  }

  const followerCount = item.followerCount;
  if (followerCount === undefined || !isNumeric(followerCount)) {
    return { ...item, followStatus };
  }

  return {
    ...item,
    followStatus,
    followerCount:
      action === 'follow'
        ? plus(followerCount, 1)
        : isPositive(followerCount)
          ? minus(followerCount, 1)
          : followerCount,
  };
}
