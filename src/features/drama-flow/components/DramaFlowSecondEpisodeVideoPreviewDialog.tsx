import { useTranslation } from 'react-i18next';

import IconX from '@/assets/svg/IconX';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { DramaFlowEpisodePreviewVideoPlayer } from '@/features/drama-flow/components/DramaFlowEpisodePreviewVideoPlayer';
import { cn } from '@/utils';

type CreateSecondEpisodeVideoPreviewDialogProps = {
  open: boolean;
  title: string;
  videoSrc: string | null;
  onOpenChange: (open: boolean) => void;
};

export function DramaFlowSecondEpisodeVideoPreviewDialog({
  open,
  title,
  videoSrc,
  onOpenChange,
}: CreateSecondEpisodeVideoPreviewDialogProps) {
  const { t } = useTranslation();

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        bare
        bodyScroll={false}
        className={cn(
          'flex w-full flex-col overflow-hidden',
          'gap-0 p-0',
          'md:max-w-[720px]',
        )}
      >
        <div className={cn('flex w-full flex-col', 'gap-6 p-6')}>
          <div className={cn('flex w-full items-center justify-between gap-4')}>
            <DialogTitle
              className={cn(
                'm-0 min-w-0 flex-1 truncate text-left',
                'text-base leading-6 font-medium tracking-normal text-foreground',
              )}
            >
              {title}
            </DialogTitle>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full"
                  aria-label={t('关闭')}
                />
              }
            >
              <IconX className="size-6 text-foreground" />
            </DialogClose>
          </div>

          {videoSrc ? (
            <DramaFlowEpisodePreviewVideoPlayer
              videoSrc={videoSrc}
              isActive={open}
            />
          ) : null}

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
