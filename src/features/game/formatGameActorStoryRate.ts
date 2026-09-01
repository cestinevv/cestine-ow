import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { getActorMiningPowerBreakdown } from '@/features/mining/miningPower';
import { formatNumber } from '@/utils';

/** 每小时片酬展示为 STORY/h */
export function formatGameActorStoryRate(actor: ActorDTO): string {
  const powerBreakdown = getActorMiningPowerBreakdown(
    actor as unknown as Record<string, unknown>,
  );

  return `${formatGameActorHourlyPaymentValue(
    powerBreakdown.actorPower,
  )} STORY/h`;
}

export function formatGameActorHourlyPaymentValue(
  value: number | undefined,
): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  // 与「角色片酬详情」弹窗一致：极小值显示 <0.01
  if (value > 0 && value < 0.01) {
    return '<0.01';
  }

  return formatNumber(value, 2);
}

export function getGameActorStoryRateValue(
  actor: ActorDTO,
): number | undefined {
  const powerBreakdown = getActorMiningPowerBreakdown(
    actor as unknown as Record<string, unknown>,
  );

  return powerBreakdown.actorPower;
}
