import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import {
  getGameActorUpgradeConfig,
  listGameActorNftLevels,
} from '@/features/game/constants/gameActorConfig';
import {
  type ActorMiningPowerBreakdown,
  getActorIpPowerBreakdown,
} from '@/features/mining/miningPower';
import type { InitConfig } from '@/stores/config';
import {
  div,
  formatNumber,
  isGreaterThanOrEqual,
  multipliedBy,
  toNumber,
} from '@/utils';

/** 片酬升级规则表行：到达该咖位所需完播 + 片酬系数 */
export type PlazaPayUpgradeRule = {
  level: number;
  completionThreshold: number | undefined;
  miningCoefficient: number;
};

/** 广场卡 Lv.1 每小时片酬（computingPower × Lv.1 咖位片酬系数） */
export type PlazaActorHourlyRates = {
  lv1Rate: number | undefined;
  lv1Level: number | undefined;
  lv1MiningCoefficient: number | undefined;
};

function scaleHourlyRate(
  computingPower: number | undefined,
  miningCoefficient: number | undefined,
): number | undefined {
  if (computingPower === undefined || miningCoefficient === undefined) {
    return undefined;
  }

  return toNumber(multipliedBy(computingPower, miningCoefficient));
}

export function getPlazaActorHourlyRates(
  item: ActorCollectionResponse,
  initConfig: InitConfig | undefined,
): PlazaActorHourlyRates {
  const levels = listGameActorNftLevels(initConfig);
  const lv1 = levels[0];
  const computingPower = item.computingPower;

  return {
    lv1Level: lv1?.level,
    lv1MiningCoefficient: lv1?.miningCoefficient,
    lv1Rate: scaleHourlyRate(computingPower, lv1?.miningCoefficient),
  };
}

/** 广场集合没有 NFT memo，按指定咖位系数拼片酬详情弹窗口径 */
export function buildPlazaActorMiningBreakdown(
  item: ActorCollectionResponse,
  options: {
    miningCoefficient: number | undefined;
    actorPower: number | undefined;
  },
): ActorMiningPowerBreakdown {
  const ipBreakdown = getActorIpPowerBreakdown(item);

  return {
    ...ipBreakdown,
    miningCoefficient: options.miningCoefficient ?? 0,
    cpCoefficient: 1,
    trust2: 1,
    actorPower: options.actorPower ?? 0,
  };
}

/** Figma 655:149477 — 咖位完播门槛取上一档 upgrade.heatThreshold，Lv.1 为 0 */
export function listPlazaPayUpgradeRules(
  initConfig: InitConfig | undefined,
): PlazaPayUpgradeRule[] {
  const levels = listGameActorNftLevels(initConfig);

  return levels.map((item, index) => {
    const previous = levels[index - 1];
    const completionThreshold =
      previous === undefined
        ? 0
        : getGameActorUpgradeConfig(initConfig, previous.level)?.heatThreshold;

    return {
      level: item.level,
      completionThreshold,
      miningCoefficient: item.miningCoefficient,
    };
  });
}

/** 完播数已满足的最高咖位；输入缺失则未知 */
export function getSupportedPayUpgradeLevel(
  rows: readonly PlazaPayUpgradeRule[],
  completedViewCount: number | undefined,
): number | undefined {
  if (completedViewCount === undefined) {
    return undefined;
  }

  let supported: number | undefined;

  for (const row of rows) {
    if (row.completionThreshold === undefined) {
      break;
    }

    if (!isGreaterThanOrEqual(completedViewCount, row.completionThreshold)) {
      break;
    }

    supported = row.level;
  }

  return supported;
}

/** 稿面「1万 完播」口径：满万用万，否则原值 */
export function formatPlazaCompletionCount(value: number | undefined): string {
  if (value === undefined) {
    return '-';
  }

  if (isGreaterThanOrEqual(value, 10000)) {
    return `${formatNumber(div(value, 10000), 1)}万`;
  }

  return formatNumber(value, 0);
}

/** 稿面片酬倍数保留一位小数（×1.0） */
export function formatPlazaPayMultiplier(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return value.toFixed(1);
}
