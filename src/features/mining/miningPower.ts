import Decimal from 'decimal.js';

import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import { formatNumber } from '@/utils';

type NumericRecord = Record<string, unknown>;

export type ActorIpPowerBreakdown = {
  /** 价格系数（P0→价格系数映射中的系数），对应 IP 算力分解项之一 */
  priceCoefficient: number;
  /** 热度系数（热度→热度系数映射），对应 IP 算力分解项之一 */
  heatCoefficient: number;
  /** Trust1（旧口径），对应 IP 算力分解项之一 */
  trust1: number;
  /** IP 算力（旧口径）/ 片酬分解项「片酬」（当前 UI 展示为 4 位小数） */
  ipPower?: number;
};

export type ActorMiningPowerBreakdown = ActorIpPowerBreakdown & {
  /** 片酬系数（旧口径：挖矿系数），对应 UI「片酬系数」行 */
  miningCoefficient: number;
  /** CP 系数（暂未开放时默认 1.0），对应 UI「CP 系数」行 */
  cpCoefficient: number;
  /** Trust2（平台 Trust2），对应 UI「Trust2」行 */
  trust2: number;
  /** 每小时片酬（旧口径：每小时产出），对应 UI 高亮区「每小时片酬」与卡面 `STORY/h` */
  actorPower: number;
};

function readNumber(
  source: NumericRecord,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const raw = source[key];
    if (raw === undefined || raw === null || raw === '') {
      continue;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readRecord(
  source: NumericRecord,
  key: string,
): NumericRecord | undefined {
  const raw = source[key];
  if (!raw) {
    return undefined;
  }

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as NumericRecord;
  }

  if (typeof raw !== 'string') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as NumericRecord)
      : undefined;
  } catch {
    return undefined;
  }
}

function truncate(value: Decimal.Value, precision: number): number {
  return new Decimal(value)
    .toDecimalPlaces(precision, Decimal.ROUND_DOWN)
    .toNumber();
}

export function calculateActorPriceCoefficient(initialPrice: number): number {
  if (!Number.isFinite(initialPrice) || initialPrice <= 0) {
    return 0;
  }

  const p0 = new Decimal(initialPrice);
  if (p0.lessThanOrEqualTo(10)) {
    return truncate(p0.dividedBy(10), 10);
  }

  const ratioPow = p0.dividedBy(10).pow(1.3);
  const coefficient = new Decimal(1.6)
    .times(ratioPow)
    .dividedBy(ratioPow.plus(0.6));

  return truncate(coefficient, 10);
}

export function formatPowerValue(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  return formatNumber(value, 4);
}

export function formatPowerFactor(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  return truncate(value, 4).toFixed(4);
}

export function formatHeatFactor(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  return truncate(value, 2).toFixed(2);
}

export function formatTrustFactor(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  return truncate(value, 2).toFixed(2);
}

function calculateActorIpPowerFromFactors(
  priceCoefficient: number,
  heatCoefficient: number,
  trust1: number,
): number {
  return truncate(
    new Decimal(priceCoefficient).times(heatCoefficient).times(trust1),
    10,
  );
}

export function getActorIpPowerBreakdown(
  actor: ActorCollectionResponse,
): ActorIpPowerBreakdown {
  const record = actor as ActorCollectionResponse & NumericRecord;
  const priceCoefficient = readNumber(record, ['initialPriceMultiplier']) ?? 0;
  const heatCoefficient =
    actor.heatValue ?? readNumber(record, ['heat', 'hot', 'hotScore']) ?? 0;
  const trust1 = actor.trust ?? readNumber(record, ['trust1']) ?? 1;
  const ipPower = readNumber(record, ['computingPower']);

  return {
    priceCoefficient,
    heatCoefficient,
    trust1,
    ipPower,
  };
}

export function getActorMiningPowerBreakdown(
  actor: NumericRecord,
): ActorMiningPowerBreakdown {
  const memo = readRecord(actor, 'memo');
  const priceCoefficient =
    readNumber(actor, ['priceCoefficient', 'priceFactor']) ??
    (memo ? readNumber(memo, ['p0']) : undefined) ??
    1;
  const heatCoefficient =
    (memo ? readNumber(memo, ['heat']) : undefined) ??
    readNumber(actor, ['heat', 'heatValue']) ??
    0;
  const trust1 =
    (memo ? readNumber(memo, ['trust1']) : undefined) ??
    readNumber(actor, ['trust1', 'ipTrust']) ??
    1;
  const ipPower = calculateActorIpPowerFromFactors(
    priceCoefficient,
    heatCoefficient,
    trust1,
  );
  const miningCoefficient =
    (memo ? readNumber(memo, ['MC', 'mc']) : undefined) ??
    readNumber(actor, ['miningCoefficient']) ??
    0;
  const cpCoefficient =
    (memo ? readNumber(memo, ['CP', 'cp']) : undefined) ??
    readNumber(actor, ['cpCoefficient']) ??
    1;
  const trust2 =
    (memo ? readNumber(memo, ['trust2']) : undefined) ??
    readNumber(actor, ['trust2', 'trust']) ??
    1;
  const actorPower =
    readNumber(actor, ['computingPower']) ??
    truncate(
      new Decimal(ipPower)
        .times(miningCoefficient)
        .times(cpCoefficient)
        .times(trust2),
      10,
    );

  return {
    priceCoefficient,
    heatCoefficient,
    trust1,
    ipPower,
    miningCoefficient,
    cpCoefficient,
    trust2,
    actorPower,
  };
}
