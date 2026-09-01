import type { QueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type { ListRewardDetailsParams } from '@/api/__generated__/mining/model/listRewardDetailsParams';
import type { ResultObject } from '@/api/__generated__/mining/model/resultObject';
import type { RewardDetailDTO as GeneratedRewardDetailDTO } from '@/api/__generated__/mining/model/rewardDetailDTO';
import { appAxiosInstance } from '@/api/appRequest';

type LegacyResponse<TData> =
  | { data: TData; status: 200; headers: Headers }
  | { data: ResultObject; status: 400; headers: Headers };

type LegacyQueryOptions<TResponse> = {
  query?: Omit<UseQueryOptions<TResponse>, 'queryKey' | 'queryFn'> & {
    queryKey?: readonly unknown[];
  };
  request?: RequestInit;
};

type CursorParams = {
  pageSize?: string | number;
  pageNum?: string | number;
  mark?: string | number;
  rewardType?: string;
};

export type GroupRevenueDTO = {
  assetId?: number;
  assetName?: string;
  stakedCount?: number;
  totalPayed?: number;
  totalRevenue?: number;
  ratio?: number;
};

export type PageGroupRevenueDTO = {
  records?: GroupRevenueDTO[];
  pageNumber?: number;
  pageSize?: number;
  totalPage?: number;
  totalRow?: number;
  optimizeCountQuery?: boolean;
};

export type MyStakeAmountResponse = {
  stakeAmount?: string;
  incomeAmount?: string;
};

export type RevenueSummaryResponse = {
  dramaTotal?: number;
  actorTotal?: number;
  storyTotal?: number;
  inviterTotal?: number;
};

export type StakedCountResponse = {
  dramaNftCount?: number;
  actorNftCount?: number;
};

export type PoolConfigResponse = {
  poolType?: string;
  rewardRatio?: string;
  rewardAmount?: string;
};

export type PoolIncomeResponse = {
  poolType?: string;
  score?: string;
  estimatedStory?: string;
};

export type MonthPoolResponse = {
  cycleNo?: string;
  nextSettleAt?: string;
  totalRewardAmount?: string;
  pools?: PoolConfigResponse[];
};

export type MyIncomeResponse = {
  totalScore?: string;
  estimatedStory?: string;
  pools?: PoolIncomeResponse[];
};

export type ScoreDetailResponse = {
  id?: string;
  eventId?: string;
  bizId?: string;
  eventType?: string;
  eventTypeName?: string;
  dramaId?: string;
  dramaName?: string;
  episodeId?: string;
  episodeNo?: number;
  startEpisodeNo?: number;
  endEpisodeNo?: number;
  userId?: string;
  poolType?: string;
  score?: string;
  receivedAt?: string;
  cycleNo?: string;
  status?: number;
  createdAt?: string;
  createAt?: string;
  updatedAt?: string;
};

export type SettlementRecordResponse = {
  cycleNo?: string;
  settledStory?: string;
  settledAt?: string;
  status?: string;
};

export type CursorPageResponseScoreDetailResponse = {
  pageSize?: string;
  mark?: string;
  hasMore?: boolean;
  list?: ScoreDetailResponse[];
};

export type CursorPageResponseSettlementRecordResponse = {
  pageSize?: string;
  mark?: string;
  hasMore?: boolean;
  list?: SettlementRecordResponse[];
};

export type CursorPageResponseRevenueDetailDTO = {
  pageSize?: string;
  mark?: string;
  hasMore?: boolean;
  list?: GeneratedRewardDetailDTO[];
};

export type RevenueDetailDTO = GeneratedRewardDetailDTO;

function appendParams(path: string, params?: CursorParams): string {
  const normalizedParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      normalizedParams.append(key, String(value));
    }
  });

  const stringifiedParams = normalizedParams.toString();
  return stringifiedParams ? `${path}?${stringifiedParams}` : path;
}

function getLegacy<TData>(
  url: string,
  options?: RequestInit,
): Promise<LegacyResponse<TData>> {
  return appAxiosInstance<LegacyResponse<TData>>(url, {
    ...options,
    method: 'GET',
  });
}

export const getGetSummaryQueryKey = () => [`/api/reward/summary`] as const;

export function useGetSummary(
  options?: LegacyQueryOptions<LegacyResponse<RevenueSummaryResponse>>,
  queryClient?: QueryClient,
) {
  const queryOptions = options?.query;
  return useQuery(
    {
      ...(queryOptions ?? {}),
      queryKey: queryOptions?.queryKey ?? getGetSummaryQueryKey(),
      queryFn: () =>
        getLegacy<RevenueSummaryResponse>(
          `/api/reward/summary`,
          options?.request,
        ),
    },
    queryClient,
  );
}

export const getGetStakedCountQueryKey = () =>
  [`/api/reward/stakedCount`] as const;

export function useGetStakedCount(
  options?: LegacyQueryOptions<LegacyResponse<StakedCountResponse>>,
  queryClient?: QueryClient,
) {
  const queryOptions = options?.query;
  return useQuery(
    {
      ...(queryOptions ?? {}),
      queryKey: queryOptions?.queryKey ?? getGetStakedCountQueryKey(),
      queryFn: () =>
        getLegacy<StakedCountResponse>(
          `/api/reward/stakedCount`,
          options?.request,
        ),
    },
    queryClient,
  );
}

export const getMyStakeAmountQueryKey = (params?: CursorParams) =>
  [`/api/mining/myStakeAmount`, ...(params ? [params] : [])] as const;

export function useMyStakeAmount(
  params?: CursorParams,
  options?: LegacyQueryOptions<LegacyResponse<MyStakeAmountResponse>>,
  queryClient?: QueryClient,
) {
  const queryOptions = options?.query;
  return useQuery(
    {
      ...(queryOptions ?? {}),
      queryKey: queryOptions?.queryKey ?? getMyStakeAmountQueryKey(params),
      queryFn: () =>
        getLegacy<MyStakeAmountResponse>(
          appendParams(`/api/mining/myStakeAmount`, params),
          options?.request,
        ),
    },
    queryClient,
  );
}

export const getGetGroupRevenueQueryKey = (params?: CursorParams) =>
  [`/api/reward/group`, ...(params ? [params] : [])] as const;

export function getGroupRevenue(params: CursorParams, options?: RequestInit) {
  return getLegacy<PageGroupRevenueDTO>(
    appendParams(`/api/reward/group`, params),
    options,
  );
}

export const getGetDetailsQueryKey = (params?: ListRewardDetailsParams) =>
  [`/api/reward/details`, ...(params ? [params] : [])] as const;

export function getDetails(
  params?: ListRewardDetailsParams,
  options?: RequestInit,
) {
  return getLegacy<CursorPageResponseRevenueDetailDTO>(
    appendParams(`/api/reward/details`, params),
    options,
  );
}

export const getMonthPoolQueryKey = () => [`/api/mining/monthPool`] as const;

export function useMonthPool(
  options?: LegacyQueryOptions<LegacyResponse<MonthPoolResponse>>,
  queryClient?: QueryClient,
) {
  const queryOptions = options?.query;
  return useQuery(
    {
      ...(queryOptions ?? {}),
      queryKey: queryOptions?.queryKey ?? getMonthPoolQueryKey(),
      queryFn: () =>
        getLegacy<MonthPoolResponse>(`/api/mining/monthPool`, options?.request),
    },
    queryClient,
  );
}

export const getMyIncomeQueryKey = () => [`/api/mining/myIncome`] as const;

export function useMyIncome(
  options?: LegacyQueryOptions<LegacyResponse<MyIncomeResponse>>,
  queryClient?: QueryClient,
) {
  const queryOptions = options?.query;
  return useQuery(
    {
      ...(queryOptions ?? {}),
      queryKey: queryOptions?.queryKey ?? getMyIncomeQueryKey(),
      queryFn: () =>
        getLegacy<MyIncomeResponse>(`/api/mining/myIncome`, options?.request),
    },
    queryClient,
  );
}

export const getScoresQueryKey = (params?: CursorParams) =>
  [`/api/mining/scores`, ...(params ? [params] : [])] as const;

export function scores(params?: CursorParams, options?: RequestInit) {
  return getLegacy<CursorPageResponseScoreDetailResponse>(
    appendParams(`/api/mining/scores`, params),
    options,
  );
}

export const getSettlementRecordsQueryKey = (params?: CursorParams) =>
  [`/api/mining/settlementRecords`, ...(params ? [params] : [])] as const;

export function settlementRecords(
  params?: CursorParams,
  options?: RequestInit,
) {
  return getLegacy<CursorPageResponseSettlementRecordResponse>(
    appendParams(`/api/mining/settlementRecords`, params),
    options,
  );
}
