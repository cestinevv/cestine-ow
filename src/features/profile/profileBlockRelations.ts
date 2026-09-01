import { BlockRelationResponseRelation } from '@/api/__generated__/wallet/model/blockRelationResponseRelation';

export type ProfileBlockRelation =
  (typeof BlockRelationResponseRelation)[keyof typeof BlockRelationResponseRelation];

export type ProfileBlockedInteraction =
  | 'follow'
  | 'comment'
  | 'like'
  | 'favorite'
  | 'rating';

export function isProfileBlockedByMe(relation?: ProfileBlockRelation) {
  return (
    relation === BlockRelationResponseRelation.BLOCKED_BY_ME ||
    relation === BlockRelationResponseRelation.MUTUAL_BLOCK
  );
}

export function isProfileBlockedByOther(relation?: ProfileBlockRelation) {
  return (
    relation === BlockRelationResponseRelation.BLOCKED_BY_OTHER ||
    relation === BlockRelationResponseRelation.MUTUAL_BLOCK
  );
}

export function isProfileContentBlocked(relation?: ProfileBlockRelation) {
  return isProfileBlockedByMe(relation) || isProfileBlockedByOther(relation);
}

export function getProfileBlockedContentCopy(relation?: ProfileBlockRelation) {
  if (isProfileBlockedByMe(relation)) {
    return {
      titleKey: '对方已被你拉黑',
      descriptionKey: '你已拉黑对方，无法查看其作品',
    };
  }

  return {
    titleKey: '由于对方设置',
    descriptionKey: '你无法查看TA的内容',
  };
}

export function getProfileBlockedInteractionToastKey({
  relation,
  interaction,
}: {
  relation?: ProfileBlockRelation;
  interaction: ProfileBlockedInteraction;
}) {
  if (!isProfileContentBlocked(relation)) {
    return undefined;
  }

  if (isProfileBlockedByMe(relation)) {
    if (interaction === 'follow') {
      return '黑名单用户，无法关注';
    }
    if (interaction === 'comment') {
      return '黑名单用户，无法评论';
    }
    if (interaction === 'like') {
      return '黑名单用户，无法点赞';
    }
    if (interaction === 'favorite') {
      return '黑名单用户，无法收藏';
    }
    return '黑名单用户，无法评分';
  }

  if (interaction === 'follow') {
    return '由于对方设置，你无法关注TA';
  }
  if (interaction === 'comment') {
    return '由于对方设置，你无法评论TA';
  }
  if (interaction === 'like') {
    return '由于对方设置，你无法点赞';
  }
  if (interaction === 'favorite') {
    return '由于对方设置，你无法收藏';
  }
  return '由于对方设置，你无法评分';
}
