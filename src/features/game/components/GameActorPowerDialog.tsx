import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { formatGameActorLevelName } from '@/features/game/constants/gameActorLevelFormat';
import type { ActorMiningPowerBreakdown } from '@/features/mining/miningPower';
import { cn, formatNumber } from '@/utils';

type GameActorPowerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakdown: ActorMiningPowerBreakdown;
  level?: number;
  actorName?: string;
};

function formatLv1Pay(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  if (value > 0 && value < 0.01) {
    return '<0.01';
  }

  return formatNumber(value, 2);
}

function formatCoefficient(value: number | undefined, decimals = 3): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return value.toFixed(decimals);
}

export function GameActorPowerDialog({
  open,
  onOpenChange,
  breakdown,
  level,
  actorName: _actorName,
}: GameActorPowerDialogProps) {
  const { t } = useTranslation();
  const levelName =
    level === undefined ? undefined : formatGameActorLevelName(t, { level });

  // 关闭片酬详情弹窗
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('角色片酬')}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      {/* Figma 637:69258 — gap-24 */}
      <div className="flex flex-col items-center gap-6">
        <header className="w-full text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('角色片酬')}
          </h2>
        </header>

        {/* 公式说明区 — Figma 637:69172 */}
        <div
          className={cn(
            'flex w-full items-center justify-center rounded-xl py-3',
            'border-[0.5px] border-game-actor-rate-highlight-border',
          )}
        >
          <p className="m-0 w-full text-center text-xs leading-4 tracking-[0.04px] text-foreground">
            {level !== undefined && level > 1
              ? t('Lv.{{level}}片酬 = Lv.1片酬 × 片酬系数', { level })
              : t('Lv.1 角色片酬 = 价格系数 × 热度系数')}
          </p>
        </div>

        {/* 分解明细 — Figma 637:69220 */}
        <div className="flex w-full flex-col gap-1.5 rounded-xl bg-game-upgrade-compare-surface p-3">
          {/* Lv.1片酬 行 — 粗体，与 Figma 637:69230 一致 */}
          <div className="flex w-full items-center justify-between gap-4">
            <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-foreground">
              {t('Lv.1 片酬')}
            </span>
            <span className="text-xs leading-4 font-medium tracking-[0.04px] text-foreground">
              {formatLv1Pay(breakdown.ipPower)}
            </span>
          </div>

          {/* 价格系数行 — 缩进，次要色，Figma 637:69231 */}
          <div className="flex w-full items-center justify-between gap-4 pl-2">
            <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {t('价格系数')}
            </span>
            <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {`× ${formatCoefficient(breakdown.priceCoefficient)}`}
            </span>
          </div>

          {/* 热度系数行 — 缩进，次要色，Figma 637:69236 */}
          <div className="flex w-full items-center justify-between gap-4 pl-2">
            <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {t('热度系数')}
            </span>
            <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {`× ${formatCoefficient(breakdown.heatCoefficient, 1)}`}
            </span>
          </div>

          {/* 片酬系数行 — 粗体，带咖位标注，Figma 637:69241 */}
          <div className="flex w-full items-center justify-between gap-4">
            <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-foreground">
              {level !== undefined
                ? t('片酬系数（Lv.{{level}} {{roleName}}）', {
                    level,
                    roleName: levelName ?? '',
                  })
                : t('片酬系数')}
            </span>
            <span className="text-xs leading-4 font-medium tracking-[0.04px] text-foreground">
              {`× ${formatCoefficient(breakdown.miningCoefficient, 0)}`}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
        >
          {t('关闭')}
        </Button>
      </div>
    </AppDialog>
  );
}
