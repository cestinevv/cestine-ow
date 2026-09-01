import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';

type ActorIpVaultDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ActorIpVaultDialog({
  open,
  onOpenChange,
}: ActorIpVaultDialogProps) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('角色 IP 金库')}
      width={400}
      bodyScroll={false}
    >
      <div className="flex flex-col items-center gap-6">
        <p className="w-full text-center text-sm leading-5 font-medium text-muted-foreground">
          {t(
            '签约收入的 30% 自动沉淀至角色 IP 金库，用于支撑 IP 生态的长期发展。二级市场版税收入的 30% 同样归入金库，形成持续资金蓄水池。V1 版本金库仅提供数据展示，暂不开放分配。',
          )}
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
