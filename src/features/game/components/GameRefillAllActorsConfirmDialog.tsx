import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { GameDialogSubmitLabel } from '@/features/game/components/GameDialogSubmitLabel';
import {
  buildGameBatchRefillItems,
  useGameBatchRefillActors,
} from '@/features/game/hooks/useGameBatchRefillActors';
import { useConfigStore } from '@/stores/config';
import { cn, formatNumber } from '@/utils';

type GameRefillAllActorsConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 需补充体力的演出中角色 */
  actors: ActorDTO[];
  /** 需补充体力的演出中角色数 */
  actorCount: number;
  /** 合计花费（USDC） */
  totalCost: number | undefined;
};

/** Figma 637:74678「一键补充」确认弹窗 */
export function GameRefillAllActorsConfirmDialog({
  open,
  onOpenChange,
  actors,
  actorCount,
  totalCost,
}: GameRefillAllActorsConfirmDialogProps) {
  const { t } = useTranslation();
  const initConfig = useConfigStore((state) => state.initConfig);
  const { isPending, isWalletReady, solanaAddress, submitBatchRefill } =
    useGameBatchRefillActors();

  const items = useMemo(
    () => buildGameBatchRefillItems(actors, initConfig ?? undefined),
    [actors, initConfig],
  );

  const handleCancel = () => {
    onOpenChange(false);
  };

  // 预下单 → batch_refill_actor_stamina → 缓存同步
  const handleConfirm = async () => {
    if (actorCount <= 0 || items.length <= 0) {
      return;
    }

    const ok = await submitBatchRefill({
      items,
      totalCost,
    });

    if (ok) {
      onOpenChange(false);
    }
  };

  const isConfirmDisabled =
    actorCount <= 0 ||
    items.length <= 0 ||
    isPending ||
    !solanaAddress?.trim() ||
    !isWalletReady;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('一键补充')}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      <div className="flex flex-col items-center gap-6">
        <header className="flex w-full flex-col items-center gap-1 text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('一键补充')}
          </h2>
          <p className="w-full text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            {t('将恢复演出中角色的全部体力')}
          </p>
        </header>

        <div
          className={cn(
            'flex w-full flex-col items-start justify-center gap-4',
            'rounded-xl bg-destructive/5 px-4 py-3',
          )}
        >
          <div className="flex w-full flex-col gap-1 text-center">
            <p className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
              {t('{{count}} 个角色', { count: formatNumber(actorCount, 0) })}
            </p>
            {totalCost !== undefined ? (
              <p className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-destructive">
                {t('花费 {{amount}} USDC', {
                  amount: formatNumber(totalCost, 1),
                })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className={cn(APP_DIALOG_SECONDARY_BUTTON_CLASS, 'h-11')}
            disabled={isPending}
            onClick={handleCancel}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            className={cn(APP_DIALOG_PRIMARY_BUTTON_CLASS, 'h-11')}
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
          >
            <GameDialogSubmitLabel isPending={isPending}>
              {t('确认')}
            </GameDialogSubmitLabel>
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
