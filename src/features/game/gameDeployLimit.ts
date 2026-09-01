import type { TFunction } from 'i18next';
import { toast } from 'sonner';

import { GAME_DEPLOY_SLOT_COUNT } from '@/features/game/constants/gameConstants';

export function isGameDeploySlotFull(deployedCount: number): boolean {
  return deployedCount >= GAME_DEPLOY_SLOT_COUNT;
}

// 演出位已满时 toast 提示，返回 true 表示应阻断后续弹窗
export function guardGameDeploySlot(
  deployedCount: number,
  t: TFunction,
): boolean {
  if (!isGameDeploySlotFull(deployedCount)) {
    return false;
  }

  toast.error(t('演出位已满（最多 5 个）'));
  return true;
}
