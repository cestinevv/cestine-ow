import { useTranslation } from 'react-i18next';

import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/utils';

type CreateSecondEpisodeDeleteConfirmDialogProps = {
  open: boolean;
  episodeTitle: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DramaFlowSecondEpisodeDeleteConfirmDialog({
  open,
  episodeTitle,
  onOpenChange,
  onConfirm,
}: CreateSecondEpisodeDeleteConfirmDialogProps) {
  const { t } = useTranslation();

  // 用户点击「取消」或关闭弹层时仅关闭，不删除。
  const handleCancel = () => {
    onOpenChange(false);
  };

  // 用户点击「确定」后执行上层删除逻辑并关闭弹层。
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
          'md:max-w-[360px]',
        )}
      >
        <div className={cn('flex w-full flex-col items-stretch', 'gap-6 p-6')}>
          <DialogTitle
            className={cn(
              'm-0 w-full text-center',
              'text-base leading-6 font-medium tracking-normal text-foreground',
            )}
          >
            {t('确定删除 "{{title}}" 吗？', { title: episodeTitle })}
          </DialogTitle>
          <div
            className={cn(
              'flex w-full flex-row items-start justify-end',
              'gap-3',
            )}
          >
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
