import { toNumber } from 'lodash-es';
import type { listDramas } from '@/api/__generated__/story/create-drama/create-drama';
import type { listMyShortVideos } from '@/api/__generated__/story/create-shortvideo/create-shortvideo';
import type { getCreatorStats } from '@/api/__generated__/story/create-stats/create-stats';
import type { ActorCollectionInfoResponse } from '@/api/__generated__/story/model/actorCollectionInfoResponse';
import type { CreatorStatsResponse } from '@/api/__generated__/story/model/creatorStatsResponse';
import type { DramaDetailResponse } from '@/api/__generated__/story/model/dramaDetailResponse';
import type { ListDramasParams } from '@/api/__generated__/story/model/listDramasParams';
import { ListDramasStatus } from '@/api/__generated__/story/model/listDramasStatus';
import type { ListMyShortVideosParams } from '@/api/__generated__/story/model/listMyShortVideosParams';
import { ListMyShortVideosStatus } from '@/api/__generated__/story/model/listMyShortVideosStatus';
import type { PageDtoDramaDetailResponse } from '@/api/__generated__/story/model/pageDtoDramaDetailResponse';
import type { PageDtoShortVideoListItemResponse } from '@/api/__generated__/story/model/pageDtoShortVideoListItemResponse';
import type { ShortVideoListItemResponse } from '@/api/__generated__/story/model/shortVideoListItemResponse';
import { readSnowflakeId } from '@/utils/snowflakeId';

export enum CreationManagementTab {
  Dramas = 'dramas',
  Videos = 'videos',
}

export type CreationReviewFilter =
  | 'all'
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'offline';

export const CREATION_MANAGEMENT_TABS = [
  { value: CreationManagementTab.Dramas, labelKey: '短剧' },
  { value: CreationManagementTab.Videos, labelKey: '视频' },
] as const satisfies readonly {
  value: CreationManagementTab;
  labelKey: string;
}[];

export const CREATION_REVIEW_FILTERS = [
  { value: 'all', labelKey: '全部' },
  { value: 'approved', labelKey: '已通过' },
  { value: 'pending', labelKey: '审核中' },
  { value: 'rejected', labelKey: '未通过' },
  { value: 'offline', labelKey: '已下架' },
] as const satisfies readonly {
  value: CreationReviewFilter;
  labelKey: string;
}[];

export const CREATION_MANAGEMENT_PAGE_SIZE = 20;

/** 创作管理列表/统计：不缓存，每次进入或切换 tab 重新请求 */
export const CREATION_MANAGEMENT_NO_CACHE_QUERY = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: 'always' as const,
} as const;

function unwrapCreationPayload<T>(response: { data?: unknown }): T | undefined {
  const outer = response.data;
  if (!outer || typeof outer !== 'object') {
    return undefined;
  }

  const record = outer as Record<string, unknown>;
  const inner = record.data;
  if (inner === undefined) {
    return outer as T;
  }

  return inner as T;
}

export function mapCreationReviewFilterToStatus(
  filter: CreationReviewFilter,
): ListDramasParams['status'] | undefined {
  if (filter === 'approved') {
    return ListDramasStatus.ONLINE;
  }

  if (filter === 'pending') {
    return ListDramasStatus.PENDING_REVIEW;
  }

  if (filter === 'rejected') {
    return ListDramasStatus.REVIEW_REJECTED;
  }

  if (filter === 'offline') {
    return ListDramasStatus.OFFLINE;
  }

  return undefined;
}

export function mapCreationReviewFilterToShortVideoStatus(
  filter: CreationReviewFilter,
): ListMyShortVideosParams['status'] | undefined {
  if (filter === 'approved') {
    return ListMyShortVideosStatus.ONLINE;
  }

  if (filter === 'pending') {
    return ListMyShortVideosStatus.PENDING_REVIEW;
  }

  if (filter === 'rejected') {
    return ListMyShortVideosStatus.REVIEW_REJECTED;
  }

  if (filter === 'offline') {
    return ListMyShortVideosStatus.OFFLINE;
  }

  return undefined;
}

export function extractCreatorStats(
  res: Awaited<ReturnType<typeof getCreatorStats>> | undefined,
): CreatorStatsResponse | undefined {
  if (res?.status !== 200) {
    return undefined;
  }

  return unwrapCreationPayload<CreatorStatsResponse>(res);
}

export function buildCreationDramaListParams(
  filter: CreationReviewFilter,
): ListDramasParams {
  const status = mapCreationReviewFilterToStatus(filter);

  return {
    pageSize: CREATION_MANAGEMENT_PAGE_SIZE,
    ...(status ? { status } : {}),
  };
}

export function buildCreationShortVideoListParams(
  filter: CreationReviewFilter,
): ListMyShortVideosParams {
  const status = mapCreationReviewFilterToShortVideoStatus(filter);

  return {
    pageSize: CREATION_MANAGEMENT_PAGE_SIZE,
    ...(status ? { status } : {}),
  };
}

export function getCreationCursorNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData = unwrapCreationPayload<
    PageDtoDramaDetailResponse | PageDtoShortVideoListItemResponse
  >(lastPage);

  if (!pageData?.hasMore || pageData.mark == null) {
    return undefined;
  }

  if (String(pageData.mark) === '-1') {
    return undefined;
  }

  const mark = toNumber(pageData.mark);
  return Number.isFinite(mark) ? mark : undefined;
}

export function getCreationDramaRows(
  pages: Awaited<ReturnType<typeof listDramas>>[] | undefined,
): DramaDetailResponse[] {
  const rows: DramaDetailResponse[] = [];
  const seen = new Set<string>();

  for (const page of pages ?? []) {
    if (page?.status !== 200) {
      continue;
    }

    const data = unwrapCreationPayload<PageDtoDramaDetailResponse>(page);
    for (const item of data?.list ?? []) {
      const key = readSnowflakeId(item.id) ?? String(item.id ?? '');
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      rows.push(item);
    }
  }

  return rows;
}

export function getCreationShortVideoRows(
  pages: Awaited<ReturnType<typeof listMyShortVideos>>[] | undefined,
): ShortVideoListItemResponse[] {
  const rows: ShortVideoListItemResponse[] = [];
  const seen = new Set<string>();

  for (const page of pages ?? []) {
    if (page?.status !== 200) {
      continue;
    }

    const data = unwrapCreationPayload<PageDtoShortVideoListItemResponse>(page);
    for (const item of data?.list ?? []) {
      const key =
        readSnowflakeId(item.episodeId) ?? String(item.episodeId ?? '');
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      rows.push(item);
    }
  }

  return rows;
}

/** 创作管理：仅「已通过 / ONLINE」可进入播放 */
export function isCreationPlayableStatus(status: string | undefined): boolean {
  return status === 'ONLINE';
}

/** 创作管理：不可播放时的 toast 文案 key（DELETED 与其它非 ONLINE 区分） */
export function getCreationPlayBlockToastKey(
  status: string | undefined,
): '作品不存在，无法查看' | '作品未上架，暂不可查看' {
  if (status === 'DELETED') {
    return '作品不存在，无法查看';
  }

  return '作品未上架，暂不可查看';
}

export function getCreationActorRentTotal(
  actors: readonly Pick<ActorCollectionInfoResponse, 'computingPower'>[] = [],
): number {
  return actors.reduce((total, actor) => {
    const value = toNumber(actor.computingPower);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

export function getCreationActorName(
  actor: Pick<ActorCollectionInfoResponse, 'actorCollectionId'> & {
    actorCollectionName?: string;
    name?: string;
  },
): string {
  return (
    actor.name?.trim() ||
    actor.actorCollectionName?.trim() ||
    readSnowflakeId(actor.actorCollectionId) ||
    '-'
  );
}

export function getCreationActorId(
  actor: Pick<ActorCollectionInfoResponse, 'actorCollectionId'>,
): string | undefined {
  return readSnowflakeId(actor.actorCollectionId);
}
