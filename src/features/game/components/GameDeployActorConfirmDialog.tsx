import { useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  getListAllActorsQueryKey,
  getListDeployedActorsQueryKey,
  getListRestActorsQueryKey,
  useDeployActor1,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { formatGameActorLevelName } from '@/features/game/constants/gameActorLevelFormat';
import { getGameActorStoryRateValue } from '@/features/game/formatGameActorStoryRate';
import { cn, formatNumber } from '@/utils';

import { GameDialogSubmitLabel } from './GameDialogSubmitLabel';

type GameDeployActorConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: ActorDTO | null;
  /** 派遣成功后的额外回调（如关闭候选角色大弹层） */
  onDeploySuccess?: () => void;
};

function formatActorCode(actor: ActorDTO): string | undefined {
  if (actor.actorTokenId === undefined) {
    return undefined;
  }

  return `#${formatNumber(actor.actorTokenId, 0)}`;
}

function formatActorLevelMeta(
  actor: ActorDTO,
  t: TFunction,
): string | undefined {
  const parts: string[] = [];

  const levelName = formatGameActorLevelName(t, {
    level: actor.level,
  });

  if (levelName) {
    parts.push(levelName);
  }

  if (actor.level !== undefined) {
    parts.push(`Lv${actor.level}`);
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function GameDeployActorConfirmDialog({
  open,
  onOpenChange,
  actor,
  onDeploySuccess,
}: GameDeployActorConfirmDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Orval：单人派遣为 useDeployActor1（useDeployActor 现为「派遣所有演员」）
  const deployMutation = useDeployActor1({
    mutation: {
      onSuccess: () => {
        toast.success(t('派遣成功'));
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
        onDeploySuccess?.();
      },
    },
  });

  const actorName = actor?.actorName?.trim();
  const actorCode = actor ? formatActorCode(actor) : undefined;
  const actorLevelMeta = actor ? formatActorLevelMeta(actor, t) : undefined;
  const actorNftId = actor?.actorNftId?.trim();

  // Figma 970:121111 — 每小时片酬为 0 时走「片酬为0」红色警示文案
  const isZeroFee = actor !== null && getGameActorStoryRateValue(actor) === 0;

  const handleCancel = () => {
    onOpenChange(false);
  };

  // 调用 POST /api/mining/deployActor，将选中演员派遣至挖矿槽位
  const handleConfirmDeploy = () => {
    if (!actorNftId || deployMutation.isPending) {
      return;
    }

    deployMutation.mutate({ data: { actorNftId } });
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('演出')}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      <div className="flex flex-col items-center gap-6">
        <header className="flex w-full flex-col items-center text-center">
          <h2 className="m-0 text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('演出')}
          </h2>
        </header>

        <div className="flex w-full flex-col items-center justify-center gap-4 rounded-xl bg-muted px-4 py-3">
          {actorName || actorCode || actorLevelMeta ? (
            <div className="flex w-full min-w-0 flex-col items-center gap-1 text-center">
              {actorName || actorCode ? (
                <p className="w-full truncate text-lg leading-[26px] tracking-[-0.04px] text-foreground">
                  {actorName ? (
                    <span className="font-bold">{actorName}</span>
                  ) : null}
                  {actorCode ? (
                    <span className="font-normal">
                      {actorName ? ` ${actorCode}` : actorCode}
                    </span>
                  ) : null}
                </p>
              ) : null}
              {actorLevelMeta ? (
                <p className="w-full truncate text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                  {actorLevelMeta}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="h-px w-full bg-border" aria-hidden />

          <p className="w-full text-center text-[13px] leading-[18px] text-muted-foreground">
            {isZeroFee ? (
              <>
                {t('该角色IP当前')}
                <span className="text-destructive">{t('片酬为0')}</span>
                {'，'}
                {t(
                  '演出不会产生收益。且演出中每小时消耗 1 点体力，是否仍要继续？',
                )}
              </>
            ) : (
              t(
                '该角色演出时自动产生片酬收益。演出中每小时消耗 1 点体力，体力耗尽则停止产出。',
              )
            )}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className={cn(APP_DIALOG_SECONDARY_BUTTON_CLASS, 'h-11')}
            disabled={deployMutation.isPending}
            onClick={handleCancel}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            className={cn(APP_DIALOG_PRIMARY_BUTTON_CLASS, 'h-11')}
            disabled={!actorNftId || deployMutation.isPending}
            onClick={handleConfirmDeploy}
          >
            <GameDialogSubmitLabel isPending={deployMutation.isPending}>
              {t('确认')}
            </GameDialogSubmitLabel>
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
