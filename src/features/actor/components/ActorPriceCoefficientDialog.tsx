import { useTranslation } from 'react-i18next';

import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

type ActorPriceCoefficientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function decodeDialogText(value: string) {
  return value.replaceAll('&gt;', '>');
}

function PriceRuleCard({
  title,
  formula,
  description,
}: {
  title: string;
  formula: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-muted p-3">
      <div className="flex flex-col gap-1 text-sm leading-5 text-foreground">
        <span>{title}</span>
        <strong className="font-bold">{formula}</strong>
      </div>
      <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function ActorPriceCoefficientDialog({
  open,
  onOpenChange,
}: ActorPriceCoefficientDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        bare
        bodyScroll={false}
        className="w-full rounded-2xl border-0 bg-background p-0 md:max-w-[400px]"
      >
        <div className="flex w-full flex-col gap-6 p-6">
          <div className="flex flex-col gap-3">
            <DialogTitle className="m-0 text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
              {t('价格系数')}
            </DialogTitle>
            <div className="rounded-lg bg-muted px-4 py-2 text-center text-sm leading-5 text-foreground">
              {t('IP片酬 = 价格系数 × 热度系数 × Trust1')}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <PriceRuleCard
              title={'P0 ≤ 10 USDC'}
              formula={t('系数 = P0 ÷ 10')}
              description={t('线性增长')}
            />
            <PriceRuleCard
              title={decodeDialogText('P0 > 10 USDC')}
              formula={t('系数 = 1.6 × (P0/10)^1.3 / [(P0/10)^1.3 + 0.6]')}
              description={t('增速渐缓，上限 1.6')}
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
      </DialogContent>
    </Dialog>
  );
}
