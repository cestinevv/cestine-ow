import type { CursorPageResponseInviteRecordItemResponse } from '@/api/__generated__/wallet/model/cursorPageResponseInviteRecordItemResponse';
import type { InviteInfoResponse } from '@/api/__generated__/wallet/model/inviteInfoResponse';
import type { InviteRecordItemResponse } from '@/api/__generated__/wallet/model/inviteRecordItemResponse';

import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { minus, trunc } from '@/utils/mathUtil';

export function unwrapInviteInfo(
  response: { data?: unknown } | undefined,
): InviteInfoResponse | undefined {
  return unwrapOrvalPayload<InviteInfoResponse>(response) ?? undefined;
}

/** 待激活人数 = 总邀请人数 − 有效用户数 */
export function readPendingInviteCount(
  totalInviteCount?: string,
  validUserCount?: string,
): string | undefined {
  if (totalInviteCount === undefined || validUserCount === undefined) {
    return undefined;
  }

  return trunc(minus(totalInviteCount, validUserCount));
}

/** 邀请记录是否有效用户：接口 `isValid` 为 1 表示有效，0 表示待激活 */
export function readInviteRecordIsValid(
  record: InviteRecordItemResponse,
): boolean {
  return record.isValid === 1;
}

export type InviteRebateRecordItem = {
  orderNo?: string;
  inviteeUserId?: string;
  nickname?: string;
  avatarUrl?: string;
  assetCode?: string;
  consumeAmount?: string | number;
  rebateAmount?: string | number;
  createdAt?: string;
};

type CursorPageInviteRebateRecord = {
  list?: InviteRebateRecordItem[];
  mark?: string;
  hasMore?: boolean;
};

export function unwrapInviteRecordsPage(
  response: { data?: unknown } | undefined,
): CursorPageResponseInviteRecordItemResponse | undefined {
  return (
    unwrapOrvalPayload<CursorPageResponseInviteRecordItemResponse>(response) ??
    undefined
  );
}

export function unwrapInviteRebateRecordsPage(
  response: { data?: unknown } | undefined,
): CursorPageInviteRebateRecord | undefined {
  return (
    unwrapOrvalPayload<CursorPageInviteRebateRecord>(response) ?? undefined
  );
}

/** `/api/userWallet/inviteRecords` 游标分页：响应 mark 为 string，请求 mark 为 number */
export function getInviteRecordsNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData = unwrapInviteRecordsPage(lastPage);
  if (!pageData?.hasMore) {
    return undefined;
  }
  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }
  if (pageData.mark === '-1') {
    return undefined;
  }

  return Number(pageData.mark);
}

/** `/api/userWallet/inviteRebateRecords` 游标分页：响应 mark 为 string，请求 mark 为 number */
export function getInviteRebateRecordsNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData = unwrapInviteRebateRecordsPage(lastPage);
  if (!pageData?.hasMore) {
    return undefined;
  }
  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }
  if (pageData.mark === '-1') {
    return undefined;
  }

  return Number(pageData.mark);
}

export function mergeInviteRecords(
  pages: Array<{ data?: unknown }> | undefined,
): InviteRecordItemResponse[] {
  if (!pages?.length) {
    return [];
  }

  const merged: InviteRecordItemResponse[] = [];
  for (const page of pages) {
    const pageData = unwrapInviteRecordsPage(page);
    const list = pageData?.list ?? [];
    for (const item of list) {
      merged.push(item);
    }
  }

  return merged;
}

export function mergeInviteRebateRecords(
  pages: Array<{ data?: unknown }> | undefined,
): InviteRebateRecordItem[] {
  if (!pages?.length) {
    return [];
  }

  const merged: InviteRebateRecordItem[] = [];
  for (const page of pages) {
    const pageData = unwrapInviteRebateRecordsPage(page);
    const list = pageData?.list ?? [];
    for (const item of list) {
      merged.push(item);
    }
  }

  return merged;
}
