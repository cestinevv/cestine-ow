import dayjs from 'dayjs';

import type { CursorPageResponseRewardDetailDTO } from '@/api/__generated__/mining/model/cursorPageResponseRewardDetailDTO';
import { ListRewardDetailsType } from '@/api/__generated__/mining/model/listRewardDetailsType';
import type { RewardDetailDTO } from '@/api/__generated__/mining/model/rewardDetailDTO';
import { RewardDetailDTOType } from '@/api/__generated__/mining/model/rewardDetailDTOType';
import type { SettlingRewardDTO } from '@/api/__generated__/mining/model/settlingRewardDTO';
import type { TotalRewardDTO } from '@/api/__generated__/mining/model/totalRewardDTO';
import type { UsdcIncomeItemResponse } from '@/api/__generated__/wallet/model/usdcIncomeItemResponse';
import type { UsdcIncomePageResponse } from '@/api/__generated__/wallet/model/usdcIncomePageResponse';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { formatDateFromMillisecond } from '@/utils/formatDate';
import { plus } from '@/utils/mathUtil';

export enum IncomeWalletAssetTab {
  Story = 'story',
  Usdc = 'usdc',
}

export enum IncomeStoryEarningsFilter {
  All = 'all',
  Dispatch = 'dispatch',
  Invite = 'invite',
}

/** Figma 970:113010 — 收益摘要标题旁帮助说明 */
export enum IncomeWalletEarningsHelpType {
  TotalStory = 'totalStory',
  TotalUsdc = 'totalUsdc',
  SettlingStory = 'settlingStory',
  ClaimableStory = 'claimableStory',
  ClaimableUsdc = 'claimableUsdc',
}

export type IncomeWalletEarningsBadgeVariant =
  | 'dispatch'
  | 'invite'
  | 'actor-sign';

export type IncomeWalletEarningsRow = {
  id: string;
  createdAt?: string;
  typeLabelKey: string;
  badgeVariant: IncomeWalletEarningsBadgeVariant;
  /** 直接展示的来源文案（周期、演员名等，无需翻译） */
  sourceText?: string;
  /** 演员名 + tokenId，用于移动端分栏展示 */
  sourceLabelParams?: Record<string, string>;
  amount?: string;
  assetCode: 'STORY' | 'USDC';
};

const USDC_INCOME_TYPE_LABEL_KEY: Record<string, string> = {
  ACTOR_SIGN_SHARE: '角色签约分成',
};

function isWalletEarningsEndMark(
  mark: string | number | null | undefined,
): boolean {
  return mark === undefined || mark === null || mark === '-1' || mark === -1;
}

export function mapStoryEarningsFilterToListRewardDetailsType(
  filter: IncomeStoryEarningsFilter,
): ListRewardDetailsType {
  if (filter === IncomeStoryEarningsFilter.Dispatch) {
    return ListRewardDetailsType.MINING;
  }

  if (filter === IncomeStoryEarningsFilter.Invite) {
    return ListRewardDetailsType.INVITE;
  }

  return ListRewardDetailsType.ALL;
}

export function getWalletEarningsCursorNextPageParam(lastPage: {
  data?: unknown;
}): string | number | undefined {
  const pageData = unwrapOrvalPayload<
    UsdcIncomePageResponse | CursorPageResponseRewardDetailDTO
  >(lastPage);

  if (!pageData?.hasMore) {
    return undefined;
  }

  if (isWalletEarningsEndMark(pageData.mark)) {
    return undefined;
  }

  return pageData.mark;
}

export function mergeUsdcIncomePages(
  pages: Array<{ data?: unknown }> | undefined,
): UsdcIncomeItemResponse[] {
  if (!pages?.length) {
    return [];
  }

  return pages.flatMap((page) => {
    const pageData = unwrapOrvalPayload<UsdcIncomePageResponse>(page);
    return pageData?.list ?? [];
  });
}

export function getUsdcIncomeTotalFromPages(
  pages: Array<{ data?: unknown }> | undefined,
): string | undefined {
  const firstPage = pages?.[0];
  if (!firstPage) {
    return undefined;
  }

  const pageData = unwrapOrvalPayload<UsdcIncomePageResponse>(firstPage);
  return pageData?.total;
}

/** 累计 STORY = 派遣挖矿奖励 + 邀请奖励（/api/mining/totalReward） */
export function getTotalStoryEarningsFromReward(
  reward: TotalRewardDTO | null | undefined,
): string | undefined {
  if (!reward) {
    return undefined;
  }

  const { totalMiningReward, totalInviteReward } = reward;

  if (totalMiningReward === undefined && totalInviteReward === undefined) {
    return undefined;
  }

  if (totalMiningReward !== undefined && totalInviteReward !== undefined) {
    return plus(totalMiningReward, totalInviteReward);
  }

  if (totalMiningReward !== undefined) {
    return String(totalMiningReward);
  }

  return String(totalInviteReward);
}

/** 结算中 STORY = 派遣挖矿奖励 + 邀请奖励（/api/mining/settlingReward） */
export function getSettlingStoryEarningsFromReward(
  reward: SettlingRewardDTO | null | undefined,
): string | undefined {
  if (!reward) {
    return undefined;
  }

  const { miningReward, inviteReward } = reward;

  if (miningReward === undefined && inviteReward === undefined) {
    return undefined;
  }

  if (miningReward !== undefined && inviteReward !== undefined) {
    return plus(miningReward, inviteReward);
  }

  if (miningReward !== undefined) {
    return String(miningReward);
  }

  return String(inviteReward);
}

export function mergeStoryRewardDetailPages(
  pages: Array<{ data?: unknown }> | undefined,
): RewardDetailDTO[] {
  if (!pages?.length) {
    return [];
  }

  return pages.flatMap((page) => {
    const pageData =
      unwrapOrvalPayload<CursorPageResponseRewardDetailDTO>(page);
    return pageData?.list ?? [];
  });
}

function formatRewardDetailPeriodDate(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    return formatDateFromMillisecond(trimmed, 'YYYY-MM-DD');
  }

  const parsed = dayjs(trimmed);
  if (!parsed.isValid()) {
    return undefined;
  }

  return parsed.format('YYYY-MM-DD');
}

function formatRewardDetailPeriod(item: RewardDetailDTO): string | undefined {
  const periodStart = formatRewardDetailPeriodDate(item.rewardPeriodStart);
  const periodEnd = formatRewardDetailPeriodDate(item.rewardPeriodEnd);

  if (periodStart && periodEnd) {
    return `${periodStart} ~ ${periodEnd}`;
  }

  return periodStart ?? periodEnd;
}

function normalizeRewardDetailTimestamp(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = dayjs(trimmed);
  if (!parsed.isValid()) {
    return undefined;
  }

  return String(parsed.valueOf());
}

function buildStoryRewardDetailSource(
  item: RewardDetailDTO,
): string | undefined {
  const period = formatRewardDetailPeriod(item);

  if (item.type === RewardDetailDTOType.INVITE) {
    const sourceUserName = item.sourceUserName?.trim();

    if (period && sourceUserName) {
      return `${period} ${sourceUserName}`;
    }

    return sourceUserName || period || undefined;
  }

  // 派遣收益仅展示奖励周期
  return period || undefined;
}

function getStoryRewardDetailBadgeVariant(
  type?: RewardDetailDTO['type'],
): IncomeWalletEarningsBadgeVariant {
  if (type === RewardDetailDTOType.INVITE) {
    return 'invite';
  }

  return 'dispatch';
}

function getStoryRewardDetailTypeLabelKey(
  type?: RewardDetailDTO['type'],
): string {
  if (type === RewardDetailDTOType.INVITE) {
    return '邀请收益';
  }

  return '派遣收益';
}

export function getIncomeWalletEarningsSourceDisplay(
  row: IncomeWalletEarningsRow,
): string {
  const actorName = row.sourceLabelParams?.actorName?.trim();
  const tokenId = row.sourceLabelParams?.tokenId?.trim();
  if (actorName && tokenId) {
    return `${actorName} #${tokenId}`;
  }

  const sourceText = row.sourceText?.trim();
  if (sourceText) {
    return sourceText;
  }

  return '-';
}

export function mapStoryRewardDetailToRow(
  item: RewardDetailDTO,
  index: number,
): IncomeWalletEarningsRow {
  const rowId = [
    item.rewardTime,
    item.type,
    item.storyAmount,
    item.sourceUser,
    item.sourceUserName,
    item.rewardPeriodStart,
    item.rewardPeriodEnd,
    index,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .join('-');

  return {
    id: rowId || `story-${index}`,
    createdAt: normalizeRewardDetailTimestamp(item.rewardTime),
    typeLabelKey: getStoryRewardDetailTypeLabelKey(item.type),
    badgeVariant: getStoryRewardDetailBadgeVariant(item.type),
    sourceText: buildStoryRewardDetailSource(item),
    amount:
      item.storyAmount !== undefined && item.storyAmount !== null
        ? String(item.storyAmount)
        : undefined,
    assetCode: 'STORY',
  };
}

export function mapUsdcIncomeItemToRow(
  item: UsdcIncomeItemResponse,
  index: number,
): IncomeWalletEarningsRow {
  const typeCode = item.type?.trim();
  const typeLabelKey =
    (typeCode && USDC_INCOME_TYPE_LABEL_KEY[typeCode]) ||
    typeCode ||
    '角色签约分成';

  const actorName = item.actorName?.trim();
  // 来源编号展示 NFT tokenId，不用合集 ID（actorCollectionId）
  const tokenId = item.tokenId?.trim();

  return {
    id: item.id ?? `usdc-${index}`,
    createdAt: item.createdAt,
    typeLabelKey,
    badgeVariant: 'actor-sign',
    sourceLabelParams:
      actorName && tokenId ? { actorName, tokenId } : undefined,
    sourceText:
      actorName && !tokenId
        ? actorName
        : !actorName && tokenId
          ? `#${tokenId}`
          : undefined,
    amount: item.amount,
    assetCode: 'USDC',
  };
}
