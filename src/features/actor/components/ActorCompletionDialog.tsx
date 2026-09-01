import { useTranslation } from 'react-i18next';

import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/utils';

type ActorCompletionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ActorCompletionDialog({
  open,
  onOpenChange,
}: ActorCompletionDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        bodyScroll={false}
        bare
        className={cn(
          'w-full border-0 bg-transparent p-0 shadow-none md:max-w-[400px]',
        )}
      >
        <div className="flex w-full flex-col items-center gap-6 rounded-t-3xl bg-background p-6 md:rounded-2xl">
          <DialogTitle className="w-full text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('完播')}
          </DialogTitle>
          <p className="w-full text-center text-sm leading-5 font-medium text-muted-foreground">
            {t('该角色 IP 参演的所有短剧的完播次数之和')}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
          >
            {t('知道了')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
