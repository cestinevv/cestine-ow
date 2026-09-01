import { useTranslation } from 'react-i18next';

import { APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/utils';

type CreateFourthSubmitReviewSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 点击「确定」时额外回调（如后续接审核接口成功后的跳转）。 */
  onConfirm?: () => void;
};

function handleDismissGuardedOpenChange(
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  if (open) {
    onOpenChange(true);
  }
}

export function DramaFlowSubmitReviewSuccessDialog({
  open,
  onOpenChange,
  onConfirm,
}: CreateFourthSubmitReviewSuccessDialogProps) {
  const { t } = useTranslation();

  // 用户点击「确定」：执行可选回调并关闭弹层。
  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      disablePointerDismissal
      onOpenChange={(nextOpen) =>
        handleDismissGuardedOpenChange(nextOpen, onOpenChange)
      }
    >
      <DialogContent
        className={cn(
          'flex w-full flex-col overflow-hidden',
          'gap-0 p-0',
          'md:max-w-[360px]',
        )}
      >
        <div className={cn('flex w-full flex-col items-stretch', 'gap-8 p-6')}>
          <div className={cn('flex w-full flex-col items-center', 'gap-2')}>
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-full',
                'bg-success',
              )}
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={cn('size-5 text-success-foreground')}
                aria-hidden
              >
                <title>{t('发布成功')}</title>
                <path
                  d="M6 12.5L10.5 17L18 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <DialogTitle
              className={cn(
                'm-0 w-full text-center',
                'text-base font-medium leading-6 tracking-normal text-foreground',
              )}
            >
              {t('发布成功')}
            </DialogTitle>
          </div>
          <div
            className={cn(
              'flex w-full flex-row items-start justify-end',
              'gap-3',
            )}
          >
            <Button
              type="button"
              onClick={handleConfirm}
              className={APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS}
            >
              {t('确定')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
