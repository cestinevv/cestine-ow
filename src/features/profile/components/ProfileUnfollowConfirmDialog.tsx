import { useTranslation } from 'react-i18next';

import userMinusUrl from '@/assets/figma/profile-follow/user-minus.svg';
import IconX from '@/assets/svg/IconX';
import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';

type ProfileUnfollowConfirmDialogProps = {
  open: boolean;
  nickname?: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ProfileUnfollowConfirmDialog({
  open,
  nickname,
  isPending,
  onOpenChange,
  onConfirm,
}: ProfileUnfollowConfirmDialogProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('取消关注')}
      width={343}
      bodyScroll={false}
      bodyClassName="p-0"
      hideHeader
    >
      <div className="flex w-full flex-col items-center gap-6 rounded-2xl bg-card p-4">
        <div className="flex w-full flex-col items-center gap-4 pt-2">
          <div className="flex w-full items-start justify-between">
            <div className="size-6 opacity-0" aria-hidden />
            <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10">
              <img src={userMinusUrl} alt="" className="size-6" aria-hidden />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 rounded-full p-0"
              aria-label={t('关闭')}
              onClick={handleClose}
            >
              <IconX className="size-6 text-foreground" />
            </Button>
          </div>

          <div className="flex w-full flex-col items-center gap-1 text-center text-foreground">
            <h2 className="w-full text-base leading-6 font-bold">
              {t('取消关注')}
            </h2>
            <p className="w-full text-sm leading-5 font-medium">
              {t('确认不再关注 @{{name}} 吗？', { name: nickname ?? '' })}
            </p>
          </div>
        </div>

        <Button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className={APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS}
        >
          {t('确认')}
        </Button>
      </div>
    </AppDialog>
  );
}
