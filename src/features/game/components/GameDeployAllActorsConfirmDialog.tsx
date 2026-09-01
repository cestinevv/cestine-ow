import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  getListAllActorsQueryKey,
  getListDeployedActorsQueryKey,
  getListRestActorsQueryKey,
  useDeployActor,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { cn, formatNumber } from '@/utils';

import { GameDialogSubmitLabel } from './GameDialogSubmitLabel';

type GameDeployAllActorsConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 预计安排到空位的角色数 */
  deployCount: number;
};

export function GameDeployAllActorsConfirmDialog({
  open,
  onOpenChange,
  deployCount,
}: GameDeployAllActorsConfirmDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const deployAllMutation = useDeployActor({
    mutation: {
      onSuccess: (response) => {
        // deployAllActor 返回成功派遣的演员列表；按数量区分全成 / 部分 / 全无
        const successCount =
          unwrapOrvalPayload<ActorDTO[]>(response)?.length ?? 0;

        if (successCount <= 0) {
          toast.error(t('体力已耗尽，补充体力后可演出'));
        } else if (successCount >= deployCount) {
          toast.success(t('一键演出成功'));
        } else {
          // 部分派出成功：按错误 toast 展示（含错误 icon）
          toast.error(
            t('{{successCount}}位演出成功，{{failCount}}位体力耗尽暂无法演出', {
              successCount: formatNumber(successCount, 0),
              failCount: formatNumber(deployCount - successCount, 0),
            }),
          );
        }

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
        toast.error(t('一键演出失败，请重试'));
      },
    },
  });

  const handleCancel = () => {
    onOpenChange(false);
  };

  // POST /api/mining/deployAllActor：按片酬从高到低填满空位
  const handleConfirmDeployAll = () => {
    if (deployAllMutation.isPending || deployCount <= 0) {
      return;
    }

    deployAllMutation.mutate();
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('一键演出')}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      <div className="flex flex-col items-center gap-6">
        <header className="flex w-full flex-col items-center gap-1 text-center">
          <h2 className="m-0 text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('一键演出')}
          </h2>
          <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            {t('将按片酬从高到低安排到空在演位')}
          </p>
        </header>

        <div className="flex w-full items-center justify-center rounded-xl bg-muted px-4 py-3">
          <p className="text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('{{count}} 个角色', { count: formatNumber(deployCount, 0) })}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className={cn(APP_DIALOG_SECONDARY_BUTTON_CLASS, 'h-11')}
            disabled={deployAllMutation.isPending}
            onClick={handleCancel}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            className={cn(APP_DIALOG_PRIMARY_BUTTON_CLASS, 'h-11')}
            disabled={deployCount <= 0 || deployAllMutation.isPending}
            onClick={handleConfirmDeployAll}
          >
            <GameDialogSubmitLabel isPending={deployAllMutation.isPending}>
              {t('一键演出')}
            </GameDialogSubmitLabel>
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
