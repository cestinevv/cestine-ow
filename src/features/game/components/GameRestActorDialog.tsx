import { useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  getListAllActorsQueryKey,
  getListDeployedActorsQueryKey,
  getListRestActorsQueryKey,
  useRestActor,
  useRestAllActor,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { formatGameActorLevelName } from '@/features/game/constants/gameActorLevelFormat';
import { cn, formatNumber } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

import { GameDialogSubmitLabel } from './GameDialogSubmitLabel';

type GameRestActorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: ActorDTO | null;
  /** 当前派遣中角色数，用于「全部休息」 */
  restCount?: number;
};

/** Figma 637:75118：姓名 · LvN · 咖位，单行展示 */
function formatRestActorSummaryLine(
  actor: ActorDTO,
  t: TFunction,
): string | undefined {
  const parts: string[] = [];

  const actorName = actor.actorName?.trim();
  if (actorName) {
    parts.push(actorName);
  }

  if (actor.level !== undefined) {
    parts.push(`Lv${actor.level}`);
  }

  const levelName = formatGameActorLevelName(t, {
    level: actor.level,
  });
  if (levelName) {
    parts.push(levelName);
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

const DIALOG_INFO_CARD_CLASS = cn(
  'flex w-full flex-col items-start justify-center gap-2',
  'rounded-xl bg-muted px-4 py-3',
);

const OR_DIVIDER_LINE_CLASS = 'h-px min-w-0 flex-1 bg-border';

export function GameRestActorDialog({
  open,
  onOpenChange,
  actor,
  restCount = 0,
}: GameRestActorDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const actorSummaryLine = actor
    ? formatRestActorSummaryLine(actor, t)
    : undefined;
  const actorNftId = readSnowflakeId(actor?.actorNftId);

  const restMutation = useRestActor({
    mutation: {
      onSuccess: () => {
        toast.success(t('休息成功'));
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
        toast.error(t('休息失败，请重试'));
      },
    },
  });

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

  const isSingleRestPending = restMutation.isPending;
  const isRestAllPending = restAllMutation.isPending;
  const isAnyPending = isSingleRestPending || isRestAllPending;

  // 调用 POST /api/mining/restActor，将角色从派遣槽召回休息
  const handleConfirmRest = () => {
    if (!actorNftId || isAnyPending) {
      return;
    }

    restMutation.mutate({
      data: { actorNftId },
    });
  };

  // POST /api/mining/restAllActor：所有派遣中演员进入休息
  const handleConfirmRestAll = () => {
    if (isAnyPending || restCount <= 0) {
      return;
    }

    restAllMutation.mutate();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('确认休息')}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      {/* Figma 637:75118 — 移动端：该角色 / 或 / 全部休息 */}
      <div className="flex flex-col items-center gap-6 md:hidden">
        <header className="flex w-full flex-col items-center text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('确认休息')}
          </h2>
        </header>

        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-3">
            {actorSummaryLine ? (
              <div className={cn(DIALOG_INFO_CARD_CLASS, 'gap-4')}>
                <p className="m-0 w-full truncate text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
                  {actorSummaryLine}
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              className={cn(APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS)}
              disabled={!actorNftId || isAnyPending}
              onClick={handleConfirmRest}
            >
              <GameDialogSubmitLabel isPending={isSingleRestPending}>
                {t('该角色')}
              </GameDialogSubmitLabel>
            </Button>
          </div>

          <div className="flex w-full items-center gap-4">
            <div className={OR_DIVIDER_LINE_CLASS} />
            <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {t('或')}
            </span>
            <div className={OR_DIVIDER_LINE_CLASS} />
          </div>

          <div className="flex w-full flex-col gap-3">
            <div className={DIALOG_INFO_CARD_CLASS}>
              <div className="flex w-full items-start justify-between gap-2 text-sm leading-5 text-foreground">
                <p className="m-0">{t('全部休息')}</p>
                <p className="m-0 font-bold">
                  {t('{{count}}位', {
                    count: formatNumber(restCount, 0),
                  })}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-11 w-full rounded-xl border-[1.5px]',
                'text-sm leading-5 font-bold text-foreground',
              )}
              disabled={restCount <= 0 || isAnyPending}
              onClick={handleConfirmRestAll}
            >
              <GameDialogSubmitLabel isPending={isRestAllPending}>
                {t('全部休息')}
              </GameDialogSubmitLabel>
            </Button>
          </div>
        </div>
      </div>

      {/* 桌面：单角色取消 / 休息（批量走区块「一键休息」） */}
      <div className="hidden flex-col items-center gap-6 md:flex">
        <header className="flex w-full flex-col items-center text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('确认休息')}
          </h2>
        </header>

        {actorSummaryLine ? (
          <div
            className={cn(
              'flex w-full flex-col items-center justify-center',
              'rounded-xl bg-game-upgrade-compare-surface px-4 py-3',
            )}
          >
            <p className="m-0 w-full truncate text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
              {actorSummaryLine}
            </p>
          </div>
        ) : null}

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className={cn(APP_DIALOG_SECONDARY_BUTTON_CLASS, 'h-11')}
            disabled={isAnyPending}
            onClick={handleCancel}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            className={cn(APP_DIALOG_PRIMARY_BUTTON_CLASS, 'h-11')}
            disabled={!actorNftId || isAnyPending}
            onClick={handleConfirmRest}
          >
            <GameDialogSubmitLabel isPending={isSingleRestPending}>
              {t('休息')}
            </GameDialogSubmitLabel>
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
