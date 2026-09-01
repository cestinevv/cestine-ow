import type { CursorPageResponseLeaderboardItem } from '@/api/__generated__/wallet/model/cursorPageResponseLeaderboardItem';
import type { CursorPageResponsePointsLedgerItem } from '@/api/__generated__/wallet/model/cursorPageResponsePointsLedgerItem';
import type { DayCheckinVO } from '@/api/__generated__/wallet/model/dayCheckinVO';
import type { LeaderboardItem } from '@/api/__generated__/wallet/model/leaderboardItem';
import type { PointsLedgerItem } from '@/api/__generated__/wallet/model/pointsLedgerItem';
import {
  PointsLedgerItemSourceType,
  type PointsLedgerItemSourceType as PointsLedgerItemSourceTypeValue,
} from '@/api/__generated__/wallet/model/pointsLedgerItemSourceType';
import type { ShareAttemptResponse } from '@/api/__generated__/wallet/model/shareAttemptResponse';
import { ShareAttemptResponseStatus } from '@/api/__generated__/wallet/model/shareAttemptResponseStatus';
import type { SubmitShareAttemptRequestPlatform } from '@/api/__generated__/wallet/model/submitShareAttemptRequestPlatform';
import type { TaskStatusItem } from '@/api/__generated__/wallet/model/taskStatusItem';
import { TaskStatusItemStatus } from '@/api/__generated__/wallet/model/taskStatusItemStatus';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import type { ActivityConfig, ActivityRewardRankTier } from '@/stores/config';
import { formatDateFromMillisecond } from '@/utils/formatDate';
import { formatNumber } from '@/utils/formatNumber';
import { readSnowflakeId } from '@/utils/snowflakeId';

/** 活动任务 ID（与 OpenAPI completeTask 一致） */
export const STORY_1011_TASK_IDS = [
  'follow_x',
  'retweet_x',
  'like_x',
  'publish_drama',
  'watch_drama',
  'mining',
] as const;

export type Story1011TaskId = (typeof STORY_1011_TASK_IDS)[number];

export enum Story1011TaskKind {
  Social = 'social',
  Product = 'product',
}

export enum Story1011TaskIconKind {
  SocialX = 'socialX',
  Play = 'play',
}

export enum Story1011TaskAction {
  /** 社交 NOT_DONE：前往外链 */
  GoVisit = 'goVisit',
  Claim = 'claim',
  Claimed = 'claimed',
  GoComplete = 'goComplete',
}

type Story1011TaskMeta = {
  titleKey: string;
  categoryKey: string;
  icon: Story1011TaskIconKind;
  kind: Story1011TaskKind;
};

export const STORY_1011_TASK_META: Record<Story1011TaskId, Story1011TaskMeta> =
  {
    follow_x: {
      titleKey: '关注Twitter账号',
      categoryKey: '社交任务',
      icon: Story1011TaskIconKind.SocialX,
      kind: Story1011TaskKind.Social,
    },
    retweet_x: {
      titleKey: '转发推文',
      categoryKey: '社交任务',
      icon: Story1011TaskIconKind.SocialX,
      kind: Story1011TaskKind.Social,
    },
    like_x: {
      titleKey: '点赞推文',
      categoryKey: '社交任务',
      icon: Story1011TaskIconKind.SocialX,
      kind: Story1011TaskKind.Social,
    },
    publish_drama: {
      titleKey: '发布短剧',
      categoryKey: '产品互动',
      icon: Story1011TaskIconKind.Play,
      kind: Story1011TaskKind.Product,
    },
    watch_drama: {
      titleKey: '完播短剧',
      categoryKey: '产品互动',
      icon: Story1011TaskIconKind.Play,
      kind: Story1011TaskKind.Product,
    },
    mining: {
      titleKey: '派遣演员挖矿',
      categoryKey: '产品互动',
      icon: Story1011TaskIconKind.Play,
      kind: Story1011TaskKind.Product,
    },
  };

export function isStory1011TaskId(value: string): value is Story1011TaskId {
  return (STORY_1011_TASK_IDS as readonly string[]).includes(value);
}

/**
 * 按稿面 type 优先级整理接口任务项。
 * 支持同 type 多配置项（后管可重复 type）；不按 type 去重。
 */
export function orderStory1011Tasks(
  tasks: TaskStatusItem[] | undefined,
): TaskStatusItem[] {
  if (!tasks?.length) {
    return [];
  }

  // 保留接口相对次序，便于同 type 多条时稳定排序
  const withIndex: { task: TaskStatusItem; index: number }[] = [];

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];

    if (task.taskId === undefined) {
      continue;
    }

    if (!task.type || !isStory1011TaskId(task.type)) {
      continue;
    }

    withIndex.push({ task, index });
  }

  withIndex.sort((a, b) => {
    const typeA = a.task.type as Story1011TaskId;
    const typeB = b.task.type as Story1011TaskId;
    const orderA = STORY_1011_TASK_IDS.indexOf(typeA);
    const orderB = STORY_1011_TASK_IDS.indexOf(typeB);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.index - b.index;
  });

  return withIndex.map(({ task }) => task);
}

/**
 * 任务按钮态（按 type kind + status）：
 * - 社交：NOT_DONE→前往；DONE/CLAIMED→已领取
 * - 产品：NOT_DONE→去完成；DONE→领取；CLAIMED→已领取
 */
export function getStory1011TaskAction(
  task: TaskStatusItem,
): Story1011TaskAction | undefined {
  if (!task.type || !isStory1011TaskId(task.type)) {
    return undefined;
  }

  const meta = STORY_1011_TASK_META[task.type];

  if (meta.kind === Story1011TaskKind.Social) {
    if (
      task.status === TaskStatusItemStatus.CLAIMED ||
      task.status === TaskStatusItemStatus.DONE
    ) {
      return Story1011TaskAction.Claimed;
    }

    if (task.status === TaskStatusItemStatus.NOT_DONE) {
      return Story1011TaskAction.GoVisit;
    }

    return undefined;
  }

  if (task.status === TaskStatusItemStatus.CLAIMED) {
    return Story1011TaskAction.Claimed;
  }

  if (task.status === TaskStatusItemStatus.DONE) {
    return Story1011TaskAction.Claim;
  }

  if (task.status === TaskStatusItemStatus.NOT_DONE) {
    return Story1011TaskAction.GoComplete;
  }

  return undefined;
}

/**
 * 活动是否尚未开始（有 startAt 且当前时间早于开始时间）。
 * startAt 缺失时不视为「未开始」，避免 info 未就绪时误切未提交态。
 */
export function isStory1011ActivityNotStarted(
  activityStartAt: number | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (activityStartAt === undefined) {
    return false;
  }

  return nowMs < activityStartAt;
}

/**
 * 活动是否已结束（有 endAt 且当前时间不早于结束时间）。
 * endAt 缺失时不视为「已结束」，避免配置未就绪误隐藏模块。
 */
export function isStory1011ActivityEnded(
  activityEndAt: number | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (activityEndAt === undefined) {
    return false;
  }

  return nowMs >= activityEndAt;
}

/** 活动截止日展示：YYYY.MM.DD；缺失返回 undefined */
export function formatStory1011DeadlineDate(
  activityEndAt: number | undefined,
): string | undefined {
  if (activityEndAt === undefined) {
    return undefined;
  }

  return formatDateFromMillisecond(activityEndAt, 'YYYY.MM.DD');
}

/**
 * 全局 activity 配置（后管 activity key，含 activityId）。
 *
 * 时序注意：
 * - 首次访问：activityConfig 尚未写入 zustand persist，activityId 为空；
 *   依赖 activityId 的请求须等 useGlobalConfig 拉完并 setActivityConfig 后再 enabled。
 * - 之后访问：persist 水合后可立刻读到 activityId，订阅方应马上触发对应请求。
 */
export function resolveStory1011ActivityConfig(
  activityConfig: ActivityConfig | null | undefined,
): ActivityConfig | null {
  if (activityConfig?.activityId == null) {
    return null;
  }

  return activityConfig;
}

/**
 * 与后管 activity 配置口径一致：从 rewardRankTiers 的 amount 取最小/最大作为展示区间。
 */
export function getStory1011RewardBoundsFromRankTiers(
  rewardRankTiers: ActivityRewardRankTier[] | undefined,
): { minRewardAmount: number; maxRewardAmount: number } | undefined {
  if (!rewardRankTiers?.length) {
    return undefined;
  }

  let minRewardAmount = rewardRankTiers[0].amount;
  let maxRewardAmount = rewardRankTiers[0].amount;

  for (const tier of rewardRankTiers) {
    if (tier.amount < minRewardAmount) {
      minRewardAmount = tier.amount;
    }

    if (tier.amount > maxRewardAmount) {
      maxRewardAmount = tier.amount;
    }
  }

  return { minRewardAmount, maxRewardAmount };
}

/** 排行榜奖励区间展示用 $min/$max；任一缺失返回 undefined */
export function formatStory1011RewardRange(
  minRewardAmount: number | undefined,
  maxRewardAmount: number | undefined,
): { min: string; max: string } | undefined {
  if (minRewardAmount === undefined || maxRewardAmount === undefined) {
    return undefined;
  }

  return {
    min: `$${formatNumber(minRewardAmount)}`,
    max: `$${formatNumber(maxRewardAmount)}`,
  };
}

export enum Story1011CheckinDayState {
  Signed = 'signed',
  Claimable = 'claimable',
  Upcoming = 'upcoming',
  Missed = 'missed',
}

export enum Story1011BoardedTab {
  Tasks = 'tasks',
  Share = 'share',
  Leaderboard = 'leaderboard',
}

export enum Story1011ShareUiState {
  Empty = 'empty',
  Pending = 'pending',
  Rejected = 'rejected',
  Approved = 'approved',
}

/** 排行榜用户展示：优先 nickname，否则截断 userId */
export function formatStory1011UserLabel(
  userId: number | string | undefined | null,
  nickname?: string | null,
): string {
  const name = nickname?.trim();

  if (name) {
    return name;
  }

  const id = readSnowflakeId(userId) ?? String(userId ?? '').trim();

  if (!id) {
    return '—';
  }

  if (id.length <= 6) {
    return `U${id}`;
  }

  return `U…${id.slice(-4)}`;
}

export function getStory1011LeaderboardNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData =
    unwrapOrvalPayload<CursorPageResponseLeaderboardItem>(lastPage);

  if (!pageData?.hasMore) {
    return undefined;
  }

  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }

  if (pageData.mark === '-1') {
    return undefined;
  }

  const next = Number(pageData.mark);

  if (!Number.isFinite(next)) {
    return undefined;
  }

  return next;
}

export function mergeStory1011LeaderboardPages(
  pages: Array<{ data?: unknown }> | undefined,
): LeaderboardItem[] {
  if (!pages?.length) {
    return [];
  }

  const out: LeaderboardItem[] = [];

  for (const page of pages) {
    const pageData =
      unwrapOrvalPayload<CursorPageResponseLeaderboardItem>(page);
    const list = pageData?.list ?? [];

    for (const item of list) {
      out.push(item);
    }
  }

  return out;
}

const STORY_1011_POINTS_LEDGER_SOURCE_LABEL: Record<
  PointsLedgerItemSourceTypeValue,
  string
> = {
  [PointsLedgerItemSourceType.CHECKIN]: '签到',
  [PointsLedgerItemSourceType.FOLLOW_X]: '关注 StoryFun',
  [PointsLedgerItemSourceType.RETWEET]: '转推推文',
  [PointsLedgerItemSourceType.LIKE]: '点赞推文',
  [PointsLedgerItemSourceType.SHARE_X]: 'Twitter 传播数据',
  [PointsLedgerItemSourceType.SHARE_TIKTOK]: 'TikTok 传播数据',
  [PointsLedgerItemSourceType.SHARE_YOUTUBE]: 'YouTube 传播数据',
  [PointsLedgerItemSourceType.PUBLISH_DRAMA]: '发布短剧',
  [PointsLedgerItemSourceType.FINISH_DRAMA]: '完播短剧',
  [PointsLedgerItemSourceType.DISPATCH_MINING]: '派遣演员挖矿',
  [PointsLedgerItemSourceType.BIND_X]: '绑定X账号',
  [PointsLedgerItemSourceType.FINAL_SNAPSHOT]: '活动结束积分快照',
};

export function getStory1011PointsLedgerSourceLabelKey(
  sourceType: PointsLedgerItemSourceTypeValue | undefined,
): string | undefined {
  if (!sourceType) {
    return undefined;
  }

  return STORY_1011_POINTS_LEDGER_SOURCE_LABEL[sourceType];
}

export function getStory1011PointsLedgerNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData =
    unwrapOrvalPayload<CursorPageResponsePointsLedgerItem>(lastPage);

  if (!pageData?.hasMore) {
    return undefined;
  }

  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }

  if (pageData.mark === '-1') {
    return undefined;
  }

  const next = Number(pageData.mark);

  if (!Number.isFinite(next)) {
    return undefined;
  }

  return next;
}

export function mergeStory1011PointsLedgerPages(
  pages: Array<{ data?: unknown }> | undefined,
): PointsLedgerItem[] {
  if (!pages?.length) {
    return [];
  }

  const out: PointsLedgerItem[] = [];

  for (const page of pages) {
    const pageData =
      unwrapOrvalPayload<CursorPageResponsePointsLedgerItem>(page);
    const list = pageData?.list ?? [];

    for (const item of list) {
      out.push(item);
    }
  }

  return out;
}

function parseCheckinDate(date?: string): Date | undefined {
  if (!date?.trim()) {
    return undefined;
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function startOfLocalDay(value: Date): number {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  ).getTime();
}

/** 签到日卡状态：已签 / 今日可签 / 未到 / 已过 */
export function getStory1011DayState(
  record: DayCheckinVO,
  now = new Date(),
): Story1011CheckinDayState {
  if (record.isSigned) {
    return Story1011CheckinDayState.Signed;
  }

  const day = parseCheckinDate(record.date);

  if (!day) {
    return Story1011CheckinDayState.Upcoming;
  }

  const dayTs = startOfLocalDay(day);
  const todayTs = startOfLocalDay(now);

  if (dayTs === todayTs) {
    return Story1011CheckinDayState.Claimable;
  }

  if (dayTs > todayTs) {
    return Story1011CheckinDayState.Upcoming;
  }

  return Story1011CheckinDayState.Missed;
}

/** 签到日卡展示积分：按 dayOfWeek（1–7）取后管 checkinDailyPoints */
export function getStory1011CheckinDayPoints(
  dayOfWeek: number | undefined,
  checkinDailyPoints: number[] | undefined,
): number | undefined {
  if (dayOfWeek === undefined || !checkinDailyPoints?.length) {
    return undefined;
  }

  const index = dayOfWeek - 1;

  if (index < 0 || index >= checkinDailyPoints.length) {
    return undefined;
  }

  return checkinDailyPoints[index];
}

export function getStory1011ShareUiState(
  attempt: ShareAttemptResponse | undefined,
): Story1011ShareUiState {
  if (!attempt?.status) {
    return Story1011ShareUiState.Empty;
  }

  const status = String(attempt.status).toLowerCase();

  if (status === ShareAttemptResponseStatus.pending_approval) {
    return Story1011ShareUiState.Pending;
  }

  if (status === ShareAttemptResponseStatus.rejected) {
    return Story1011ShareUiState.Rejected;
  }

  if (status === ShareAttemptResponseStatus.approved) {
    return Story1011ShareUiState.Approved;
  }

  return Story1011ShareUiState.Empty;
}

export function findShareAttemptByPlatform(
  attempts: ShareAttemptResponse[] | undefined,
  platform: SubmitShareAttemptRequestPlatform,
): ShareAttemptResponse | undefined {
  const target = String(platform).toLowerCase();

  return attempts?.find(
    (item) => String(item.platform ?? '').toLowerCase() === target,
  );
}
