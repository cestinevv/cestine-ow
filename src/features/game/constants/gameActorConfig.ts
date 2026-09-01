import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { InitActorNftUpgradeConfig, InitConfig } from '@/stores/config';
import { formatNumber } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

/** 角色体力上限（来自 init.actorNft.staminaLimit） */
export function getGameActorStaminaLimit(
  initConfig: InitConfig | undefined,
): number | undefined {
  return initConfig?.actorNft?.staminaLimit;
}

/** 按等级升序返回 init.actorNft.levels 条目 */
export function listGameActorNftLevels(
  initConfig: InitConfig | undefined,
): Array<{
  level: number;
  name: string;
  supplyFee: number;
  miningCoefficient: number;
}> {
  const levels = initConfig?.actorNft?.levels;
  if (!levels) {
    return [];
  }

  return Object.entries(levels)
    .map(([levelKey, levelConfig]) => ({
      level: Number(levelKey),
      name: levelConfig.name,
      supplyFee: levelConfig.supplyFee,
      miningCoefficient: levelConfig.miningCoefficient,
    }))
    .filter((item) => Number.isFinite(item.level))
    .sort((a, b) => a.level - b.level);
}

/** 挖矿规则等场景：Lv1=1.0 → Lv2=2.2 形式的咖位挖矿系数链 */
export function formatGameActorMiningCoefficientLevelsLabel(
  initConfig: InitConfig | undefined,
): string | undefined {
  const levels = listGameActorNftLevels(initConfig);
  if (levels.length === 0) {
    return undefined;
  }

  return levels
    .map((item) => `Lv${item.level}=${formatNumber(item.miningCoefficient, 1)}`)
    .join(' → ');
}

/** 指定咖位一键加满体力费用（来自 init.actorNft.levels[level].supplyFee） */
export function getGameActorSupplyFee(
  initConfig: InitConfig | undefined,
  level: number | undefined,
): number | undefined {
  if (level === undefined) {
    return undefined;
  }

  return initConfig?.actorNft?.levels?.[String(level)]?.supplyFee;
}

/** 指定咖位升级规则（来自 init.actorNft.levels[level].upgrade） */
export function getGameActorUpgradeConfig(
  initConfig: InitConfig | undefined,
  level: number | undefined,
): InitActorNftUpgradeConfig | undefined {
  if (level === undefined) {
    return undefined;
  }

  return initConfig?.actorNft?.levels?.[String(level)]?.upgrade;
}

/** 角色是否已达 init 配置的最高咖位（如 Lv5），无下一级 upgrade 规则 */
export function isGameActorMaxLevel(
  initConfig: InitConfig | undefined,
  level: number | undefined,
): boolean {
  if (level === undefined) {
    return false;
  }

  const levels = listGameActorNftLevels(initConfig);
  const maxLevel = levels.at(-1)?.level;

  return maxLevel !== undefined && level >= maxLevel;
}

/** 列表行唯一键：优先 actorNftId，其次 actorCollectionId */
export function getGameActorRowKey(actor: ActorDTO): string {
  return (
    readSnowflakeId(actor.actorNftId) ??
    readSnowflakeId(actor.actorCollectionId) ??
    actor.actorName ??
    'actor'
  );
}

/** 角色编号展示用原始值：优先 NFT ID，其次角色 IP（合集 ID） */
export function getGameActorCodeRawValue(actor: ActorDTO): string | undefined {
  const nftId = actor.actorNftId?.trim();
  if (nftId) {
    return nftId.startsWith('#') ? nftId.slice(1) : nftId;
  }

  return readSnowflakeId(actor.actorCollectionId);
}
