import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';

type GameRiskAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GameRiskAccountDialog({
  open,
  onOpenChange,
}: GameRiskAccountDialogProps) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('风险账户')}
      width={400}
      bodyScroll={false}
    >
      <div className="flex flex-col items-center gap-6">
        <p className="w-full text-center text-sm leading-5 font-medium text-muted-foreground">
          {t('该账户信任系数异常，挖矿权重将受影响。')}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={handleConfirm}
          className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
        >
          {t('知道了')}
        </Button>
      </div>
    </AppDialog>
  );
}
