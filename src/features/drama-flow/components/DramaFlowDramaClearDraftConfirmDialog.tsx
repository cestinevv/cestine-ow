import { useTranslation } from 'react-i18next';

import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/utils';

export type CreateDramaClearDraftConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DramaFlowDramaClearDraftConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: CreateDramaClearDraftConfirmDialogProps) {
  const { t } = useTranslation();

  // 取消清空：关闭确认弹窗，保留草稿与同步 Toast。
  const handleCancel = () => {
    onOpenChange(false);
  };

  // 确认清空：交由父组件 resetAll 并关闭弹窗。
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex w-full flex-col overflow-hidden',
          'gap-0 p-0',
          'md:max-w-[400px]',
        )}
      >
        <div className={cn('flex w-full flex-col items-stretch', 'gap-6 p-6')}>
          <DialogTitle
            className={cn(
              'text-center text-base leading-6 font-medium text-foreground',
            )}
          >
            {t('确定清空数据？')}
          </DialogTitle>
          <div className={cn('flex w-full gap-3')}>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className={APP_DIALOG_SECONDARY_BUTTON_CLASS}
            >
              {t('取消')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className={APP_DIALOG_PRIMARY_BUTTON_CLASS}
            >
              {t('确定')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
