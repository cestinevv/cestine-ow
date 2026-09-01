/** 体力已满：两者均为有效数值且 stamina >= staminaLimit；null/undefined 上限视为未知，不算已满 */
export function isActorStaminaFull(
  stamina: number | undefined | null,
  staminaLimit: number | undefined | null,
): boolean {
  if (stamina == null || staminaLimit == null) {
    return false;
  }

  return stamina >= staminaLimit;
}
