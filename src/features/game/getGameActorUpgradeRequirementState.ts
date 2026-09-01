import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import {
  getGameActorUpgradeConfig,
  isGameActorMaxLevel,
  listGameActorNftLevels,
} from '@/features/game/constants/gameActorConfig';
import { getGameActorStoryRateValue } from '@/features/game/formatGameActorStoryRate';
import type { InitConfig } from '@/stores/config';
import { div, isGreaterThanOrEqual, multipliedBy, toNumber } from '@/utils';

export type GameActorUpgradeRequirementState = {
  heatThreshold: number | undefined;
  requiredMaterialCount: number | undefined;
  toLevel: number | undefined;
  completedPlayCount: number | undefined;
  materialCount: number | undefined;
  isHeatMet: boolean;
  isMaterialMet: boolean;
  isReady: boolean;
  heatRemaining: number | undefined;
  materialRemaining: number | undefined;
  currentStoryRate: number | undefined;
  nextStoryRate: number | undefined;
};

function estimateNextStoryRate(
  actor: ActorDTO,
  initConfig: InitConfig | undefined,
  toLevel: number | undefined,
): number | undefined {
  const currentRate = getGameActorStoryRateValue(actor);
  if (currentRate === undefined || toLevel === undefined) {
    return undefined;
  }

  const levels = listGameActorNftLevels(initConfig);
  const currentLevelConfig = levels.find((item) => item.level === actor.level);
  const nextLevelConfig = levels.find((item) => item.level === toLevel);

  if (
    !currentLevelConfig ||
    !nextLevelConfig ||
    currentLevelConfig.miningCoefficient <= 0
  ) {
    return undefined;
  }

  const ratio = toNumber(
    multipliedBy(
      currentRate,
      div(
        nextLevelConfig.miningCoefficient,
        currentLevelConfig.miningCoefficient,
      ),
    ),
  );

  return Number.isFinite(ratio) ? ratio : undefined;
}

/** 基于 ActorDTO.completedPlayCount / materialCount 与 init 升级规则判断是否可升级 */
export function getGameActorUpgradeRequirementState(
  actor: ActorDTO,
  initConfig: InitConfig | undefined,
): GameActorUpgradeRequirementState {
  const upgradeConfig = getGameActorUpgradeConfig(initConfig, actor.level);
  const heatThreshold = upgradeConfig?.heatThreshold;
  const requiredMaterialCount = upgradeConfig?.requiredMaterialCount;
  const toLevel = upgradeConfig?.toLevel;
  const completedPlayCount = actor.completedPlayCount;
  const materialCount = actor.materialCount;
  const isMaxLevel = isGameActorMaxLevel(initConfig, actor.level);

  const isHeatMet =
    heatThreshold !== undefined &&
    completedPlayCount !== undefined &&
    isGreaterThanOrEqual(completedPlayCount, heatThreshold);

  const isMaterialMet =
    requiredMaterialCount !== undefined &&
    materialCount !== undefined &&
    isGreaterThanOrEqual(materialCount, requiredMaterialCount);

  const heatRemaining =
    heatThreshold !== undefined && completedPlayCount !== undefined
      ? Math.max(0, heatThreshold - completedPlayCount)
      : undefined;

  const materialRemaining =
    requiredMaterialCount !== undefined && materialCount !== undefined
      ? Math.max(0, requiredMaterialCount - materialCount)
      : undefined;

  return {
    heatThreshold,
    requiredMaterialCount,
    toLevel,
    completedPlayCount,
    materialCount,
    isHeatMet,
    isMaterialMet,
    isReady:
      !isMaxLevel && Boolean(upgradeConfig) && isHeatMet && isMaterialMet,
    heatRemaining,
    materialRemaining,
    currentStoryRate: getGameActorStoryRateValue(actor),
    nextStoryRate: estimateNextStoryRate(actor, initConfig, toLevel),
  };
}
