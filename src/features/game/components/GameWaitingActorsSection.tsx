import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useListDeployedActors,
  useListRestActors,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { PageActorDTO } from '@/api/__generated__/mining/model/pageActorDTO';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import IconNoData from '@/assets/svg/IconNoData';
import IconPlus from '@/assets/svg/IconPlus';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFAULT_PAGE_SIZE_STRING } from '@/constants';
import { getGameActorRowKey } from '@/features/game/constants/gameActorConfig';
import {
  GameDeployedActorStaminaVisualState,
  resolveGameDeployedActorStaminaVisualState,
} from '@/features/game/constants/gameDeployedActorStaminaVisual';
import { GAME_PANEL_VERTICAL_SCROLL_AREA_CLASS } from '@/features/game/constants/gameScrollAreaStyles';
import {
  formatGameActorHourlyPaymentValue,
  getGameActorStoryRateValue,
} from '@/features/game/formatGameActorStoryRate';
import { guardGameDeploySlot } from '@/features/game/gameDeployLimit';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber } from '@/utils';
import { GameActorLevelBadge } from './GameActorLevelBadge';
import { GameDeployActorConfirmDialog } from './GameDeployActorConfirmDialog';

/** 桌面候场列表：与待办共用 Figma input-disable 细滚动条（竖向） */
const WAITING_SCROLL_AREA_CLASS = cn(
  'min-h-0 w-full flex-1',
  GAME_PANEL_VERTICAL_SCROLL_AREA_CLASS,
);

/** Figma 796:141007 / 796:144162 — 候场空态：插画 + 文案 + 加号进 /actor */
function GameWaitingActorsEmptyState({
  onAddClick,
}: {
  onAddClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col items-center justify-center',
        'gap-3',
      )}
    >
      <div className="flex w-20 flex-col items-center">
        <IconNoData className="size-20 shrink-0" />
        <p className="w-full text-center text-xs leading-[18px] text-muted-foreground">
          {t('暂无角色')}
        </p>
      </div>

      <Button
        type="button"
        aria-label={t('去获取角色')}
        className={cn(
          'h-auto shrink-0 rounded-xl px-6 py-2',
          'bg-foreground text-background',
          'hover:bg-foreground/90 hover:text-background',
        )}
        onClick={onAddClick}
      >
        <IconPlus className="size-5" />
      </Button>
    </div>
  );
}

type GameWaitingActorsSectionProps = {
  onOpenCandidateDialog: () => void;
  /** mobile：在演区「一键演出」下方文档流；desktop：右侧绝对定位侧栏 */
  variant: 'mobile' | 'desktop';
};

function WaitingActorCard({
  actor,
  staminaLimit,
  onClick,
  layout = 'sidebar',
}: {
  actor: ActorDTO;
  staminaLimit: number | undefined;
  onClick: (actor: ActorDTO) => void;
  /** sidebar：桌面侧栏；strip：Figma 358 移动端 56px 缩略条 */
  layout?: 'sidebar' | 'strip';
}) {
  const { t } = useTranslation();
  const actorName = actor.actorName?.trim();
  const actorCode =
    actor.actorTokenId !== undefined
      ? `#${formatNumber(actor.actorTokenId, 0)}`
      : undefined;
  const avatarUrl = actor.avatarUrl?.trim();
  const avatarAlt = actorName
    ? t('{{name}} 的角色头像', { name: actorName })
    : t('角色头像');
  const storyRate = getGameActorStoryRateValue(actor);
  const staminaVisualState = resolveGameDeployedActorStaminaVisualState(
    actor.stamina,
    staminaLimit,
  );
  const staminaProgress =
    actor.stamina !== undefined &&
    staminaLimit !== undefined &&
    staminaLimit > 0
      ? Math.min(100, Math.max(0, (actor.stamina / staminaLimit) * 100))
      : 0;

  const handleClick = () => {
    onClick(actor);
  };

  if (layout === 'strip') {
    // Figma 358:73902 — 56 头像 + /h + 4px 体力条
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
        className={cn(
          'flex h-auto w-[56px] shrink-0 flex-col items-center',
          'gap-1.5 p-0',
          'rounded-xl',
          'hover:bg-transparent',
        )}
      >
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
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
            className="absolute top-0 left-0 rounded-none rounded-tl-xl rounded-br-xl px-2 py-1"
          />
        </div>

        <div className="flex w-full flex-col items-center gap-1">
          <p className="text-center text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            <span>{formatGameActorHourlyPaymentValue(storyRate)}</span>
            <span className="ml-0.5">/h</span>
          </p>

          <Progress
            value={staminaProgress}
            className="w-full"
            trackClassName={cn(
              'h-1 rounded-xl',
              staminaVisualState ===
                GameDeployedActorStaminaVisualState.Exhausted
                ? 'bg-muted'
                : 'bg-secondary',
            )}
            indicatorClassName={cn(
              staminaVisualState === GameDeployedActorStaminaVisualState.Low
                ? 'bg-game-deployed-card-stamina-warning'
                : staminaVisualState ===
                    GameDeployedActorStaminaVisualState.Exhausted
                  ? 'bg-transparent'
                  : 'bg-game-panel-dot-success',
            )}
          />
        </div>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleClick}
      className={cn(
        // Layout & Positioning
        'flex h-auto w-full shrink-0 flex-col items-center',
        // Spacing
        'gap-1.5 p-2',
        // Visual
        'rounded-xl',
        // Interactions & States
        'hover:bg-muted/60',
      )}
    >
      {/* 稿面缩略图固定 80×60，避免 aspect-square 在窄栏被压扁/裁切 */}
      <div className="relative h-[60px] w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
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
          className="absolute top-0 left-0 rounded-none rounded-tl-lg rounded-br-lg px-2 py-1"
        />
      </div>

      <div className="flex w-full flex-col items-center gap-0.5">
        <p className="text-center text-sm leading-5 font-bold text-foreground">
          <span>{formatGameActorHourlyPaymentValue(storyRate)}</span>
          <span className="ml-0.5 text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground">
            /h
          </span>
        </p>

        <Progress
          value={staminaProgress}
          className="w-20"
          trackClassName={cn(
            'h-1 rounded-xl',
            staminaVisualState === GameDeployedActorStaminaVisualState.Exhausted
              ? 'bg-muted'
              : 'bg-secondary',
          )}
          indicatorClassName={cn(
            staminaVisualState === GameDeployedActorStaminaVisualState.Low
              ? 'bg-game-deployed-card-stamina-warning'
              : staminaVisualState ===
                  GameDeployedActorStaminaVisualState.Exhausted
                ? 'bg-transparent'
                : 'bg-game-panel-dot-success',
          )}
        />

        <div className="flex max-w-full items-center justify-center gap-1">
          {actorName ? (
            <span className="truncate text-sm leading-5 font-bold text-foreground">
              {actorName}
            </span>
          ) : null}
          {actorCode ? (
            <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {actorCode}
            </span>
          ) : null}
        </div>
      </div>
    </Button>
  );
}

export function GameWaitingActorsSection({
  onOpenCandidateDialog,
  variant,
}: GameWaitingActorsSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const staminaLimit = useConfigStore(
    (state) => state.initConfig?.actorNft?.staminaLimit,
  );
  const [confirmActor, setConfirmActor] = useState<ActorDTO | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: restActorsResponse, isLoading } = useListRestActors(
    { pageNum: '1', pageSize: DEFAULT_PAGE_SIZE_STRING },
    {
      query: {
        enabled: isLogin,
        retry: false,
      },
    },
  );

  const { data: deployedResponse } = useListDeployedActors({
    query: {
      enabled: isLogin,
      retry: false,
    },
  });

  const page = useMemo(
    () => unwrapOrvalPayload<PageActorDTO>(restActorsResponse),
    [restActorsResponse],
  );

  const restActors = page?.records ?? [];
  const totalCount = page?.totalRow ?? restActors.length;
  const isEmpty = !isLoading && restActors.length === 0;
  const deployedCount =
    unwrapOrvalPayload<ActorDTO[]>(deployedResponse)?.length ?? 0;

  const handleOpenCandidateDialog = () => {
    onOpenCandidateDialog();
  };

  // 空态加号 → 角色 IP 广场
  const handleGoToActorPlaza = () => {
    void navigate({ to: '/actor' });
  };

  // 空位已满时 toast 阻断，避免打开安排演出确认弹窗
  const handleOpenPerformConfirm = (actor: ActorDTO) => {
    if (guardGameDeploySlot(deployedCount, t)) {
      return;
    }

    setConfirmActor(actor);
    setIsConfirmOpen(true);
  };

  const handleConfirmOpenChange = (nextOpen: boolean) => {
    setIsConfirmOpen(nextOpen);

    if (!nextOpen) {
      setConfirmActor(null);
    }
  };

  if (variant === 'mobile') {
    return (
      <>
        {/* Figma 358:73902 — 移动端横向候场条（文档流，跟在「一键演出」下方） */}
        <aside
          className={cn(
            'relative flex w-full shrink-0 flex-col overflow-hidden',
            'rounded-2xl border border-border bg-card p-4',
          )}
        >
          <div className="relative w-full">
            {isEmpty ? (
              <GameWaitingActorsEmptyState onAddClick={handleGoToActorPlaza} />
            ) : (
              <AppLoadingContainer
                data={restActors}
                isLoading={isLoading}
                minHeight={100}
                scrollable={false}
                emptyDescription={t('暂无角色')}
              >
                <ScrollArea
                  orientation="horizontal"
                  hideScrollbar
                  className="w-full"
                >
                  <ul className="flex w-max list-none items-start gap-4 p-0">
                    {restActors.map((actor: ActorDTO) => (
                      <li key={getGameActorRowKey(actor)} className="shrink-0">
                        <WaitingActorCard
                          actor={actor}
                          staminaLimit={staminaLimit}
                          layout="strip"
                          onClick={handleOpenPerformConfirm}
                        />
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AppLoadingContainer>
            )}

            {/* Figma 358:67143 — 右侧半透明遮罩 + chevron，始终可进「查看全部」 */}
            {!isEmpty ? (
              <Button
                type="button"
                variant="ghost"
                aria-label={t('查看全部')}
                onClick={handleOpenCandidateDialog}
                className={cn(
                  'absolute top-0 right-0 z-10',
                  'h-[86px] w-auto rounded-none px-1.5 py-2.5',
                  'border-0 bg-white/60 text-foreground shadow-none',
                  'dark:bg-black/60',
                  'hover:bg-white/70 hover:text-foreground dark:hover:bg-black/70',
                )}
              >
                <IconChevronLeft className="size-6 rotate-180" />
              </Button>
            ) : null}
          </div>
        </aside>

        <GameDeployActorConfirmDialog
          open={isConfirmOpen}
          onOpenChange={handleConfirmOpenChange}
          actor={confirmActor}
        />
      </>
    );
  }

  return (
    <>
      {/*
        桌面侧栏：相对 GameView 外层 stretch 容器 absolute 铺满。
        不参与撑高 flex 行，故底边始终与左侧（在演+待办）对齐；loading/空态同高。
      */}
      <aside
        className={cn(
          'flex flex-col overflow-hidden',
          'absolute inset-0',
          'gap-4 p-5',
          'rounded-2xl bg-card',
        )}
      >
        <header className="flex shrink-0 items-baseline gap-0">
          <h2 className="text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('候场')}
          </h2>
          <span className="text-sm leading-5 text-muted-foreground">
            {`（${formatNumber(totalCount, 0)}）`}
          </span>
        </header>

        {isEmpty ? (
          <GameWaitingActorsEmptyState onAddClick={handleGoToActorPlaza} />
        ) : (
          <ScrollArea
            orientation="vertical"
            className={WAITING_SCROLL_AREA_CLASS}
          >
            <AppLoadingContainer
              data={restActors}
              isLoading={isLoading}
              minHeight="100%"
              scrollable={false}
              emptyDescription={t('暂无角色')}
            >
              <ul className="flex list-none flex-col items-center gap-3 p-0">
                {restActors.map((actor: ActorDTO) => (
                  <li
                    key={getGameActorRowKey(actor)}
                    className="w-full shrink-0"
                  >
                    <WaitingActorCard
                      actor={actor}
                      staminaLimit={staminaLimit}
                      onClick={handleOpenPerformConfirm}
                    />
                  </li>
                ))}
              </ul>
            </AppLoadingContainer>
          </ScrollArea>
        )}

        {totalCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            className={cn(
              'mt-auto h-11 w-full shrink-0 rounded-xl border-[1.5px]',
              'text-sm leading-5 font-bold',
            )}
            onClick={handleOpenCandidateDialog}
          >
            {t('查看全部')}
          </Button>
        ) : null}
      </aside>

      <GameDeployActorConfirmDialog
        open={isConfirmOpen}
        onOpenChange={handleConfirmOpenChange}
        actor={confirmActor}
      />
    </>
  );
}
