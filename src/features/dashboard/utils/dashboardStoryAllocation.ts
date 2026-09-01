import type {
  InitMiningConfig,
  InitMiningPercentsConfig,
} from '@/stores/config';
import { div, multipliedBy } from '@/utils/mathUtil';

import { formatDashboardStorySupplyAmount } from './dashboardFormat';

export type DashboardStoryAllocationRowId = keyof InitMiningPercentsConfig;

export type DashboardStoryAllocationRow = {
  id: DashboardStoryAllocationRowId;
  /** i18n key；NFT 挖矿池行在组件内拼接英文常量 */
  titleKey: string;
  /** 配置未就绪时为 undefined，展示 `-` */
  percent?: number;
  /** 分配数量原始值（totalSupply × percent / 100）；未就绪时为 undefined */
  amount?: string;
  amountLabel: string;
};

/** 稿面行顺序 */
const STORY_ALLOCATION_ORDER: DashboardStoryAllocationRowId[] = [
  'nftMiningPool',
  'team',
  'investors',
  'liquidity',
  'treasury',
  'marketOperations',
];

const STORY_ALLOCATION_TITLE_KEY: Record<
  DashboardStoryAllocationRowId,
  string
> = {
  nftMiningPool: '挖矿池',
  team: '团队',
  investors: '投资人',
  liquidity: '流动性',
  treasury: '国库',
  marketOperations: '市场推广',
};

/**
 * 始终返回稿面 6 行轮廓；mining / percents / totalSupply 未就绪时数值字段留空，由 UI 展示 `-`。
 */
export function buildDashboardStoryAllocationRows(
  mining: InitMiningConfig | undefined,
): DashboardStoryAllocationRow[] {
  const percents = mining?.percents;
  const totalSupply = mining?.totalSupply;

  return STORY_ALLOCATION_ORDER.map((id) => {
    const percent = percents?.[id];

    if (percent === undefined || !totalSupply) {
      return {
        id,
        titleKey: STORY_ALLOCATION_TITLE_KEY[id],
        amountLabel: '-',
      };
    }

    const amount = multipliedBy(div(String(percent), '100'), totalSupply);

    return {
      id,
      titleKey: STORY_ALLOCATION_TITLE_KEY[id],
      percent,
      amount,
      amountLabel: formatDashboardStorySupplyAmount(amount),
    };
  });
}

export function formatDashboardStoryTotalSupplyLabel(
  totalSupply: string | undefined,
): string {
  if (!totalSupply) {
    return '-';
  }
  return formatDashboardStorySupplyAmount(totalSupply);
}
