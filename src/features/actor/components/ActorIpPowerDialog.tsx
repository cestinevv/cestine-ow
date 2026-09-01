import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import type { ActorIpPowerBreakdown } from '@/features/mining/miningPower';
import {
  formatHeatFactor,
  formatPowerFactor,
} from '@/features/mining/miningPower';

type ActorIpPowerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorName: string;
  breakdown: ActorIpPowerBreakdown;
};

function ActorIpPowerFactorCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 rounded-lg bg-muted p-3">
      <div className="flex items-start justify-between gap-4 text-sm leading-5 text-foreground">
        <span>{label}</span>
        <strong className="font-bold">× {value}</strong>
      </div>
      <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function ActorIpPowerDialog({
  open,
  onOpenChange,
  actorName,
  breakdown,
}: ActorIpPowerDialogProps) {
  const { t } = useTranslation();

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${actorName} · ${t('IP片酬')}`}
      width={400}
      bodyClassName="px-6 pb-6"
    >
      <div className="flex flex-col gap-6">
        <div className="rounded-lg bg-muted px-4 py-2 text-center text-sm leading-5 text-foreground">
          {t('IP片酬 = 价格系数 × 热度系数 × Trust1')}
        </div>

        <div className="flex flex-col gap-2">
          <ActorIpPowerFactorCard
            label={t('价格系数')}
            value={formatPowerFactor(breakdown.priceCoefficient)}
            description={t(
              '根据发行 IP 时的初始价格 P0 计算。P0 ≤ 10 USDC 时线性增长，P0 > 10 USDC 时增速渐缓，上限 1.6',
            )}
          />
          <ActorIpPowerFactorCard
            label={t('热度系数')}
            value={formatHeatFactor(breakdown.heatCoefficient)}
            description={t(
              '角色 IP 近 30 天热度乘子，取决于短剧完播、点赞、收藏等互动表现',
            )}
          />
          <ActorIpPowerFactorCard
            label="Trust1"
            value={formatHeatFactor(breakdown.trust1)}
            description={t('平台风控系数，默认值为 1.0')}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
        >
          {t('知道了')}
        </Button>
      </div>
    </AppDialog>
  );
}
