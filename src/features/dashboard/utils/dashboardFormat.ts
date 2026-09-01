import type { CursorPageResponseWeeklyRewardsDTO } from '@/api/__generated__/mining/model/cursorPageResponseWeeklyRewardsDTO';
import type { WeeklyRewardsDTO } from '@/api/__generated__/mining/model/weeklyRewardsDTO';
import type { ActorVaultRanking } from '@/api/__generated__/wallet/model/actorVaultRanking';
import type { CursorPageResponseActorVaultRanking } from '@/api/__generated__/wallet/model/cursorPageResponseActorVaultRanking';
import type { CursorPageResponseUsdcIncomeLedgerItem } from '@/api/__generated__/wallet/model/cursorPageResponseUsdcIncomeLedgerItem';
import type { UsdcIncomeLedgerItem } from '@/api/__generated__/wallet/model/usdcIncomeLedgerItem';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { formatDateFromMillisecond } from '@/utils/formatDate';
import { formatNumber } from '@/utils/formatNumber';
import {
  div,
  isGreaterThan,
  isGreaterThanOrEqual,
  isNumeric,
  multipliedBy,
  plus,
} from '@/utils/mathUtil';

type CursorPageLike = {
  hasMore?: boolean;
  mark?: string;
  list?: unknown[];
};

/**
 * Dashboard 美元金额：0 → $0；>0 最多 2 位小数并去掉末尾 0（同流水 formatNumber 口径）
 */
export function formatDashboardUsdAmount(
  value: string | number | undefined,
): string {
  if (value === undefined) {
    return '-';
  }

  const formatted = formatNumber(value, 2);

  if (formatted === '-') {
    return '-';
  }

  // formatNumber 对极小值返回 `<0.01`
  if (formatted.startsWith('<')) {
    return `<$${formatted.slice(1)}`;
  }

  return `$${formatted}`;
}

export function getDashboardCursorNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData = unwrapOrvalPayload<CursorPageLike>(lastPage);
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

export function mergeDashboardLedgerPages(
  pages: Array<{ data?: unknown }> | undefined,
): UsdcIncomeLedgerItem[] {
  if (!pages?.length) {
    return [];
  }

  const out: UsdcIncomeLedgerItem[] = [];
  for (const page of pages) {
    const pageData =
      unwrapOrvalPayload<CursorPageResponseUsdcIncomeLedgerItem>(page);
    const list = pageData?.list ?? [];
    for (const item of list) {
      out.push(item);
    }
  }
  return out;
}

export function mergeDashboardWeeklyRewardPages(
  pages: Array<{ data?: unknown }> | undefined,
): WeeklyRewardsDTO[] {
  if (!pages?.length) {
    return [];
  }

  const out: WeeklyRewardsDTO[] = [];
  for (const page of pages) {
    const pageData =
      unwrapOrvalPayload<CursorPageResponseWeeklyRewardsDTO>(page);
    const list = pageData?.list ?? [];
    for (const item of list) {
      out.push(item);
    }
  }
  return out;
}

export function mergeDashboardVaultRankingPages(
  pages: Array<{ data?: unknown }> | undefined,
): ActorVaultRanking[] {
  if (!pages?.length) {
    return [];
  }

  const out: ActorVaultRanking[] = [];
  for (const page of pages) {
    const pageData =
      unwrapOrvalPayload<CursorPageResponseActorVaultRanking>(page);
    const list = pageData?.list ?? [];
    for (const item of list) {
      out.push(item);
    }
  }
  return out;
}

/** 周期展示：MM/DD - MM/DD */
export function formatDashboardRewardPeriod(
  start?: string,
  end?: string,
): string {
  if (!start || !end) {
    return '-';
  }

  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return '-';
  }

  return `${formatDateFromMillisecond(startMs, 'MM/DD')} - ${formatDateFromMillisecond(endMs, 'MM/DD')}`;
}

/** 使用率 = (质押 + 邀请) / 周硬顶 */
export function formatDashboardUsageRate(row: WeeklyRewardsDTO): string {
  const { hardLimit, miningRewards, inviteRewards } = row;
  if (
    hardLimit === undefined ||
    !isNumeric(hardLimit) ||
    !isGreaterThan(hardLimit, 0)
  ) {
    return '-';
  }

  const mining = miningRewards === undefined ? '0' : String(miningRewards);
  const invite = inviteRewards === undefined ? '0' : String(inviteRewards);
  const used = plus(mining, invite);
  const ratio = multipliedBy(div(used, String(hardLimit)), 100);
  return `${formatNumber(ratio, 1)}%`;
}

/** 大额 STORY 数量：>=1e6 用 M 缩写（对齐稿面 550.0M） */
export function formatDashboardStorySupplyAmount(
  value: string | number | undefined,
): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  if (!isNumeric(value)) {
    return '-';
  }
  if (isGreaterThanOrEqual(value, '1000000')) {
    return `${formatNumber(div(String(value), '1000000'), 1)}M`;
  }
  return formatNumber(value, 1);
}

/** 释放进度：已释放 / 分配数量 × 100% */
export function formatDashboardStoryReleaseProgress(
  released: number | undefined | null,
  amount: string | undefined,
): string {
  if (released === undefined || released === null || !amount) {
    return '-';
  }
  if (!isNumeric(released) || !isNumeric(amount) || !isGreaterThan(amount, 0)) {
    return '-';
  }

  const ratio = multipliedBy(div(String(released), amount), 100);
  return `${formatNumber(ratio, 2)}%`;
}
