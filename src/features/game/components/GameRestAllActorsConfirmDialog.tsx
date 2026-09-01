import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  getListAllActorsQueryKey,
  getListDeployedActorsQueryKey,
  getListRestActorsQueryKey,
  useRestAllActor,
} from '@/api/__generated__/mining/mining/mining';
import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { cn, formatNumber } from '@/utils';

import { GameDialogSubmitLabel } from './GameDialogSubmitLabel';

type GameRestAllActorsConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前派遣中、将进入休息的角色数 */
  restCount: number;
};

export function GameRestAllActorsConfirmDialog({
  open,
  onOpenChange,
  restCount,
}: GameRestAllActorsConfirmDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const restAllMutation = useRestAllActor({
    mutation: {
      onSuccess: () => {
        toast.success(t('一键休息成功'));
        void queryClient.invalidateQueries({
          queryKey: getListDeployedActorsQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getListRestActorsQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getListAllActorsQueryKey(),
        });
        onOpenChange(false);
      },
      onError: () => {
        toast.error(t('一键休息失败，请重试'));
      },
    },
  });

  const handleCancel = () => {
    onOpenChange(false);
  };

  // POST /api/mining/restAllActor：所有派遣中演员进入休息
  const handleConfirmRestAll = () => {
    if (restAllMutation.isPending || restCount <= 0) {
      return;
    }

    restAllMutation.mutate();
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('一键休息')}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      <div className="flex flex-col items-center gap-6">
        <header className="flex w-full flex-col items-center gap-1 text-center">
          <h2 className="m-0 text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('一键休息')}
          </h2>
          <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            {t('将召回全部在演角色，停止消耗体力与产出')}
          </p>
        </header>

        <div className="flex w-full items-center justify-center rounded-xl bg-muted px-4 py-3">
          <p className="text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('{{count}} 个角色', { count: formatNumber(restCount, 0) })}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className={cn(APP_DIALOG_SECONDARY_BUTTON_CLASS, 'h-11')}
            disabled={restAllMutation.isPending}
            onClick={handleCancel}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            className={cn(APP_DIALOG_PRIMARY_BUTTON_CLASS, 'h-11')}
            disabled={restCount <= 0 || restAllMutation.isPending}
            onClick={handleConfirmRestAll}
          >
            <GameDialogSubmitLabel isPending={restAllMutation.isPending}>
              {t('一键休息')}
            </GameDialogSubmitLabel>
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
