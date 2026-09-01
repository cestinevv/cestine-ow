import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

export type MintActorNftSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorName: string;
  nftIdLabel: string;
  onConfirm: () => void;
};

export function MintActorNftSuccessDialog({
  open,
  onOpenChange,
  actorName,
  nftIdLabel,
  onConfirm,
}: MintActorNftSuccessDialogProps) {
  const { t } = useTranslation();

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      bodyScroll={false}
      title={<span className="sr-only">{t('签约成功！')}</span>}
      width={424}
    >
      <div className={cn('flex flex-col items-center gap-2 pb-0 text-center')}>
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            'bg-emerald-500 text-lg font-bold text-white',
          )}
          aria-hidden
        >
          ✓
        </div>
        <p className="text-base leading-6 font-bold text-foreground">
          {t('签约成功！')}
        </p>
        <p className="text-sm leading-5 font-medium text-foreground">
          {t('角色「{{actorName}}」签约成功', { actorName })}
        </p>
        <p className="text-sm leading-5 text-muted-foreground">
          {t('NFT编号：{{nftId}}', { nftId: nftIdLabel })}
        </p>
        <Button
          type="button"
          onClick={onConfirm}
          className={cn('mt-6', APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS)}
        >
          {t('确认')}
        </Button>
      </div>
    </AppDialog>
  );
}
