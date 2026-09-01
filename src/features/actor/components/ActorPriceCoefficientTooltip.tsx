import { useTranslation } from 'react-i18next';

import IconHelpCircle from '@/assets/svg/IconHelpCircle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/utils';

type ActorPriceCoefficientTooltipProps = {
  triggerClassName?: string;
  iconClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
};

function decodeTooltipText(value: string) {
  return value.replaceAll('&gt;', '>');
}

export function ActorPriceCoefficientTooltip({
  triggerClassName,
  iconClassName,
  side = 'top',
  align = 'center',
}: ActorPriceCoefficientTooltipProps) {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring',
              triggerClassName,
            )}
            aria-label={t('查看价格系数说明')}
          />
        }
      >
        <IconHelpCircle className={cn('size-[18px]', iconClassName)} />
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={10}
        className={cn(
          'max-w-[401px] rounded-xl border-0 bg-card p-4 text-left',
          'text-xs leading-4 tracking-[0.04px] text-foreground',
          'shadow-[0px_12px_32px_-16px_rgba(0,0,51,0.06),0px_8px_40px_0px_rgba(0,0,0,0.05)]',
          '[&>*:last-child]:bg-card [&>*:last-child]:fill-card',
        )}
      >
        <div className="flex w-[349px] max-w-[calc(100vw-64px)] flex-col gap-2">
          <p className="text-sm leading-5 font-medium">{t('价格系数说明')}</p>
          <div>
            <p className="mb-0">
              {'P0 ≤ 10 USDC：'}
              <br />
              {t('价格系数 = P0 ÷ 10（线性增长）')}
            </p>
            <p>
              {decodeTooltipText('P0 > 10 USDC：')}
              <br />
              {t('价格系数 = 1.6 × (P0/10)^1.3 / [(P0/10)^1.3 + 0.6]')}
              <br />
              {t('增速渐缓，上限 1.6')}
            </p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
