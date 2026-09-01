import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { toNumber } from 'lodash-es';
import type {
  PoolConfigResponse,
  PoolIncomeResponse,
  ScoreDetailResponse,
} from '@/api/legacy/miningLegacyApi';
import { formatDateFromMillisecond } from '@/utils/formatDate';
import { formatNumber } from '@/utils/formatNumber';
import {
  isLessThanOrEqualTo,
  isPositive,
  multipliedBy,
} from '@/utils/mathUtil';

dayjs.extend(utc);
dayjs.extend(timezone);

export const MINING_POOL_TYPES = [
  'CREATOR',
  'VIEWER',
  'WITNESS',
  'INVITER',
] as const;

export type MiningPoolType = (typeof MINING_POOL_TYPES)[number];

const MINING_POOL_NAME_KEY: Record<MiningPoolType, string> = {
  CREATOR: '创作者池',
  VIEWER: '观众池',
  WITNESS: '见证者池',
  INVITER: '邀请者池',
};

const MINING_POOL_SCORE_DISPLAY_KEY: Record<MiningPoolType, string> = {
  CREATOR: '叙事价值分: {{score}}',
  VIEWER: '互动分: {{score}}',
  WITNESS: '质押挖矿分: {{score}}',
  INVITER: '邀请价值分: {{score}}',
};

export const MINING_SCORE_EVENT_TYPES = [
  'EPISODE_COMPLETE',
  'DRAMA_REVIEW',
  'DRAMA_FAVORITE',
  'EPISODE_LIKE',
  'SINGLE_UNLOCK',
  'BATCH_UNLOCK',
  'EPISODE_COMMENT',
  'EPISODE_COMMENT_LIKE',
  'DRAMA_REVIEW_LIKE',
  'UNLOCK_PAY',
  'STAKE',
  'SUPPORTER_COUNT',
] as const;

export type MiningScoreEventType = (typeof MINING_SCORE_EVENT_TYPES)[number];

const MINING_SCORE_EVENT_MESSAGE_KEY: Record<MiningScoreEventType, string> = {
  EPISODE_COMPLETE: '完播《{{dramaName}}》第{{episodeNo}}集',
  DRAMA_REVIEW: '评分《{{dramaName}}》',
  DRAMA_FAVORITE: '收藏《{{dramaName}}》',
  EPISODE_LIKE: '点赞《{{dramaName}}》第{{episodeNo}}集',
  SINGLE_UNLOCK: '付费解锁《{{dramaName}}》第{{episodeNo}}集',
  BATCH_UNLOCK:
    '付费解锁《{{dramaName}}》第{{startEpisodeNo}}集-第{{endEpisodeNo}}集',
  EPISODE_COMMENT: '评论《{{dramaName}}》第{{episodeNo}}集',
  EPISODE_COMMENT_LIKE: '点赞《{{dramaName}}》第{{episodeNo}}集的评论',
  DRAMA_REVIEW_LIKE: '点赞《{{dramaName}}》评分',
  UNLOCK_PAY: '付费解锁《{{dramaName}}》',
  STAKE: '参与质押《{{dramaName}}》',
  SUPPORTER_COUNT: '支持者人数',
};

/** 批量解锁但首尾集号相同时，退化为单集展示，使用 startEpisodeNo 变量 */
const BATCH_UNLOCK_SINGLE_EPISODE_KEY =
  '付费解锁《{{dramaName}}》第{{startEpisodeNo}}集';

export type MiningScoreEventMessageParams = {
  dramaName?: string;
  episodeNo?: number;
  startEpisodeNo?: number;
  endEpisodeNo?: number;
};

type MiningCursorPage = {
  hasMore?: boolean;
  mark?: string;
  list?: unknown[];
};

export function unwrapOrvalPayload<T>(
  response: { data?: unknown } | undefined,
): T | null | undefined {
  const axiosJson = response?.data as { data?: T | null } | undefined;
  return axiosJson?.data;
}

/** monthPool 接口成功但 data 为 null，表示本期挖矿尚未启动 */
export function isMiningMonthPoolNotStarted(
  monthPool: unknown,
): monthPool is null {
  return monthPool === null;
}

export function getMiningPoolNameKey(poolType?: string): string | undefined {
  if (!poolType) {
    return undefined;
  }
  return MINING_POOL_NAME_KEY[poolType as MiningPoolType];
}

export function getMiningPoolScoreDisplayKey(
  poolType?: string,
): string | undefined {
  if (!poolType) {
    return undefined;
  }
  return MINING_POOL_SCORE_DISPLAY_KEY[poolType as MiningPoolType];
}

export function getMiningScoreEventMessageKey(
  eventType?: string,
  record?: Pick<ScoreDetailResponse, 'startEpisodeNo' | 'endEpisodeNo'>,
): string | undefined {
  if (!eventType) {
    return undefined;
  }

  if (
    eventType === 'BATCH_UNLOCK' &&
    record?.startEpisodeNo !== undefined &&
    record.startEpisodeNo === record.endEpisodeNo
  ) {
    return BATCH_UNLOCK_SINGLE_EPISODE_KEY;
  }

  return MINING_SCORE_EVENT_MESSAGE_KEY[eventType as MiningScoreEventType];
}

export function getMiningScoreEventMessageParams(
  record: ScoreDetailResponse,
): MiningScoreEventMessageParams {
  const params: MiningScoreEventMessageParams = {};

  if (record.dramaName) {
    params.dramaName = record.dramaName;
  }
  if (record.episodeNo !== undefined && record.episodeNo !== null) {
    params.episodeNo = record.episodeNo;
  }
  if (record.startEpisodeNo !== undefined && record.startEpisodeNo !== null) {
    params.startEpisodeNo = record.startEpisodeNo;
  }
  if (record.endEpisodeNo !== undefined && record.endEpisodeNo !== null) {
    params.endEpisodeNo = record.endEpisodeNo;
  }

  return params;
}

export function getMiningScoreCreatedAt(
  record: Pick<ScoreDetailResponse, 'createdAt' | 'createAt'>,
): string | undefined {
  return record.createdAt ?? record.createAt;
}

/** 矿池价值分展示：零值显示为 `0`，并去除多余小数尾零 */
export function formatMiningScore(
  score?: string | number | null,
): string | undefined {
  if (score === undefined || score === null || score === '') {
    return undefined;
  }

  const formatted = formatNumber(score, 6);
  if (formatted === '-') {
    return undefined;
  }

  return formatted;
}

export function formatMiningStoryAmount(amount?: string): string | undefined {
  if (amount === undefined || amount === null || amount === '') {
    return undefined;
  }

  const formatted = formatNumber(amount, 2);
  if (formatted === '-') {
    return undefined;
  }

  return `${formatted} STORY`;
}

/** 可领取 STORY 是否大于 0（用于禁用领取按钮） */
export function hasMiningClaimableStory(amount?: string): boolean {
  return isPositive(amount);
}

export function formatMiningRewardPercent(ratio?: string): string | undefined {
  if (ratio === undefined || ratio === null || ratio === '') {
    return undefined;
  }

  const percentValue = isLessThanOrEqualTo(ratio, 1)
    ? multipliedBy(ratio, 100)
    : ratio;
  const formatted = formatNumber(percentValue, 0);

  if (formatted === '-') {
    return undefined;
  }

  return formatted;
}

/** 下次结算展示：固定东八区 `YYYY/MM/DD HH:mm UTC+8` */
export function formatMiningNextSettlement(
  nextSettleAt?: string,
): string | undefined {
  if (
    nextSettleAt === undefined ||
    nextSettleAt === null ||
    nextSettleAt === ''
  ) {
    return undefined;
  }

  const formatted = dayjs(toNumber(nextSettleAt))
    .tz('Asia/Shanghai')
    .format('YYYY/MM/DD HH:mm');

  return `${formatted} UTC+8`;
}

export function formatMiningScoreOccurredAt(createAt?: string): string {
  if (createAt === undefined || createAt === null || createAt === '') {
    return '';
  }

  return formatDateFromMillisecond(createAt, 'YYYY-MM-DD HH:mm');
}

export function formatMiningSettlementDate(settledAt?: string): string {
  if (settledAt === undefined || settledAt === null || settledAt === '') {
    return '';
  }

  return formatDateFromMillisecond(settledAt, 'YYYY-MM-DD');
}

export function getMiningCursorNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData = unwrapOrvalPayload<MiningCursorPage>(lastPage);
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

export function mergePoolsByType<T extends { poolType?: string }>(
  pools: T[] | undefined,
): Array<{ poolType: MiningPoolType; pool?: T }> {
  return MINING_POOL_TYPES.map((poolType) => ({
    poolType,
    pool: pools?.find((item) => item.poolType === poolType),
  }));
}

export function mergeMonthPoolConfigs(
  pools: PoolConfigResponse[] | undefined,
): Array<{ poolType: MiningPoolType; pool?: PoolConfigResponse }> {
  return mergePoolsByType(pools);
}

export function mergeIncomePools(
  pools: PoolIncomeResponse[] | undefined,
): Array<{ poolType: MiningPoolType; pool?: PoolIncomeResponse }> {
  return mergePoolsByType(pools);
}
