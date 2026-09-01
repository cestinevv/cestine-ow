import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { ProfileBlockIcon } from './ProfileModerationIcons';

export function ProfileBlockConfirmDialog({
  open,
  isPending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        bare
        bodyScroll={false}
        className="w-full gap-0 rounded-2xl border-0 bg-card p-0 md:max-w-[343px]"
      >
        <div className="flex w-full flex-col items-center gap-6 rounded-2xl bg-card p-4">
          <div className="flex w-full flex-col items-center gap-4 pt-2">
            <div className="flex w-full items-center justify-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <ProfileBlockIcon className="size-6" />
              </div>
            </div>

            <div className="flex w-full flex-col items-center gap-1 text-center text-foreground">
              <DialogTitle className="w-full text-base leading-6 font-bold">
                {t('拉黑用户')}
              </DialogTitle>
              <p className="w-full text-sm leading-5 font-medium">
                {t(
                  '拉黑后无法查看双方作品，也无法互动。对方不会收到被拉黑的通知',
                )}
              </p>
            </div>
          </div>

          <div className="flex w-full gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onCancel}
              className="h-11 min-w-0 flex-1 rounded-xl border-wallet-divider bg-background px-4 py-2.5 text-sm leading-5 font-bold text-foreground hover:bg-muted"
            >
              {t('关闭')}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={onConfirm}
              className="h-11 min-w-0 flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm leading-5 font-bold text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? <Spinner className="mr-1 size-4" /> : null}
              {t('确认')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type {
  UgcReportFormValue as ProfileReportFormValue,
  UgcReportReasonOption as ProfileReportReasonOption,
} from '@/features/ugc/components/UgcReportDialog';
export { UgcReportDialog as ProfileReportDialog } from '@/features/ugc/components/UgcReportDialog';
