import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useListDeployedActors } from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { ActorDTOStatus } from '@/api/__generated__/mining/model/actorDTOStatus';
import { Button } from '@/components/ui/button';
import { formatActorIpDisplay } from '@/features/actor/actorFormat';
import {
  getGameActorStaminaLimit,
  getGameActorUpgradeConfig,
  isGameActorMaxLevel,
} from '@/features/game/constants/gameActorConfig';
import { getGameActorStatusLabelKey } from '@/features/game/constants/gameActorStatus';
import { isActorStaminaFull } from '@/features/game/constants/gameStamina';
import { formatGameActorStoryRate } from '@/features/game/formatGameActorStoryRate';
import {
  type GameListAllActorsPollContext,
  useIsActorStaminaSyncing,
  useIsActorUpgradeSyncing,
} from '@/features/game/gameActorStaminaCache';
import { guardGameDeploySlot } from '@/features/game/gameDeployLimit';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { getActorMiningPowerBreakdown } from '@/features/mining/miningPower';
import { PLAY_CARD_COVER_ASPECT_CLASS } from '@/features/play/playFormat';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

import { GameActorLevelBadge } from './GameActorLevelBadge';
import { GameActorPowerDialog } from './GameActorPowerDialog';
import { GameActorStaminaBar } from './GameActorStaminaBar';
import { GameActorUpgradeDialog } from './GameActorUpgradeDialog';
import { GameDeployActorConfirmDialog } from './GameDeployActorConfirmDialog';
import { GameRefillButton } from './GameRefillButton';
import { GameRefillStaminaDialog } from './GameRefillStaminaDialog';
import { GameRestActorDialog } from './GameRestActorDialog';
import { GameUpgradeButton } from './GameUpgradeButton';

type GameMyActorCardProps = {
  actor: ActorDTO;
  upgradeListContext: GameListAllActorsPollContext;
};

function formatActorCode(actor: ActorDTO): string | undefined {
  if (actor.actorTokenId === undefined) {
    return undefined;
  }

  return `#${formatNumber(actor.actorTokenId, 0)}`;
}

export function GameMyActorCard({
  actor,
  upgradeListContext,
}: GameMyActorCardProps) {
  const { t } = useTranslation();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const initConfig = useConfigStore((state) => state.initConfig);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isPowerDialogOpen, setIsPowerDialogOpen] = useState(false);
  const [isReplenishDialogOpen, setIsReplenishDialogOpen] = useState(false);
  const [isRestDialogOpen, setIsRestDialogOpen] = useState(false);

  const { data: deployedResponse } = useListDeployedActors({
    query: {
      enabled: isLogin,
      retry: false,
    },
  });

  const deployedCount = useMemo(
    () => unwrapOrvalPayload<ActorDTO[]>(deployedResponse)?.length ?? 0,
    [deployedResponse],
  );

  const actorName = actor.actorName?.trim();
  const actorCode = formatActorCode(actor);
  const avatarUrl = actor.avatarUrl?.trim();
  const avatarAlt = actorName
    ? t('{{name}} 的角色头像', { name: actorName })
    : t('角色头像');
  const staminaLimit = getGameActorStaminaLimit(initConfig ?? undefined);
  const actorCollectionId = readSnowflakeId(actor.actorCollectionId);
  const actorIpValue = actorCollectionId ?? '';
  const actorIpLabel = formatActorIpDisplay(actorCollectionId);
  const isMining = actor.status === ActorDTOStatus.MINING;
  const isRest = actor.status === ActorDTOStatus.REST;
  const statusLabelKey = getGameActorStatusLabelKey(actor.status);
  const canDeploy = isRest && Boolean(actor.actorNftId?.trim());
  const hasUpgradeConfig =
    getGameActorUpgradeConfig(initConfig ?? undefined, actor.level) !==
    undefined;
  const isMaxLevel = isGameActorMaxLevel(initConfig ?? undefined, actor.level);
  const canUpgrade = !isMining && hasUpgradeConfig;
  const canOpenLevelUpgradeDialog = hasUpgradeConfig || isMaxLevel;
  const isStaminaFull = isActorStaminaFull(actor.stamina, staminaLimit);
  const isStaminaSyncing = useIsActorStaminaSyncing(actor.actorNftId);
  const isUpgradeSyncing = useIsActorUpgradeSyncing(actor.actorNftId);
  const showUpgradeButton = !isMining && hasUpgradeConfig;
  const showRestReplenishActions =
    isRest && (!isStaminaFull || isStaminaSyncing);
  const showRestDeployOnly = isRest && isStaminaFull && !isStaminaSyncing;
  const powerBreakdown = getActorMiningPowerBreakdown(
    actor as unknown as Record<string, unknown>,
  );

  // 接口 weeklyNominalOutput 为 null 时按 0 展示
  const weeklyNominalOutputValue =
    actor.weeklyNominalOutput === null ? 0 : actor.weeklyNominalOutput;

  const copyText = async (value: string) => {
    if (!value) {
      return;
    }
    await navigator.clipboard.writeText(value);
    toast.success(t('编号已复制'));
  };

  const handleCopyActorIp = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void copyText(actorIpValue);
  };

  // 打开安排演出确认弹窗；体力为 0 或演出位已满时 toast 阻断
  const handleDeployClick = () => {
    if (!canDeploy) {
      return;
    }

    if (actor.stamina === 0) {
      toast.error(t('体力已耗尽，补充体力后可演出'));
      return;
    }

    if (guardGameDeploySlot(deployedCount, t)) {
      return;
    }

    setIsDeployDialogOpen(true);
  };

  const handleDeployDialogOpenChange = (open: boolean) => {
    setIsDeployDialogOpen(open);
  };

  const handleOpenUpgradeDialog = () => {
    if (!canOpenLevelUpgradeDialog || isUpgradeSyncing) {
      return;
    }

    setIsUpgradeDialogOpen(true);
  };

  const handleOpenPowerDialog = () => {
    setIsPowerDialogOpen(true);
  };

  const handlePowerDialogOpenChange = (open: boolean) => {
    setIsPowerDialogOpen(open);
  };

  const handleUpgradeDialogOpenChange = (open: boolean) => {
    setIsUpgradeDialogOpen(open);
  };

  // 打开补充体力弹窗，与派遣中角色卡片交互一致
  const handleReplenishClick = () => {
    if (isStaminaFull) {
      return;
    }

    setIsReplenishDialogOpen(true);
  };

  const handleReplenishDialogOpenChange = (open: boolean) => {
    setIsReplenishDialogOpen(open);
  };

  // 打开休息确认弹窗，与派遣中角色卡片交互一致
  const handleRestClick = () => {
    setIsRestDialogOpen(true);
  };

  const handleRestDialogOpenChange = (open: boolean) => {
    setIsRestDialogOpen(open);
  };

  return (
    <>
      <article className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-card">
        <figure
          className={cn(
            'relative w-full shrink-0 overflow-hidden bg-muted',
            PLAY_CARD_COVER_ASPECT_CLASS,
          )}
        >
          {avatarUrl ? (
            <img
              alt={avatarAlt}
              src={avatarUrl}
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : null}

          <GameActorLevelBadge
            level={actor.level}
            className="absolute top-4 left-4"
            onClick={
              canOpenLevelUpgradeDialog && !isUpgradeSyncing
                ? handleOpenUpgradeDialog
                : undefined
            }
          />

          {showUpgradeButton ? (
            <GameUpgradeButton
              actorNftId={actor.actorNftId}
              disabled={!canUpgrade}
              onClick={handleOpenUpgradeDialog}
            />
          ) : null}

          {actorCollectionId ? (
            // biome-ignore lint/a11y/useSemanticElements: 图片角标与 ActorPlazaCard 一致，避免 Button 破坏叠层样式
            <span
              role="button"
              tabIndex={0}
              onClick={handleCopyActorIp}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  void copyText(actorIpValue);
                }
              }}
              className="absolute bottom-4 left-4 rounded-full bg-onestory-brand-red py-1 pr-1.5 pl-2 text-xs leading-4 font-medium tracking-[0.04px] text-white"
            >
              {t('角色 IP {{code}}', { code: actorIpLabel })}
            </span>
          ) : null}

          {statusLabelKey ? (
            <span className="absolute right-4 bottom-4 flex items-center gap-1 rounded-full bg-black/50 py-1 pr-1.5 pl-2 text-xs leading-4 font-medium text-white">
              <span
                className={cn(
                  'size-[9px] rounded-full',
                  isMining ? 'bg-onestory-brand-red' : 'bg-white',
                )}
                aria-hidden
              />
              {t(statusLabelKey)}
            </span>
          ) : null}
        </figure>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <header className="flex min-w-0 items-baseline gap-1">
            {actorName ? (
              <h3 className="truncate text-base leading-6 font-bold text-foreground">
                {actorName}
              </h3>
            ) : null}
            {actorCode ? (
              <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                {actorCode}
              </span>
            ) : null}
          </header>

          <GameActorStaminaBar
            stamina={actor.stamina}
            staminaLimit={staminaLimit}
            boltFirst
            showHelp
          />

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenPowerDialog}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl bg-game-stat-surface px-4 py-2',
                  'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <span className="text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
                  {t('角色片酬')}
                </span>
                <span className="text-sm leading-5 font-medium text-foreground">
                  {formatGameActorStoryRate(actor)}
                </span>
              </button>
              <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-game-stat-surface px-4 py-2">
                <span className="text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
                  {t('本周名义产出')}
                </span>
                <span className="inline-flex items-baseline gap-0.5 text-sm leading-5 font-medium text-foreground">
                  {weeklyNominalOutputValue !== undefined
                    ? formatNumber(weeklyNominalOutputValue, 2)
                    : '-'}
                  {weeklyNominalOutputValue !== undefined ? (
                    <span className="text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground">
                      STORY
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>

          {showRestReplenishActions ? (
            <div className="flex gap-3">
              <GameRefillButton
                actorNftId={actor.actorNftId}
                isStaminaFull={isStaminaFull}
                onClick={handleReplenishClick}
              />
              <Button
                type="button"
                variant="ghost"
                disabled={!canDeploy}
                className={cn(
                  'h-11 flex-1 rounded-xl px-4 py-2.5',
                  'text-sm leading-5 font-bold',
                  'bg-game-my-actor-deploy-surface text-game-my-actor-deploy-text',
                  'hover:bg-game-my-actor-deploy-surface hover:text-game-my-actor-deploy-text',
                  'disabled:opacity-60',
                )}
                onClick={handleDeployClick}
              >
                {t('派遣')}
              </Button>
            </div>
          ) : null}

          {showRestDeployOnly ? (
            <Button
              type="button"
              variant="ghost"
              disabled={!canDeploy}
              className={cn(
                'h-11 w-full rounded-xl px-4 py-2.5',
                'text-sm leading-5 font-bold',
                'bg-game-my-actor-deploy-surface text-game-my-actor-deploy-text',
                'hover:bg-game-my-actor-deploy-surface hover:text-game-my-actor-deploy-text',
                'disabled:opacity-60',
              )}
              onClick={handleDeployClick}
            >
              {t('派遣')}
            </Button>
          ) : null}

          {isMining ? (
            <div className="flex gap-3">
              <GameRefillButton
                actorNftId={actor.actorNftId}
                isStaminaFull={isStaminaFull}
                onClick={handleReplenishClick}
              />
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  // 与「补充」同款描边按钮
                  'h-9 flex-1 rounded-xl border-[1.5px] border-game-header-action-border bg-transparent px-3',
                  'text-sm leading-5 font-medium text-game-header-title',
                  'hover:bg-game-header-action-hover hover:text-game-header-title',
                )}
                onClick={handleRestClick}
              >
                {t('休息')}
              </Button>
            </div>
          ) : null}
        </div>
      </article>

      <GameDeployActorConfirmDialog
        open={isDeployDialogOpen}
        onOpenChange={handleDeployDialogOpenChange}
        actor={isDeployDialogOpen ? actor : null}
      />

      <GameActorUpgradeDialog
        open={isUpgradeDialogOpen}
        onOpenChange={handleUpgradeDialogOpenChange}
        actor={actor}
        readOnly={isMining}
        upgradeListContext={upgradeListContext}
      />

      <GameActorPowerDialog
        open={isPowerDialogOpen}
        onOpenChange={handlePowerDialogOpenChange}
        breakdown={powerBreakdown}
        level={actor.level}
        actorName={actorName}
      />

      <GameRefillStaminaDialog
        open={isReplenishDialogOpen}
        onOpenChange={handleReplenishDialogOpenChange}
        actor={isReplenishDialogOpen ? actor : null}
      />

      <GameRestActorDialog
        open={isRestDialogOpen}
        onOpenChange={handleRestDialogOpenChange}
        actor={isRestDialogOpen ? actor : null}
      />
    </>
  );
}
