import type { listDramas } from '@/api/__generated__/story/create-drama/create-drama';
import type { getCreatorStats } from '@/api/__generated__/story/create-stats/create-stats';
import type { DramaDetailResponse } from '@/api/__generated__/story/model/dramaDetailResponse';
import type { ListDramasParams } from '@/api/__generated__/story/model/listDramasParams';
import { ListDramasStatus } from '@/api/__generated__/story/model/listDramasStatus';
import type { PageDtoDramaDetailResponse } from '@/api/__generated__/story/model/pageDtoDramaDetailResponse';
import type { DramaNftPositionItemResponse } from '@/api/__generated__/wallet/model/dramaNftPositionItemResponse';
import type { DramaNftPositionPageResponse } from '@/api/__generated__/wallet/model/dramaNftPositionPageResponse';
import type { positions } from '@/api/__generated__/wallet/userwallet-dramanft/userwallet-dramanft';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { toNumber } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

import type { NarratorReviewFilter } from './constants/narratorManagementTabs';
import { NarratorReviewFilter as NarratorReviewFilterEnum } from './constants/narratorManagementTabs';

/** creator/dramas 列表 API 路径（失效缓存时作 queryKey 前缀） */
export const CREATOR_DRAMA_LIST_QUERY_KEY_PREFIX =
  `/api/mini-drama/creator/dramas` as const;

/** 叙述者中心 — creator/dramas 单页条数 */
export const NARRATOR_CREATOR_DRAMA_LIST_PAGE_SIZE = 20;

/** @deprecated 请使用 buildCreatorDramaListParams + 无限分页；保留供旧调用方类型引用 */
export const NARRATOR_CREATOR_DRAMA_LIST_PARAMS = {
  pageSize: NARRATOR_CREATOR_DRAMA_LIST_PAGE_SIZE,
} as const satisfies ListDramasParams;

/** 审核筛选 Tab → listDramas `status`（全部不传） */
export function mapNarratorReviewFilterToListDramasStatus(
  filter: NarratorReviewFilter,
): ListDramasParams['status'] | undefined {
  if (filter === NarratorReviewFilterEnum.Pending) {
    return ListDramasStatus.PENDING_REVIEW;
  }

  if (filter === NarratorReviewFilterEnum.Rejected) {
    return ListDramasStatus.REVIEW_REJECTED;
  }

  if (filter === NarratorReviewFilterEnum.Approved) {
    return ListDramasStatus.ONLINE;
  }

  if (filter === NarratorReviewFilterEnum.Offline) {
    return ListDramasStatus.OFFLINE;
  }

  return undefined;
}

/** 叙述者短剧管理列表请求参数（不含游标 mark） */
export function buildCreatorDramaListParams(
  filter: NarratorReviewFilter,
): ListDramasParams {
  const status = mapNarratorReviewFilterToListDramasStatus(filter);

  return {
    pageSize: NARRATOR_CREATOR_DRAMA_LIST_PAGE_SIZE,
    ...(status !== undefined ? { status } : {}),
  };
}

/** creator/dramas mark 分页：hasMore 为真时透传上一页 mark */
export function getCreatorDramaCursorNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData = unwrapOrvalPayload<PageDtoDramaDetailResponse>(lastPage);

  if (!pageData?.hasMore) {
    return undefined;
  }

  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }

  if (String(pageData.mark) === '-1') {
    return undefined;
  }

  const mark = toNumber(pageData.mark);
  return Number.isFinite(mark) ? mark : undefined;
}

/** 合并无限分页多页短剧列表（按 id 去重） */
export function mergeCreatorDramaPages(
  pages: Awaited<ReturnType<typeof listDramas>>[] | undefined,
): DramaDetailResponse[] {
  if (!pages?.length) {
    return [];
  }

  const seenIds = new Set<string>();
  const rows: DramaDetailResponse[] = [];

  for (const page of pages) {
    for (const row of extractCreatorDramaRows(page)) {
      const idKey = readSnowflakeId(row.id) ?? String(row.id ?? '');
      if (!idKey || seenIds.has(idKey)) {
        continue;
      }

      seenIds.add(idKey);
      rows.push(row);
    }
  }

  return rows;
}

/** dramaNft/positions 查询 key 前缀（失效缓存时覆盖概览与列表） */
export const DRAMA_NFT_POSITIONS_QUERY_KEY_PREFIX =
  `/api/userWallet/dramaNft/positions` as const;

/** 叙述者概览 — dramaNft/positions 首页参数（mark=0 时响应带 total） */
export const NARRATOR_DRAMA_NFT_POSITIONS_OVERVIEW_PARAMS = {
  mark: 0,
  pageSize: 1,
} as const;

/** 短剧 NFT Tab — dramaNft/positions 列表参数 */
export const NARRATOR_DRAMA_NFT_POSITIONS_PAGE_SIZE = 20;

export const NARRATOR_DRAMA_NFT_POSITIONS_LIST_PARAMS = {
  mark: 0,
  pageSize: NARRATOR_DRAMA_NFT_POSITIONS_PAGE_SIZE,
} as const;

/** dramaNft/positions mark 分页：hasMore 为真时透传上一页 mark */
export function getDramaNftPositionsCursorNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData = unwrapOrvalPayload<DramaNftPositionPageResponse>(lastPage);

  if (!pageData?.hasMore) {
    return undefined;
  }

  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }

  if (String(pageData.mark) === '-1') {
    return undefined;
  }

  const mark = toNumber(pageData.mark);
  return Number.isFinite(mark) ? mark : undefined;
}

/** 合并无限分页多页短剧 NFT 持仓列表（按 dramaId / nftContractAddress 去重） */
export function mergeDramaNftPositionPages(
  pages: Awaited<ReturnType<typeof positions>>[] | undefined,
): DramaNftPositionItemResponse[] {
  if (!pages?.length) {
    return [];
  }

  const seenIds = new Set<string>();
  const rows: DramaNftPositionItemResponse[] = [];

  for (const page of pages) {
    for (const row of extractDramaNftPositionRows(page)) {
      const idKey =
        readSnowflakeId(row.dramaId) ??
        row.nftContractAddress?.trim() ??
        String(row.createdAt ?? '');
      if (!idKey || seenIds.has(idKey)) {
        continue;
      }

      seenIds.add(idKey);
      rows.push(row);
    }
  }

  return rows;
}

/** 从 listDramas 响应体中取出短剧数组（兼容 BaseResponse + PageDto.list）。 */
export function extractCreatorDramaRows(
  res: Awaited<ReturnType<typeof listDramas>> | undefined,
): DramaDetailResponse[] {
  if (res?.status !== 200) {
    return [];
  }

  const outer = res.data as unknown;
  if (!outer || typeof outer !== 'object') {
    return [];
  }

  const record = outer as Record<string, unknown>;
  const inner = record.data;

  if (inner && typeof inner === 'object') {
    const dataObj = inner as Record<string, unknown>;
    const list = dataObj.list;
    if (Array.isArray(list)) {
      return list as DramaDetailResponse[];
    }
  }

  if (Array.isArray(inner)) {
    return inner as DramaDetailResponse[];
  }

  return [];
}

/** 从 dramaNft/positions 响应体中取出持仓列表 */
export function extractDramaNftPositionRows(
  res: Awaited<ReturnType<typeof positions>> | undefined,
): DramaNftPositionItemResponse[] {
  if (res?.status !== 200) {
    return [];
  }

  const page = unwrapOrvalPayload<DramaNftPositionPageResponse>(res);
  return page?.list ?? [];
}

/** 发布短剧数：public/users/{userId}/stats → dramaCount */
export function extractOnlineDramaCount(
  res: Awaited<ReturnType<typeof getCreatorStats>> | undefined,
): number | undefined {
  if (res?.status !== 200) {
    return undefined;
  }

  const stats = unwrapOrvalPayload<{ dramaCount?: number }>(res);
  if (stats?.dramaCount === undefined || stats.dramaCount === null) {
    return undefined;
  }

  const total = toNumber(stats.dramaCount);
  return Number.isFinite(total) ? total : undefined;
}

/** 持有 NFT 数：dramaNft/positions 首页 total */
export function extractDramaNftPositionsTotal(
  res: Awaited<ReturnType<typeof positions>> | undefined,
): number | undefined {
  if (res?.status !== 200) {
    return undefined;
  }

  const page = unwrapOrvalPayload<DramaNftPositionPageResponse>(res);
  if (page?.total === undefined || page.total === null || page.total === '') {
    return undefined;
  }

  const total = toNumber(page.total);
  return Number.isFinite(total) ? total : undefined;
}
