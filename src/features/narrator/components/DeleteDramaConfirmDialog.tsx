/**
 * 叙述者中心 — 「删除短剧」二次确认弹窗。
 * 备注：短剧管理内删除入口；确认后由父组件调用 deleteDrama。
 */
import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/utils';

export type DeleteDramaConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 确认删除：由父组件调用 DELETE `/api/mini-drama/creator/dramas/{id}` */
  onConfirmDelete: () => void | Promise<void>;
  isDeleting: boolean;
};

export function DeleteDramaConfirmDialog({
  open,
  onOpenChange,
  onConfirmDelete,
  isDeleting,
}: DeleteDramaConfirmDialogProps) {
  const { t } = useTranslation();

  // 取消删除：关闭二次确认弹窗
  const handleCancel = () => {
    onOpenChange(false);
  };

  // 确认删除：交由父组件发起删除请求
  const handleConfirmDelete = async () => {
    await onConfirmDelete();
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="text-base leading-6 font-medium text-foreground">
          {t('确定删除该短剧吗？')}
        </span>
      }
      width={400}
      bodyScroll={false}
    >
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isDeleting}
          onClick={handleCancel}
          className={APP_DIALOG_SECONDARY_BUTTON_CLASS}
        >
          {t('取消')}
        </Button>
        <Button
          type="button"
          disabled={isDeleting}
          onClick={handleConfirmDelete}
          className={APP_DIALOG_PRIMARY_BUTTON_CLASS}
        >
          {isDeleting ? (
            <span
              className={cn('inline-flex items-center justify-center', 'gap-2')}
            >
              <Spinner className="size-4 text-background" />
              {t('删除中...')}
            </span>
          ) : (
            t('确定')
          )}
        </Button>
      </div>
    </AppDialog>
  );
}
