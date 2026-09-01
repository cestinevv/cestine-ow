import { useTranslation } from 'react-i18next';

import IconHelp2 from '@/assets/svg/IconHelp2';
import { AppDialog } from '@/components/common/AppDialog';
import { Button } from '@/components/ui/button';
import { IncomeWalletEarningsHelpType } from '@/features/income/incomeWalletEarningsFormat';
import { cn } from '@/utils';

const HELP_DIALOG_META: Record<
  IncomeWalletEarningsHelpType,
  { titleKey: string; descriptionKey: string }
> = {
  [IncomeWalletEarningsHelpType.TotalStory]: {
    titleKey: '累计 STORY',
    descriptionKey: '历史所有周期累计获得的 STORY 总量（含已领取和未领取）。',
  },
  [IncomeWalletEarningsHelpType.TotalUsdc]: {
    titleKey: '累计 USDC',
    descriptionKey: '历史所有角色签约分成、二级版税的累计 USDC 收入。',
  },
  [IncomeWalletEarningsHelpType.SettlingStory]: {
    titleKey: '结算中 STORY',
    descriptionKey: '上个周期结算中的 STORY 收益，预计24小时之内结算成功。',
  },
  [IncomeWalletEarningsHelpType.ClaimableStory]: {
    titleKey: '可领取 STORY',
    descriptionKey: '已结算的 STORY，可领取至个人钱包。',
  },
  [IncomeWalletEarningsHelpType.ClaimableUsdc]: {
    titleKey: '可领取 USDC',
    descriptionKey: '已结算的 USDC，可领取至个人钱包。',
  },
};

type IncomeWalletEarningsHelpLabelProps = {
  helpType: IncomeWalletEarningsHelpType;
  onOpen: (type: IncomeWalletEarningsHelpType) => void;
  className?: string;
};

export function IncomeWalletEarningsHelpLabel({
  helpType,
  onOpen,
  className,
}: IncomeWalletEarningsHelpLabelProps) {
  const { t } = useTranslation();
  const titleKey = HELP_DIALOG_META[helpType].titleKey;

  const handleOpen = () => {
    onOpen(helpType);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <p className="text-[13px] leading-[18px] text-wallet-text-secondary">
        {t(titleKey)}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'size-4 shrink-0 rounded-full p-0',
          'text-wallet-text-secondary',
          'hover:bg-transparent hover:text-wallet-text-secondary',
          'active:bg-transparent',
        )}
        aria-label={t('查看{{title}}说明', { title: t(titleKey) })}
        onClick={handleOpen}
      >
        <IconHelp2 className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

type IncomeWalletEarningsHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  helpType: IncomeWalletEarningsHelpType | null;
};

/** Figma 970:113297 / 113306 / 113314 / 113322 / 113330 — 收益摘要说明弹窗 */
export function IncomeWalletEarningsHelpDialog({
  open,
  onOpenChange,
  helpType,
}: IncomeWalletEarningsHelpDialogProps) {
  const { t } = useTranslation();

  if (!helpType) {
    return null;
  }

  const meta = HELP_DIALOG_META[helpType];

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(meta.titleKey)}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      <div className="flex w-full flex-col items-center gap-6">
        <h2 className="m-0 w-full text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
          {t(meta.titleKey)}
        </h2>
        <p className="w-full text-center text-sm leading-5 font-medium text-wallet-text-secondary">
          {t(meta.descriptionKey)}
        </p>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-11 w-full rounded-xl border-border bg-background',
            'text-sm leading-5 font-bold text-foreground',
          )}
          onClick={handleClose}
        >
          {t('知道了')}
        </Button>
      </div>
    </AppDialog>
  );
}
