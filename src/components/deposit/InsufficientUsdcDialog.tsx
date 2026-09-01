import Decimal from 'decimal.js';
import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { Button } from '@/components/ui/button';
import { useDialogStore } from '@/stores/dialogStore';
import { cn, formatNumber, toDecimalPlaces } from '@/utils';

/**
 * 邮箱账户 USDC 预检不足：确认后打开现有充值弹窗。
 */
export function InsufficientUsdcDialog() {
  const { t } = useTranslation();
  const insufficientUsdcDialogOpen = useDialogStore(
    (s) => s.insufficientUsdcDialogOpen,
  );
  const insufficientUsdcShortfall = useDialogStore(
    (s) => s.insufficientUsdcShortfall,
  );
  const closeInsufficientUsdcDialog = useDialogStore(
    (s) => s.closeInsufficientUsdcDialog,
  );
  const openDepositDialog = useDialogStore((s) => s.openDepositDialog);

  // 点遮罩或关闭：只关掉余额不足弹窗
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      closeInsufficientUsdcDialog();
    }
  };

  // 取消：仅关闭余额不足弹窗，不进入充值
  const handleCancel = () => {
    closeInsufficientUsdcDialog();
  };

  // 确认：关闭本弹窗并打开邮箱账户充值弹窗
  const handleConfirm = () => {
    closeInsufficientUsdcDialog();
    openDepositDialog();
  };

  return (
    <AppDialog
      open={insufficientUsdcDialogOpen}
      onOpenChange={handleOpenChange}
      title={t('余额不足')}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      <div className="flex flex-col items-center gap-6">
        <h2 className="m-0 w-full text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
          {t('余额不足')}
        </h2>

        <div className="flex w-full flex-col items-center gap-1.5 text-center text-sm leading-5 font-medium">
          <p className="m-0 w-full text-foreground">
            {t('USDC 余额不足，你还差 {{amount}} USDC', {
              amount: formatNumber(
                toDecimalPlaces(insufficientUsdcShortfall, 2, Decimal.ROUND_UP),
              ),
            })}
          </p>
          <p className="m-0 w-full text-muted-foreground">
            {t('是否前往充值？')}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-11 flex-1 rounded-xl',
              'text-sm leading-5 font-bold',
            )}
            onClick={handleCancel}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            className={cn(
              'h-11 flex-1 rounded-xl',
              'bg-foreground text-background',
              'text-sm leading-5 font-bold',
              'hover:bg-foreground/90 hover:text-background',
            )}
            onClick={handleConfirm}
          >
            {t('确认')}
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
