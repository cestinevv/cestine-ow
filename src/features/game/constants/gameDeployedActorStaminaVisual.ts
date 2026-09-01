export enum GameDeployedActorStaminaVisualState {
  Normal = 'normal',
  Low = 'low',
  Exhausted = 'exhausted',
}

/** 派遣卡片体力 visual 分档，Figma 4955:28613 */
export function resolveGameDeployedActorStaminaVisualState(
  stamina: number | undefined,
  staminaLimit: number | undefined,
): GameDeployedActorStaminaVisualState | undefined {
  if (stamina === undefined) {
    return undefined;
  }

  if (stamina === 0) {
    return GameDeployedActorStaminaVisualState.Exhausted;
  }

  if (stamina <= 8) {
    return GameDeployedActorStaminaVisualState.Low;
  }

  if (staminaLimit !== undefined && stamina < staminaLimit) {
    return GameDeployedActorStaminaVisualState.Normal;
  }

  if (stamina > 8) {
    return GameDeployedActorStaminaVisualState.Normal;
  }

  return undefined;
}

export function getGameDeployedActorStaminaBarVariant(
  visualState: GameDeployedActorStaminaVisualState | undefined,
): 'default' | 'warning' | 'empty' {
  if (visualState === GameDeployedActorStaminaVisualState.Exhausted) {
    return 'empty';
  }

  if (visualState === GameDeployedActorStaminaVisualState.Low) {
    return 'warning';
  }

  return 'default';
}
