export const USER_FOLLOW_STATUS = {
  NONE: 'NONE',
  FOLLOWING: 'FOLLOWING',
  FOLLOW_BACK: 'FOLLOW_BACK',
  MUTUAL: 'MUTUAL',
  SELF: 'SELF',
} as const;

export type UserFollowStatus =
  (typeof USER_FOLLOW_STATUS)[keyof typeof USER_FOLLOW_STATUS];

export type UserFollowAction = 'follow' | 'unfollow';

export function parseUserFollowStatus(
  status?: string,
): UserFollowStatus | undefined {
  return Object.values(USER_FOLLOW_STATUS).find((value) => value === status);
}

export function getUserFollowAction(
  status?: string,
): UserFollowAction | undefined {
  const parsedStatus = parseUserFollowStatus(status);
  if (
    parsedStatus === USER_FOLLOW_STATUS.NONE ||
    parsedStatus === USER_FOLLOW_STATUS.FOLLOW_BACK
  ) {
    return 'follow';
  }
  if (
    parsedStatus === USER_FOLLOW_STATUS.FOLLOWING ||
    parsedStatus === USER_FOLLOW_STATUS.MUTUAL
  ) {
    return 'unfollow';
  }
  return undefined;
}

export function getUserNextFollowStatus(
  status: string | undefined,
  action: UserFollowAction,
): UserFollowStatus | undefined {
  const parsedStatus = parseUserFollowStatus(status);
  if (action === 'follow') {
    if (parsedStatus === USER_FOLLOW_STATUS.NONE) {
      return USER_FOLLOW_STATUS.FOLLOWING;
    }
    if (parsedStatus === USER_FOLLOW_STATUS.FOLLOW_BACK) {
      return USER_FOLLOW_STATUS.MUTUAL;
    }
  }
  if (action === 'unfollow') {
    if (parsedStatus === USER_FOLLOW_STATUS.FOLLOWING) {
      return USER_FOLLOW_STATUS.NONE;
    }
    if (parsedStatus === USER_FOLLOW_STATUS.MUTUAL) {
      return USER_FOLLOW_STATUS.FOLLOW_BACK;
    }
  }
  return undefined;
}

export function getUserFollowLabel(status?: string) {
  const parsedStatus = parseUserFollowStatus(status);
  if (parsedStatus === USER_FOLLOW_STATUS.FOLLOW_BACK) {
    return '回关';
  }
  if (parsedStatus === USER_FOLLOW_STATUS.MUTUAL) {
    return '互关';
  }
  if (parsedStatus === USER_FOLLOW_STATUS.FOLLOWING) {
    return '已关注';
  }
  return '关注';
}

export function isUserFollowing(status?: string) {
  const parsedStatus = parseUserFollowStatus(status);
  return (
    parsedStatus === USER_FOLLOW_STATUS.FOLLOWING ||
    parsedStatus === USER_FOLLOW_STATUS.MUTUAL
  );
}
