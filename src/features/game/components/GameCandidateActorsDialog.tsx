import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import {
  getListRestActorsQueryKey,
  listRestActors,
  useListDeployedActors,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { PageActorDTO } from '@/api/__generated__/mining/model/pageActorDTO';
import IconPlus from '@/assets/svg/IconPlus';
import IconX from '@/assets/svg/IconX';
import { ActorDetailRouteLink } from '@/components/common/ActorDetailRouteLink';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE_STRING } from '@/constants';
import { getGameActorRowKey } from '@/features/game/constants/gameActorConfig';
import { resolveActorDetailRouteId } from '@/features/game/constants/gameActorNft';
import {
  getGameDeployedActorStaminaBarVariant,
  resolveGameDeployedActorStaminaVisualState,
} from '@/features/game/constants/gameDeployedActorStaminaVisual';
import { isActorStaminaFull } from '@/features/game/constants/gameStamina';
import { getGameActorStoryRateValue } from '@/features/game/formatGameActorStoryRate';
import { guardGameDeploySlot } from '@/features/game/gameDeployLimit';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { getActorMiningPowerBreakdown } from '@/features/mining/miningPower';
import { useConfigStore } from '@/stores/config';
import { cn, formatNumber } from '@/utils';
import { GameActorLevelBadge } from './GameActorLevelBadge';
import { GameActorPowerDialog } from './GameActorPowerDialog';
import { GameActorStaminaBar } from './GameActorStaminaBar';
import { GameActorStoryRateButton } from './GameActorStoryRateButton';
import { GameDeployActorConfirmDialog } from './GameDeployActorConfirmDialog';
import { GameRefillStaminaDialog } from './GameRefillStaminaDialog';

function getRestActorsNextPageParam(
  lastPage: Awaited<ReturnType<typeof listRestActors>>,
): string | undefined {
  const pageData = unwrapOrvalPayload<PageActorDTO>(lastPage);
  if (pageData?.pageNumber === undefined || pageData.totalPage === undefined) {
    return undefined;
  }

  if (pageData.pageNumber >= pageData.totalPage) {
    return undefined;
  }

  return String(pageData.pageNumber + 1);
}

type GameCandidateActorsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Figma 198:44088 / 160:142838「补充」：36 高、12 圆角、1.5 描边、14 Medium */
const CANDIDATE_REPLENISH_BUTTON_CLASS = cn(
  'h-9 flex-1 rounded-xl border-[1.5px] border-game-header-action-border bg-transparent px-3',
  'text-sm leading-5 font-medium text-game-header-title',
  'hover:bg-game-header-action-hover hover:text-game-header-title',
  'disabled:border-game-header-action-border disabled:bg-transparent',
  'disabled:text-button-disabled-foreground disabled:opacity-100',
);

/** Figma「演出」：Page&Sheet/dark + white-to-dark（浅深反相） */
const CANDIDATE_PERFORM_BUTTON_CLASS = cn(
  'h-9 flex-1 rounded-xl px-3',
  'bg-foreground text-background',
  'text-sm leading-5 font-medium',
  'hover:bg-foreground/90 hover:text-background',
);

function formatActorCode(actor: ActorDTO): string | undefined {
  if (actor.actorTokenId === undefined) {
    return undefined;
  }

  return `#${formatNumber(actor.actorTokenId, 0)}`;
}

function CandidateActorCard({
  actor,
  staminaLimit,
  onPerformClick,
  onReplenishClick,
}: {
  actor: ActorDTO;
  staminaLimit: number | undefined;
  onPerformClick: (actor: ActorDTO) => void;
  onReplenishClick: (actor: ActorDTO) => void;
}) {
  const { t } = useTranslation();
  const [isPowerDialogOpen, setIsPowerDialogOpen] = useState(false);
  const actorName = actor.actorName?.trim();
  const actorCode = formatActorCode(actor);
  const avatarUrl = actor.avatarUrl?.trim();
  const avatarAlt = actorName
    ? t('{{name}} 的角色头像', { name: actorName })
    : t('角色头像');
  const staminaVisualState = resolveGameDeployedActorStaminaVisualState(
    actor.stamina,
    staminaLimit,
  );
  const staminaBarVariant =
    getGameDeployedActorStaminaBarVariant(staminaVisualState);
  const isStaminaFull = isActorStaminaFull(actor.stamina, staminaLimit);
  const storyRate = getGameActorStoryRateValue(actor);
  const powerBreakdown = getActorMiningPowerBreakdown(
    actor as unknown as Record<string, unknown>,
  );
  const actorDetailId = resolveActorDetailRouteId({
    actorNftId: actor.actorNftId,
    actorCollectionId: actor.actorCollectionId,
  });

  const handlePerformClick = () => {
    onPerformClick(actor);
  };

  const handleReplenishClick = () => {
    if (isStaminaFull) {
      return;
    }

    onReplenishClick(actor);
  };

  const handleOpenPowerDialog = () => {
    setIsPowerDialogOpen(true);
  };

  return (
    <article
      className={cn(
        // Figma white-to-secondary + Black Alpha/1 阴影，无描边
        'flex flex-col overflow-hidden rounded-xl',
        'bg-game-deployed-actor-card-surface',
        'shadow-[0_4px_20px_rgba(0,0,0,0.05)]',
      )}
    >
      {actorDetailId ? (
        <ActorDetailRouteLink
          actorId={actorDetailId}
          aria-label={actorName ?? avatarAlt}
          className={cn(
            'relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted',
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
            className="absolute top-0 left-0 rounded-none rounded-tl-xl rounded-br-xl px-2 py-1"
          />
        </ActorDetailRouteLink>
      ) : (
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted">
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
      )}

      {/* Figma Container：p-12 / gap-8 */}
      <div className="flex flex-col gap-2 p-3">
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
                <h3 className="truncate text-base leading-6 font-bold text-game-header-title">
                  {actorName}
                </h3>
              ) : null}
              {actorCode ? (
                <span className="shrink-0 text-xs leading-4 font-normal tracking-[0.04px] text-game-header-subtitle">
                  {actorCode}
                </span>
              ) : null}
            </ActorDetailRouteLink>
          ) : (
            <>
              {actorName ? (
                <h3 className="truncate text-base leading-6 font-bold text-game-header-title">
                  {actorName}
                </h3>
              ) : null}
              {actorCode ? (
                <span className="shrink-0 text-xs leading-4 font-normal tracking-[0.04px] text-game-header-subtitle">
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

          {/* 数值 14 Medium primary + STORY/h 12 Regular secondary 点状下划线 */}
          <GameActorStoryRateButton
            variant="panel"
            rateValue={storyRate}
            ariaLabel={t('角色片酬')}
            onClick={handleOpenPowerDialog}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isStaminaFull}
            className={CANDIDATE_REPLENISH_BUTTON_CLASS}
            onClick={handleReplenishClick}
          >
            {isStaminaFull ? t('已满') : t('补充')}
          </Button>
          <Button
            type="button"
            className={CANDIDATE_PERFORM_BUTTON_CLASS}
            onClick={handlePerformClick}
          >
            {t('演出')}
          </Button>
        </div>
      </div>

      <GameActorPowerDialog
        open={isPowerDialogOpen}
        onOpenChange={setIsPowerDialogOpen}
        breakdown={powerBreakdown}
        level={actor.level}
        actorName={actorName}
      />
    </article>
  );
}

export function GameCandidateActorsDialog({
  open,
  onOpenChange,
}: GameCandidateActorsDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initConfig = useConfigStore((state) => state.initConfig);
  const staminaLimit = initConfig?.actorNft?.staminaLimit;
  const [confirmActor, setConfirmActor] = useState<ActorDTO | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [replenishActor, setReplenishActor] = useState<ActorDTO | null>(null);
  const [isReplenishOpen, setIsReplenishOpen] = useState(false);
  const isReplenishOpenRef = useRef(false);
  const replenishDismissGuardTimeoutRef = useRef<number | undefined>(undefined);

  // 显式绑定弹窗列表滚动区，避免 AppLoadingContainer 内层 overflow 抢走 root
  const [scrollRoot, setScrollRoot] = useState<Element | null>(null);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const loadArmedRef = useRef(true);
  const { ref: sentinelRef, inView } = useInView({
    root: scrollRoot,
    threshold: 0,
  });

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchRestActors,
  } = useInfiniteQuery({
    queryKey: [
      ...getListRestActorsQueryKey({ pageSize: DEFAULT_PAGE_SIZE_STRING }),
      'candidate-dialog',
    ] as const,
    queryFn: ({ pageParam }) =>
      listRestActors({
        pageNum: pageParam as string,
        pageSize: DEFAULT_PAGE_SIZE_STRING,
      }),
    initialPageParam: '1',
    getNextPageParam: getRestActorsNextPageParam,
    enabled: open,
    retry: false,
  });

  const { data: deployedResponse } = useListDeployedActors({
    query: {
      enabled: open,
      retry: false,
    },
  });

  useEffect(() => {
    if (open) {
      return;
    }

    setHasUserScrolled(false);
    loadArmedRef.current = true;
  }, [open]);

  useEffect(() => {
    if (!open || !scrollRoot) {
      return;
    }

    const handleScroll = () => {
      setHasUserScrolled(true);
    };

    scrollRoot.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollRoot.removeEventListener('scroll', handleScroll);
    };
  }, [open, scrollRoot]);

  useEffect(() => {
    if (!inView) {
      loadArmedRef.current = true;
      return;
    }

    // 须用户滚动过 + 哨兵进入 + 上膛，才拉一页；避免打开即连拉 / 同屏连拉两页
    if (
      !open ||
      !hasUserScrolled ||
      !hasNextPage ||
      isFetchingNextPage ||
      !loadArmedRef.current
    ) {
      return;
    }

    loadArmedRef.current = false;
    void fetchNextPage();
  }, [
    open,
    inView,
    hasUserScrolled,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const restActors = useMemo(() => {
    const pages = data?.pages ?? [];
    return pages.flatMap((page) => {
      const pageData = unwrapOrvalPayload<PageActorDTO>(page);
      return pageData?.records ?? [];
    });
  }, [data?.pages]);

  const deployedCount =
    unwrapOrvalPayload<ActorDTO[]>(deployedResponse)?.length ?? 0;

  const handleScrollAreaRef = (node: HTMLDivElement | null) => {
    setScrollRoot(node);
  };

  // 空位已满时 toast 阻断，避免打开安排演出确认弹窗
  const handleOpenPerformConfirm = (actor: ActorDTO) => {
    if (guardGameDeploySlot(deployedCount, t)) {
      return;
    }

    setConfirmActor(actor);
    setIsConfirmOpen(true);
  };

  // 空态加号 → 角色 IP 广场
  const handleGoToActorPlaza = () => {
    onOpenChange(false);
    void navigate({ to: '/actor' });
  };

  const handleConfirmOpenChange = (nextOpen: boolean) => {
    setIsConfirmOpen(nextOpen);
    if (!nextOpen) {
      setConfirmActor(null);
    }
  };

  const clearReplenishDismissGuardTimeout = () => {
    if (replenishDismissGuardTimeoutRef.current === undefined) {
      return;
    }

    window.clearTimeout(replenishDismissGuardTimeoutRef.current);
    replenishDismissGuardTimeoutRef.current = undefined;
  };

  // 补充弹窗嵌在候选列表 Dialog 内，避免平级弹窗互相 dismiss
  const handleOpenReplenish = (actor: ActorDTO) => {
    clearReplenishDismissGuardTimeout();
    isReplenishOpenRef.current = true;
    setReplenishActor(actor);
    setIsReplenishOpen(true);
  };

  // 只关补充弹窗；关闭瞬间的 outside-press 可能落到候选列表遮罩上
  const handleReplenishOpenChange = (nextOpen: boolean) => {
    setIsReplenishOpen(nextOpen);
    if (!nextOpen) {
      setReplenishActor(null);
      clearReplenishDismissGuardTimeout();
      replenishDismissGuardTimeoutRef.current = window.setTimeout(() => {
        isReplenishOpenRef.current = false;
        replenishDismissGuardTimeoutRef.current = undefined;
      }, 300);
      return;
    }

    clearReplenishDismissGuardTimeout();
    isReplenishOpenRef.current = true;
  };

  // 补充成功后刷新候场候选列表（含已加载分页）
  const handleRefillSuccess = () => {
    void refetchRestActors();
  };

  // 补充弹窗打开或刚关闭时，忽略候选列表被连带关掉
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isReplenishOpenRef.current) {
      return;
    }

    onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          bare
          bodyScroll={false}
          className={cn(
            'flex w-full flex-col overflow-hidden',
            'gap-0 p-0',
            'md:max-w-[1080px]',
          )}
        >
          {/* Figma 198:44088 / 160:142838 — p-32 */}
          <div
            className={cn(
              'flex min-h-0 w-full flex-1 flex-col',
              'gap-6 p-6 md:p-8',
              'max-h-[var(--app-dialog-max-height,90dvh)]',
            )}
          >
            <header
              className={cn(
                'flex w-full shrink-0 items-center justify-between',
                'gap-4',
              )}
            >
              <DialogTitle
                className={cn(
                  'm-0 flex min-w-0 flex-1 items-baseline gap-0 text-left',
                  'text-lg leading-[26px] font-bold tracking-[-0.04px]',
                  'text-game-header-title',
                )}
              >
                {t('候场角色')}
                <span className="text-sm leading-5 font-normal text-muted-foreground">
                  {`（${formatNumber(restActors.length, 0)}）`}
                </span>
              </DialogTitle>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full text-game-header-title"
                  >
                    <IconX className="size-6 shrink-0" />
                  </Button>
                }
              />
            </header>

            <div
              ref={handleScrollAreaRef}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <AppLoadingContainer
                data={restActors}
                isLoading={isPending}
                isError={isError}
                minHeight={280}
                scrollable={false}
                emptyDescription={t('暂无角色')}
                emptyAction={
                  <Button
                    type="button"
                    aria-label={t('去获取角色')}
                    className={cn(
                      'h-auto shrink-0 rounded-xl px-6 py-2',
                      'bg-foreground text-background',
                      'hover:bg-foreground/90 hover:text-background',
                    )}
                    onClick={handleGoToActorPlaza}
                  >
                    <IconPlus className="size-5" />
                  </Button>
                }
              >
                <ul
                  className={cn(
                    'grid list-none gap-3 p-0',
                    'grid-cols-2 md:grid-cols-4',
                  )}
                >
                  {restActors.map((actor) => (
                    <li key={getGameActorRowKey(actor)}>
                      <CandidateActorCard
                        actor={actor}
                        staminaLimit={staminaLimit}
                        onPerformClick={handleOpenPerformConfirm}
                        onReplenishClick={handleOpenReplenish}
                      />
                    </li>
                  ))}
                </ul>
                <div
                  ref={sentinelRef}
                  className="flex min-h-8 items-center justify-center py-3"
                >
                  {isFetchingNextPage ? <Spinner className="size-5" /> : null}
                </div>
              </AppLoadingContainer>
            </div>
          </div>
        </DialogContent>
        <GameRefillStaminaDialog
          open={open && isReplenishOpen}
          onOpenChange={handleReplenishOpenChange}
          actor={replenishActor}
          onSuccess={handleRefillSuccess}
        />
      </Dialog>

      <GameDeployActorConfirmDialog
        open={isConfirmOpen}
        onOpenChange={handleConfirmOpenChange}
        actor={confirmActor}
        onDeploySuccess={() => onOpenChange(false)}
      />
    </>
  );
}
