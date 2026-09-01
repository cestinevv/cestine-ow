import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import type { ActorMiningPowerBreakdown } from '@/features/mining/miningPower';
import {
  formatHeatFactor,
  formatPowerFactor,
} from '@/features/mining/miningPower';

type ActorLv1RateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorName?: string;
  breakdown: ActorMiningPowerBreakdown;
};

export function ActorLv1RateDialog({
  open,
  onOpenChange,
  actorName,
  breakdown,
}: ActorLv1RateDialogProps) {
  const { t } = useTranslation();

  // 关闭弹窗
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('{{name}} · 片酬', { name: actorName ?? '' })}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      {/* Figma 655:148843 */}
      <div className="flex flex-col items-center gap-6">
        <header className="w-full text-center">
          <h2 className="m-0 w-full text-lg leading-6.5 font-bold tracking-[-0.04px] text-foreground">
            {t('{{name}} · 片酬', { name: actorName ?? '' })}
          </h2>
        </header>

        <div className="flex w-full flex-col items-center gap-1.5 rounded-xl bg-muted p-3 text-center">
          <p className="m-0 w-full text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            {t('签约即可获得Lv.1角色')}
          </p>
          <p className="m-0 w-full text-xs leading-4 font-medium text-foreground">
            {t('Lv.1片酬=价格系数×热度系数')}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full flex-col gap-1.5 rounded-xl bg-muted p-3">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm leading-5 font-bold text-foreground">
                {t('价格系数')}
              </span>
              <span className="text-sm leading-5 font-bold text-primary">
                × {formatPowerFactor(breakdown.priceCoefficient)}
              </span>
            </div>
            <p className="m-0 w-full text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
              {t('根据发行IP时的初始价格P0计算')}
              <br />
              {`如果 P0 ≤ 100 USDC，价格系数 = P0 ÷ 100`}
              <br />
              {`如果 P0 > 100 USDC，价格系数 = 1.6 × (P0 / 100)^1.3 / [(P0 / 100)^1.3 + 0.6]`}
            </p>
          </div>

          <div className="flex w-full flex-col gap-1.5 rounded-xl bg-muted p-3">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm leading-5 font-bold text-foreground">
                {t('热度系数')}
              </span>
              <span className="text-sm leading-5 font-bold text-primary">
                × {formatHeatFactor(breakdown.heatCoefficient)}
              </span>
            </div>
            <p className="m-0 w-full text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
              {t('角色IP近30天热度乘子，取决于短剧完播、点赞、收藏等互动表现')}
            </p>
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
