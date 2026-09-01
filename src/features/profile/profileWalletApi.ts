import type { SubmitUgcReportRequest } from '@/api/__generated__/story/model/submitUgcReportRequest';
import type { UgcReportTypeItemResponse } from '@/api/__generated__/story/model/ugcReportTypeItemResponse';
import type { BlockRelationResponse } from '@/api/__generated__/wallet/model/blockRelationResponse';
import type { CursorPageResponseFollowListItemResponse } from '@/api/__generated__/wallet/model/cursorPageResponseFollowListItemResponse';
import type { FollowRelationResponse } from '@/api/__generated__/wallet/model/followRelationResponse';
import type { FollowStatsResponse } from '@/api/__generated__/wallet/model/followStatsResponse';
import type { OtherUserInfoResponse } from '@/api/__generated__/wallet/model/otherUserInfoResponse';
import type { otherUserInfoResponse } from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
import { appAxiosInstance } from '@/api/appRequest';
import {
  fetchUgcReportTypes,
  getUgcReportTypesQueryKey,
  requestUgcReportUser,
} from '@/features/ugc/ugcReportApi';
import { readSnowflakeId } from '@/utils/snowflakeId';

export function getProfileOtherUserInfoQueryKey(userId: string) {
  const idText = readSnowflakeId(userId);
  return ['/api/userWallet/otherUserInfo', { userId: idText }] as const;
}

type WalletEnvelopeResponse<T> = {
  data?: {
    data?: T;
  };
  status: number;
};

type ProfileFollowListKind = 'followings' | 'followers' | 'mutuals';

function encodeProfileUserIdPathSegment(userId: string): string {
  const idText = readSnowflakeId(userId);
  if (!idText) {
    throw new Error('用户 ID 无效或已丢失精度，请刷新后重试');
  }

  return encodeURIComponent(idText);
}

function getProfileOtherUserInfoUrl(userId: string): string {
  const idText = readSnowflakeId(userId);
  if (!idText) {
    throw new Error('用户 ID 无效');
  }

  const params = new URLSearchParams({ userId: idText });
  return `/api/userWallet/otherUserInfo?${params.toString()}`;
}

/** 他人公开资料（query userId 保持字符串，避免雪花 ID 精度丢失） */
export function fetchProfileOtherUserInfo(
  userId: string,
  options?: RequestInit,
): Promise<otherUserInfoResponse> {
  return appAxiosInstance<otherUserInfoResponse>(
    getProfileOtherUserInfoUrl(userId),
    {
      ...options,
      method: 'GET',
    },
  );
}

export function getProfileFollowStatsQueryKey(userId: string) {
  const idText = readSnowflakeId(userId);
  return ['/api/userWallet/users/follow/stats', { userId: idText }] as const;
}

export function getProfileRelationQueryKey(userId: string) {
  const idText = readSnowflakeId(userId);
  return ['/api/userWallet/users/relation', { userId: idText }] as const;
}

export function getProfileBlockRelationQueryKey(userId: string) {
  const idText = readSnowflakeId(userId);
  return ['/api/userWallet/users/blockRelation', { userId: idText }] as const;
}

export function getProfileReportTypesQueryKey() {
  return getUgcReportTypesQueryKey('USER');
}

export async function fetchProfileRelation(
  userId: string,
  options?: RequestInit,
): Promise<FollowRelationResponse | undefined> {
  const idText = encodeProfileUserIdPathSegment(userId);
  const response = await appAxiosInstance<
    WalletEnvelopeResponse<FollowRelationResponse>
  >(`/api/userWallet/users/${idText}/relation`, {
    ...options,
    method: 'GET',
  });

  return response.data?.data;
}

export async function fetchProfileFollowStats(
  userId: string,
  options?: RequestInit,
): Promise<FollowStatsResponse | undefined> {
  const idText = encodeProfileUserIdPathSegment(userId);
  const response = await appAxiosInstance<
    WalletEnvelopeResponse<FollowStatsResponse>
  >(`/api/userWallet/users/${idText}/follow/stats`, {
    ...options,
    method: 'GET',
  });

  return response.data?.data;
}

export async function fetchProfileBlockRelation(
  userId: string,
  options?: RequestInit,
): Promise<BlockRelationResponse | undefined> {
  const idText = encodeProfileUserIdPathSegment(userId);
  const response = await appAxiosInstance<
    WalletEnvelopeResponse<BlockRelationResponse>
  >(`/api/userWallet/users/${idText}/blockRelation`, {
    ...options,
    method: 'GET',
  });

  return response.data?.data;
}

export async function fetchProfileReportTypes(
  options?: RequestInit,
): Promise<UgcReportTypeItemResponse[]> {
  return fetchUgcReportTypes('USER', options);
}

export function getProfileFollowListQueryKey(
  userId: string,
  kind: ProfileFollowListKind,
) {
  const idText = readSnowflakeId(userId);
  return [
    '/api/userWallet/users/follow-list',
    { userId: idText, kind },
  ] as const;
}

export async function fetchProfileFollowList({
  userId,
  kind,
  mark,
  pageSize,
  options,
}: {
  userId: string;
  kind: ProfileFollowListKind;
  mark?: string;
  pageSize: number;
  options?: RequestInit;
}): Promise<CursorPageResponseFollowListItemResponse> {
  const idText = encodeProfileUserIdPathSegment(userId);
  const params = new URLSearchParams({
    mark: mark ?? '0',
    pageSize: String(pageSize),
  });
  const response = await appAxiosInstance<
    WalletEnvelopeResponse<CursorPageResponseFollowListItemResponse>
  >(`/api/userWallet/users/${idText}/${kind}?${params.toString()}`, {
    ...options,
    method: 'GET',
  });

  return response.data?.data ?? {};
}

export async function requestProfileFollow(
  targetUserId: string,
  options?: RequestInit,
) {
  const idText = encodeProfileUserIdPathSegment(targetUserId);
  return appAxiosInstance<WalletEnvelopeResponse<unknown>>(
    `/api/userWallet/follow/${idText}`,
    {
      ...options,
      method: 'POST',
    },
  );
}

export async function requestProfileUnfollow(
  targetUserId: string,
  options?: RequestInit,
) {
  const idText = encodeProfileUserIdPathSegment(targetUserId);
  return appAxiosInstance<WalletEnvelopeResponse<unknown>>(
    `/api/userWallet/follow/${idText}`,
    {
      ...options,
      method: 'DELETE',
    },
  );
}

export async function requestProfileRemoveFollower(
  followerId: string,
  options?: RequestInit,
) {
  const idText = encodeProfileUserIdPathSegment(followerId);
  return appAxiosInstance<WalletEnvelopeResponse<unknown>>(
    `/api/userWallet/follower/${idText}`,
    {
      ...options,
      method: 'DELETE',
    },
  );
}

export async function requestProfileBlock(
  targetUserId: string,
  options?: RequestInit,
) {
  const idText = encodeProfileUserIdPathSegment(targetUserId);
  return appAxiosInstance<WalletEnvelopeResponse<unknown>>(
    `/api/userWallet/block/${idText}`,
    {
      ...options,
      method: 'POST',
    },
  );
}

export async function requestProfileUnblock(
  targetUserId: string,
  options?: RequestInit,
) {
  const idText = encodeProfileUserIdPathSegment(targetUserId);
  return appAxiosInstance<WalletEnvelopeResponse<unknown>>(
    `/api/userWallet/block/${idText}`,
    {
      ...options,
      method: 'DELETE',
    },
  );
}

export async function requestProfileReportUser({
  targetUserId,
  data,
  options,
}: {
  targetUserId: string;
  data: SubmitUgcReportRequest;
  options?: RequestInit;
}) {
  return requestUgcReportUser({ targetUserId, data, options });
}

export type { OtherUserInfoResponse };
