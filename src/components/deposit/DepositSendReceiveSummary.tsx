import { useTranslation } from 'react-i18next';
import IconArrowRight from '@/assets/svg/IconArrowRight';
import { TokenAssetIcon } from '@/components/common/TokenAssetIcon';
import { cn } from '@/utils';

type DepositSendReceiveSummaryProps = {
  sendSymbol: string;
  sendTokenIcon: string;
  sendChainIcon: string;
  receiveSymbol: string;
  receiveTokenIcon: string;
  receiveChainIcon: string;
};

/** 发送 → 接收摘要条（兑换关系展示） */
export function DepositSendReceiveSummary({
  sendSymbol,
  sendTokenIcon,
  sendChainIcon,
  receiveSymbol,
  receiveTokenIcon,
  receiveChainIcon,
}: DepositSendReceiveSummaryProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        // Layout
        'flex items-center justify-center',
        // Spacing
        'gap-4 p-4',
        // Visual
        'rounded-xl',
      )}
    >
      <div className={cn('flex items-center', 'gap-2')}>
        <div className="relative size-8 shrink-0">
          <TokenAssetIcon symbol={sendSymbol} iconUrl={sendTokenIcon} />
          <span
            className={cn(
              'absolute right-[-1.5px] bottom-[-2px]',
              'rounded-full bg-background p-px',
            )}
          >
            <img
              src={sendChainIcon}
              alt=""
              className="size-3 rounded-full object-cover"
            />
          </span>
        </div>
        <div className="flex flex-col">
          <span
            className={cn(
              'text-xs leading-4 tracking-[0.04px] text-muted-foreground',
            )}
          >
            {t('发送')}
          </span>
          <span className="text-sm leading-5 font-bold text-foreground">
            {sendSymbol}
          </span>
        </div>
      </div>

      <IconArrowRight className="size-6 shrink-0 text-muted-foreground" />

      <div className={cn('flex items-center', 'gap-2')}>
        <div className="relative size-8 shrink-0">
          <TokenAssetIcon symbol={receiveSymbol} iconUrl={receiveTokenIcon} />
          <span
            className={cn(
              'absolute right-[-1.5px] bottom-[-2px]',
              'rounded-full bg-background p-px',
            )}
          >
            <img
              src={receiveChainIcon}
              alt=""
              className="size-3 rounded-full object-cover"
            />
          </span>
        </div>
        <div className="flex flex-col">
          <span
            className={cn(
              'text-xs leading-4 tracking-[0.04px] text-muted-foreground',
            )}
          >
            {t('接收')}
          </span>
          <span className="text-sm leading-5 font-bold text-foreground">
            {receiveSymbol}
          </span>
        </div>
      </div>
    </div>
  );
}
