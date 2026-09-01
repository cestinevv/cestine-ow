import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import IconCoffee from '@/assets/svg/IconCoffee';
import { ActorDetailRouteLink } from '@/components/common/ActorDetailRouteLink';
import { Button } from '@/components/ui/button';
import { resolveActorDetailRouteId } from '@/features/game/constants/gameActorNft';
import {
  GAME_DEPLOYED_ACTOR_CARD_CLASS,
  GAME_DEPLOYED_ACTOR_COVER_ASPECT_CLASS,
  GAME_DEPLOYED_ACTOR_SLOT_SIZE_CLASS,
} from '@/features/game/constants/gameConstants';
import {
  GameDeployedActorStaminaVisualState,
  getGameDeployedActorStaminaBarVariant,
  resolveGameDeployedActorStaminaVisualState,
} from '@/features/game/constants/gameDeployedActorStaminaVisual';
import { isActorStaminaFull } from '@/features/game/constants/gameStamina';
import { getActorMiningPowerBreakdown } from '@/features/mining/miningPower';
import { PLAY_CARD_COVER_ASPECT_CLASS } from '@/features/play/playFormat';
import { useConfigStore } from '@/stores/config';
import { cn, formatNumber } from '@/utils';

import { GameActorLevelBadge } from './GameActorLevelBadge';
import { GameActorPowerDialog } from './GameActorPowerDialog';
import { GameActorStaminaBar } from './GameActorStaminaBar';
import { GameActorStoryRateButton } from './GameActorStoryRateButton';
import { GameRefillButton } from './GameRefillButton';

type GameDeployedActorCardProps = {
  actor: ActorDTO;
  /** carousel：桌面多卡；mobileFocus：Figma 358 单卡聚焦 */
  variant?: 'carousel' | 'mobileFocus';
  onReplenishClick?: (actor: ActorDTO) => void;
  onRestClick?: (actor: ActorDTO) => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  slotDots?: ReactNode;
};

/** Figma 358:61425 / 61436 — 卡内圆形 chevron */
const MOBILE_FOCUS_CHEVRON_CLASS = cn(
  'size-11 shrink-0 rounded-full border border-border p-2.5',
  'bg-transparent text-foreground',
  'hover:bg-muted/60 hover:text-foreground',
  'disabled:pointer-40',
);

function formatActorCode(actor: ActorDTO): string | undefined {
  if (actor.actorTokenId === undefined) {
    return undefined;
  }

  return `#${formatNumber(actor.actorTokenId, 0)}`;
}

export function GameDeployedActorCard({
  actor,
  variant = 'carousel',
  onReplenishClick,
  onRestClick,
  canGoPrev = false,
  canGoNext = false,
  onPrev,
  onNext,
  slotDots,
}: GameDeployedActorCardProps) {
  const { t } = useTranslation();
  const initConfig = useConfigStore((state) => state.initConfig);
  const [isPowerDialogOpen, setIsPowerDialogOpen] = useState(false);

  const actorName = actor.actorName?.trim();
  const actorCode = formatActorCode(actor);
  const avatarUrl = actor.avatarUrl?.trim();
  const avatarAlt = actorName
    ? t('{{name}} 的角色头像', { name: actorName })
    : t('角色头像');
  const staminaLimit = initConfig?.actorNft?.staminaLimit;
  const staminaVisualState = resolveGameDeployedActorStaminaVisualState(
    actor.stamina,
    staminaLimit,
  );
  const staminaBarVariant =
    getGameDeployedActorStaminaBarVariant(staminaVisualState);
  const isStaminaFull = isActorStaminaFull(actor.stamina, staminaLimit);
  const powerBreakdown = getActorMiningPowerBreakdown(
    actor as unknown as Record<string, unknown>,
  );
  const storyRateValue = powerBreakdown.actorPower;
  const actorDetailId = resolveActorDetailRouteId({
    actorNftId: actor.actorNftId,
    actorCollectionId: actor.actorCollectionId,
  });

  const handleReplenishClick = () => {
    if (isStaminaFull) {
      return;
    }

    onReplenishClick?.(actor);
  };

  const handleRestClick = () => {
    onRestClick?.(actor);
  };

  const handleOpenPowerDialog = () => {
    setIsPowerDialogOpen(true);
  };

  const handlePrev = () => {
    onPrev?.();
  };

  const handleNext = () => {
    onNext?.();
  };

  const powerDialog = (
    <GameActorPowerDialog
      open={isPowerDialogOpen}
      onOpenChange={setIsPowerDialogOpen}
      breakdown={powerBreakdown}
      level={actor.level}
      actorName={actorName}
    />
  );

  if (variant === 'mobileFocus') {
    // Figma 358:73900 — 单卡：chevron 夹头像 + 信息区 + 卡内槽位点
    return (
      <article
        data-slot="game-deployed-actor-card"
        className={cn(
          GAME_DEPLOYED_ACTOR_CARD_CLASS,
          'flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl bg-game-deployed-actor-card-surface',
          'border border-game-deployed-card-warning-border',
          'shadow-[1px_5px_20px_rgba(0,0,0,0.13)]',
        )}
      >
        {/* 头像区固定高度，保证与空槽切换时左右角标不抖动 */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-center gap-3 px-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('向左查看派遣角色')}
              disabled={!canGoPrev}
              onClick={handlePrev}
              className={MOBILE_FOCUS_CHEVRON_CLASS}
            >
              <IconChevronLeft className="size-6" />
            </Button>

            <div className="min-w-0 flex-1">
              {actorDetailId ? (
                <ActorDetailRouteLink
                  actorId={actorDetailId}
                  aria-label={actorName ?? avatarAlt}
                  className={cn(
                    'relative block w-full overflow-hidden rounded-xl bg-muted',
                    PLAY_CARD_COVER_ASPECT_CLASS,
                    'cursor-pointer no-underline',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  {avatarUrl ? (
                    <img
                      alt={avatarAlt}
                      src={avatarUrl}
                      className="absolute inset-0 size-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <GameActorLevelBadge
                    level={actor.level}
                    className="absolute top-0 left-0"
                  />
                </ActorDetailRouteLink>
              ) : (
                <div
                  className={cn(
                    'relative w-full overflow-hidden rounded-xl bg-muted',
                    PLAY_CARD_COVER_ASPECT_CLASS,
                  )}
                >
                  {avatarUrl ? (
                    <img
                      alt={avatarAlt}
                      src={avatarUrl}
                      className="absolute inset-0 size-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <GameActorLevelBadge
                    level={actor.level}
                    className="absolute top-0 left-0"
                  />
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('向右查看派遣角色')}
              disabled={!canGoNext}
              onClick={handleNext}
              className={MOBILE_FOCUS_CHEVRON_CLASS}
            >
              <IconChevronLeft className="size-6 rotate-180" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center gap-3 p-3">
            <div className="flex w-full flex-col gap-2">
              <header className="flex min-w-0 items-baseline gap-1">
                {actorDetailId ? (
                  <ActorDetailRouteLink
                    actorId={actorDetailId}
                    className={cn(
                      'flex min-w-0 max-w-full items-baseline gap-1',
                      'cursor-pointer',
                      'rounded-sm transition-opacity hover:opacity-80',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
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
                  </ActorDetailRouteLink>
                ) : (
                  <>
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
                  </>
                )}
              </header>

              <div className="flex flex-col gap-0.5">
                <GameActorStaminaBar
                  stamina={actor.stamina}
                  staminaLimit={staminaLimit}
                  variant={staminaBarVariant}
                />

                <GameActorStoryRateButton
                  rateValue={storyRateValue}
                  ariaLabel={t('角色片酬')}
                  onClick={handleOpenPowerDialog}
                />
              </div>

              <div className="flex gap-2">
                <GameRefillButton
                  actorNftId={actor.actorNftId}
                  isStaminaFull={isStaminaFull}
                  onClick={handleReplenishClick}
                />
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t('休息')}
                  className={cn(
                    'h-9 flex-1 rounded-xl border-[1.5px] border-game-header-action-border bg-transparent px-3',
                    'text-sm leading-5 font-medium text-game-header-title',
                    'hover:bg-game-header-action-hover hover:text-game-header-title',
                  )}
                  onClick={handleRestClick}
                >
                  {t('休息')}
                </Button>
              </div>
            </div>

            <div className="mt-auto flex w-full flex-col items-center">
              {slotDots}
            </div>
          </div>
        </div>

        {powerDialog}
      </article>
    );
  }

  return (
    <article
      data-slot="game-deployed-actor-card"
      className={cn(
        GAME_DEPLOYED_ACTOR_SLOT_SIZE_CLASS,
        GAME_DEPLOYED_ACTOR_CARD_CLASS,
        'flex flex-col overflow-hidden rounded-xl bg-game-deployed-actor-card-surface',
        'shadow-[0_4px_20px_rgba(0,0,0,0.05)]',
        staminaVisualState === GameDeployedActorStaminaVisualState.Low &&
          'border-[1.5px] border-game-deployed-card-warning-border',
        staminaVisualState === GameDeployedActorStaminaVisualState.Exhausted &&
          'border-[1.5px] border-game-deployed-card-exhausted-border',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {actorDetailId ? (
          <ActorDetailRouteLink
            actorId={actorDetailId}
            aria-label={actorName ?? avatarAlt}
            className={cn(
              'relative w-full shrink-0 overflow-hidden bg-muted',
              GAME_DEPLOYED_ACTOR_COVER_ASPECT_CLASS,
              'cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
              surfaceClassName={
                staminaVisualState === GameDeployedActorStaminaVisualState.Low
                  ? 'bg-game-deployed-card-level-low-surface'
                  : undefined
              }
            />
          </ActorDetailRouteLink>
        ) : (
          <div
            className={cn(
              'relative w-full shrink-0 overflow-hidden bg-muted',
              GAME_DEPLOYED_ACTOR_COVER_ASPECT_CLASS,
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
              surfaceClassName={
                staminaVisualState === GameDeployedActorStaminaVisualState.Low
                  ? 'bg-game-deployed-card-level-low-surface'
                  : undefined
              }
            />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <header className="flex min-w-0 items-baseline gap-1">
            {actorDetailId ? (
              <ActorDetailRouteLink
                actorId={actorDetailId}
                className={cn(
                  'flex min-w-0 max-w-full items-baseline gap-1',
                  'cursor-pointer',
                  'rounded-sm transition-opacity hover:opacity-80',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
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
              </ActorDetailRouteLink>
            ) : (
              <>
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
              </>
            )}
          </header>

          <div className="flex flex-col gap-0.5">
            <GameActorStaminaBar
              stamina={actor.stamina}
              staminaLimit={staminaLimit}
              variant={staminaBarVariant}
            />

            <GameActorStoryRateButton
              rateValue={storyRateValue}
              ariaLabel={t('角色片酬')}
              onClick={handleOpenPowerDialog}
            />
          </div>

          <div className="mt-auto flex gap-3">
            <GameRefillButton
              actorNftId={actor.actorNftId}
              isStaminaFull={isStaminaFull}
              iconOnlyBelowLg
              onClick={handleReplenishClick}
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={t('休息')}
              className={cn(
                // 与「补充」同款描边按钮
                'h-9 flex-1 rounded-xl border-[1.5px] border-game-header-action-border bg-transparent px-3',
                'text-sm leading-5 font-medium text-game-header-title',
                'hover:bg-game-header-action-hover hover:text-game-header-title',
                // 稿面以 1024 为分界：窄屏 coffee icon
                'max-lg:px-2',
              )}
              onClick={handleRestClick}
            >
              <IconCoffee className="size-5 lg:hidden" />
              <span className="max-lg:hidden">{t('休息')}</span>
            </Button>
          </div>
        </div>
      </div>
      {powerDialog}
    </article>
  );
}
