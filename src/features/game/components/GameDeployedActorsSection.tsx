import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useListDeployedActors,
  useListRestActors,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { PageActorDTO } from '@/api/__generated__/mining/model/pageActorDTO';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import IconDeploySlotEmptyAvatar from '@/assets/svg/IconDeploySlotEmptyAvatar';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFAULT_PAGE_SIZE_STRING } from '@/constants';
import {
  getGameActorStaminaLimit,
  getGameActorSupplyFee,
} from '@/features/game/constants/gameActorConfig';
import {
  GAME_DEPLOY_CAROUSEL_GAP_PX,
  GAME_DEPLOY_SLOT_COUNT,
  GAME_DEPLOYED_ACTOR_CARD_CLASS,
  GAME_DEPLOYED_ACTOR_CARD_HEIGHT_PX,
  GAME_DEPLOYED_ACTOR_CARD_MIN_WIDTH_PX,
  GAME_DEPLOYED_ACTOR_LIST_STYLE,
  getGameDeploySlotEndAlignScrollLeft,
} from '@/features/game/constants/gameConstants';
import { GAME_DEPLOYED_EMPTY_SLOT_CTA_CLASS } from '@/features/game/constants/gameDeployedEmptySlotStyles';
import { isActorStaminaFull } from '@/features/game/constants/gameStamina';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { PLAY_CARD_COVER_ASPECT_CLASS } from '@/features/play/playFormat';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn, plus, toNumber } from '@/utils';
import { GameDeployAllActorsConfirmDialog } from './GameDeployAllActorsConfirmDialog';
import { GameDeployCarouselEdgeNav } from './GameDeployCarouselEdgeNav';
import { GameDeployedActorCard } from './GameDeployedActorCard';
import { GameDeployedActorCardSkeleton } from './GameDeployedActorCardSkeleton';
import { GameDeployedActorEmptySlot } from './GameDeployedActorEmptySlot';
import { GameDeploySlotDots } from './GameDeploySlotDots';
import { GameRefillAllActorsConfirmDialog } from './GameRefillAllActorsConfirmDialog';
import { GameRestActorDialog } from './GameRestActorDialog';
import { GameRestAllActorsConfirmDialog } from './GameRestAllActorsConfirmDialog';
import { GameWaitingActorsSection } from './GameWaitingActorsSection';

type DeploySlot = ActorDTO | null;

type GameDeployedActorsSectionProps = {
  onOpenCandidateDialog: () => void;
  onOpenReplenishDialog: (actor: ActorDTO) => void;
};

const SCROLL_EDGE_EPSILON_PX = 2;

/** 桌面加载骨架槽位稳定 key（避免用 map index 作 key） */
const DEPLOY_DESKTOP_SKELETON_KEYS = [
  'deploy-skeleton-1',
  'deploy-skeleton-2',
  'deploy-skeleton-3',
  'deploy-skeleton-4',
  'deploy-skeleton-5',
] as const;

function getScrollAreaViewport(
  root: HTMLDivElement | null,
): HTMLElement | null {
  if (!root) {
    return null;
  }

  return root.querySelector('[data-slot="scroll-area-viewport"]');
}

const BATCH_OUTLINE_BUTTON_CLASS = cn(
  'h-11 w-auto shrink-0 rounded-xl border border-border bg-transparent px-4',
  'text-sm leading-5 font-bold text-foreground',
  'hover:bg-muted/60',
);

const MOBILE_FOCUS_CHEVRON_CLASS = cn(
  'size-11 shrink-0 rounded-full border border-border p-2.5',
  'bg-transparent text-foreground',
  'hover:bg-muted/60 hover:text-foreground',
  'disabled:opacity-40',
);

const ONE_CLICK_DEPLOY_BUTTON_CLASS = cn(
  'h-11 rounded-xl px-4',
  'bg-foreground text-background',
  'text-sm leading-5 font-bold',
  'hover:bg-foreground/90 hover:text-background',
);

/** 桌面 5 槽骨架列表：与实卡同 ScrollArea 裁切，小屏不撑破容器 */
function GameDeployedActorsDesktopSkeleton() {
  return (
    <div className="relative -mt-5 -mb-5">
      <ScrollArea
        orientation="horizontal"
        hideScrollbar
        className={cn(
          'w-full',
          '[&_[data-slot=scroll-area-viewport]]:pt-5',
          '[&_[data-slot=scroll-area-viewport]]:pb-5',
        )}
      >
        <ul
          aria-busy="true"
          className="grid w-full list-none p-0"
          style={GAME_DEPLOYED_ACTOR_LIST_STYLE}
        >
          {DEPLOY_DESKTOP_SKELETON_KEYS.map((slotKey) => (
            <li key={slotKey} className="min-w-0">
              <GameDeployedActorCardSkeleton />
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

export function GameDeployedActorsSection({
  onOpenCandidateDialog,
  onOpenReplenishDialog,
}: GameDeployedActorsSectionProps) {
  const { t } = useTranslation();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const initConfig = useConfigStore((state) => state.initConfig);
  const staminaLimit = getGameActorStaminaLimit(initConfig ?? undefined);
  const scrollAreaRootRef = useRef<HTMLDivElement>(null);
  const [scrollViewport, setScrollViewport] = useState<HTMLElement | null>(
    null,
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const slotItemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [restActor, setRestActor] = useState<ActorDTO | null>(null);
  const [isRestDialogOpen, setIsRestDialogOpen] = useState(false);
  const [isDeployAllConfirmOpen, setIsDeployAllConfirmOpen] = useState(false);
  const [isRestAllConfirmOpen, setIsRestAllConfirmOpen] = useState(false);
  const [isRefillAllConfirmOpen, setIsRefillAllConfirmOpen] = useState(false);

  const {
    data: deployedResponse,
    isPending,
    isError,
  } = useListDeployedActors({
    query: {
      enabled: isLogin,
      retry: false,
    },
  });

  // 候场列表：与右侧「候场」共用 query；总数为 0 时禁用「一键演出」
  const { data: restActorsResponse } = useListRestActors(
    { pageNum: '1', pageSize: DEFAULT_PAGE_SIZE_STRING },
    {
      query: {
        enabled: isLogin,
        retry: false,
      },
    },
  );

  useLayoutEffect(() => {
    setScrollViewport(getScrollAreaViewport(scrollAreaRootRef.current));
  });

  const deployedActors = useMemo(
    () => unwrapOrvalPayload<ActorDTO[]>(deployedResponse) ?? [],
    [deployedResponse],
  );

  const waitingActorCount =
    unwrapOrvalPayload<PageActorDTO>(restActorsResponse)?.totalRow ?? 0;

  const deploySlots = useMemo((): DeploySlot[] => {
    const slots: DeploySlot[] = deployedActors.slice(0, GAME_DEPLOY_SLOT_COUNT);

    while (slots.length < GAME_DEPLOY_SLOT_COUNT) {
      slots.push(null);
    }

    return slots;
  }, [deployedActors]);

  useLayoutEffect(() => {
    if (!scrollViewport) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }

    const updateScrollEdges = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollViewport;
      const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);

      setCanScrollPrev(scrollLeft > SCROLL_EDGE_EPSILON_PX);
      setCanScrollNext(scrollLeft < maxScrollLeft - SCROLL_EDGE_EPSILON_PX);
    };

    updateScrollEdges();
    scrollViewport.addEventListener('scroll', updateScrollEdges, {
      passive: true,
    });

    const resizeObserver = new ResizeObserver(updateScrollEdges);
    resizeObserver.observe(scrollViewport);

    const listElement = scrollViewport.querySelector('ul');

    if (listElement) {
      resizeObserver.observe(listElement);
    }

    return () => {
      scrollViewport.removeEventListener('scroll', updateScrollEdges);
      resizeObserver.disconnect();
    };
  }, [scrollViewport]);

  const deployedCount = deployedActors.length;
  const emptySlotCount = Math.max(0, GAME_DEPLOY_SLOT_COUNT - deployedCount);
  // 一键演出实际人数 = min(空位, 候场)
  const oneClickDeployCount = Math.min(emptySlotCount, waitingActorCount);
  // 有空位且候场有人时才可一键演出
  const canOneClickDeploy = oneClickDeployCount > 0;
  const safeActiveIndex = Math.min(
    Math.max(0, activeSlotIndex),
    GAME_DEPLOY_SLOT_COUNT - 1,
  );
  const activeSlot = deploySlots[safeActiveIndex] ?? null;
  const canFocusPrev = safeActiveIndex > 0;
  const canFocusNext = safeActiveIndex < GAME_DEPLOY_SLOT_COUNT - 1;

  // 一键补充：未满体力的演出中角色与合计 supplyFee
  const refillAllSummary = useMemo(() => {
    const actors: ActorDTO[] = [];
    let totalCost: string | undefined;

    for (const actor of deployedActors) {
      if (isActorStaminaFull(actor.stamina, staminaLimit)) {
        continue;
      }

      actors.push(actor);
      const supplyFee = getGameActorSupplyFee(
        initConfig ?? undefined,
        actor.level,
      );

      if (supplyFee === undefined) {
        continue;
      }

      totalCost =
        totalCost === undefined
          ? String(supplyFee)
          : plus(totalCost, supplyFee);
    }

    return {
      actors,
      actorCount: actors.length,
      totalCost: totalCost === undefined ? undefined : toNumber(totalCost),
    };
  }, [deployedActors, initConfig, staminaLimit]);

  // 无可补体力角色时禁用一键补充
  const canOneClickRefill = refillAllSummary.actorCount > 0;

  const scrollToSlotIndex = (
    index: number,
    behavior: ScrollBehavior = 'smooth',
  ) => {
    const viewport = getScrollAreaViewport(scrollAreaRootRef.current);
    const slotElement = slotItemRefs.current[index];

    if (!viewport || !slotElement) {
      return;
    }

    const scrollLeft = getGameDeploySlotEndAlignScrollLeft(
      viewport.clientWidth,
      slotElement.offsetLeft,
      slotElement.offsetWidth,
      viewport.scrollWidth,
    );

    viewport.scrollTo({ left: scrollLeft, behavior });
  };

  const handleOpenCandidateDialog = () => {
    onOpenCandidateDialog();
  };

  const handleOpenReplenishDialog = (actor: ActorDTO) => {
    onOpenReplenishDialog(actor);
  };

  const handleOpenRestDialog = (actor: ActorDTO) => {
    setRestActor(actor);
    setIsRestDialogOpen(true);
  };

  const handleRestDialogOpenChange = (open: boolean) => {
    setIsRestDialogOpen(open);
    if (!open) {
      setRestActor(null);
    }
  };

  const handleSlotNavSelect = (index: number) => {
    setActiveSlotIndex(index);
    scrollToSlotIndex(index);
  };

  const handleAssignSlotRef =
    (index: number) => (element: HTMLLIElement | null) => {
      slotItemRefs.current[index] = element;
    };

  const handleOpenDeployAllConfirm = () => {
    if (!canOneClickDeploy) {
      return;
    }

    setIsDeployAllConfirmOpen(true);
  };

  const handleDeployAllConfirmOpenChange = (open: boolean) => {
    setIsDeployAllConfirmOpen(open);
  };

  const handleOpenRestAllConfirm = () => {
    if (deployedCount <= 0) {
      return;
    }

    setIsRestAllConfirmOpen(true);
  };

  const handleRestAllConfirmOpenChange = (open: boolean) => {
    setIsRestAllConfirmOpen(open);
  };

  // 按「一卡 + gap」步进横向滚动；scrollTo + 打断进行中的 smooth，避免连点被吞
  const scrollCarouselByStep = (direction: -1 | 1) => {
    const viewport = getScrollAreaViewport(scrollAreaRootRef.current);

    if (!viewport) {
      return;
    }

    const maxScrollLeft = Math.max(
      0,
      viewport.scrollWidth - viewport.clientWidth,
    );
    const slotWidth =
      slotItemRefs.current[0]?.offsetWidth ??
      GAME_DEPLOYED_ACTOR_CARD_MIN_WIDTH_PX;
    const step = (slotWidth + GAME_DEPLOY_CAROUSEL_GAP_PX) * direction;
    const target = Math.max(
      0,
      Math.min(maxScrollLeft, viewport.scrollLeft + step),
    );

    if (Math.abs(target - viewport.scrollLeft) <= SCROLL_EDGE_EPSILON_PX) {
      return;
    }

    // 写回当前 scrollLeft，打断尚未结束的 smooth 动画
    const currentScrollLeft = viewport.scrollLeft;
    viewport.scrollLeft = currentScrollLeft;
    viewport.scrollTo({ left: target, behavior: 'smooth' });
  };

  const handleScrollPrev = () => {
    scrollCarouselByStep(-1);
  };

  const handleScrollNext = () => {
    scrollCarouselByStep(1);
  };

  const handleOpenRefillAllConfirm = () => {
    if (!canOneClickRefill) {
      return;
    }

    setIsRefillAllConfirmOpen(true);
  };

  const handleRefillAllConfirmOpenChange = (open: boolean) => {
    setIsRefillAllConfirmOpen(open);
  };

  const handleFocusPrev = () => {
    if (!canFocusPrev) {
      return;
    }

    setActiveSlotIndex(safeActiveIndex - 1);
  };

  const handleFocusNext = () => {
    if (!canFocusNext) {
      return;
    }

    setActiveSlotIndex(safeActiveIndex + 1);
  };

  const slotDots = (
    <GameDeploySlotDots
      slots={deploySlots}
      activeIndex={safeActiveIndex}
      staminaLimit={staminaLimit}
      onSelect={handleSlotNavSelect}
    />
  );

  // 桌面标题旁仅展示槽位体力色，无移动端聚焦选中态
  const desktopHeaderSlotDots = (
    <GameDeploySlotDots
      slots={deploySlots}
      staminaLimit={staminaLimit}
      onSelect={handleSlotNavSelect}
    />
  );

  return (
    <section
      className={cn(
        'flex w-full flex-col gap-4',
        'max-md:min-h-0 max-md:flex-1',
        'md:rounded-2xl md:bg-card md:p-5',
      )}
    >
      <header className="hidden items-center gap-3 md:flex">
        <h2 className="text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
          {t('演出中')}
        </h2>
        {desktopHeaderSlotDots}
      </header>

      <div className="max-md:min-h-0 max-md:flex max-md:flex-1 max-md:flex-col">
        <AppLoadingContainer
          data={deploySlots}
          isLoading={false}
          isError={isError}
          minHeight={GAME_DEPLOYED_ACTOR_CARD_HEIGHT_PX}
          scrollable={false}
        >
          {/* Figma 358:73900 — 移动端单卡聚焦 */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 md:hidden">
            {isPending ? (
              <div className="min-h-0 w-full flex-1" aria-busy="true">
                <GameDeployedActorCardSkeleton />
              </div>
            ) : activeSlot ? (
              <GameDeployedActorCard
                actor={activeSlot}
                variant="mobileFocus"
                onReplenishClick={handleOpenReplenishDialog}
                onRestClick={handleOpenRestDialog}
                canGoPrev={canFocusPrev}
                canGoNext={canFocusNext}
                onPrev={handleFocusPrev}
                onNext={handleFocusNext}
                slotDots={slotDots}
              />
            ) : (
              <article
                data-slot="game-deployed-actor-card"
                className={cn(
                  GAME_DEPLOYED_ACTOR_CARD_CLASS,
                  'flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl bg-game-deployed-actor-card-surface',
                  'border border-border',
                  'shadow-[1px_5px_20px_rgba(0,0,0,0.13)]',
                )}
              >
                {/* 与有角色卡同骨架：固定头像行 + 信息区占位，切换不抖 */}
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex shrink-0 items-center justify-center gap-3 px-3 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('向左查看派遣角色')}
                      disabled={!canFocusPrev}
                      onClick={handleFocusPrev}
                      className={MOBILE_FOCUS_CHEVRON_CLASS}
                    >
                      <IconChevronLeft className="size-6" />
                    </Button>
                    <div className="min-w-0 flex-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleOpenCandidateDialog}
                        className={cn(
                          'flex h-auto w-full flex-col items-center justify-center gap-3 rounded-xl',
                          PLAY_CARD_COVER_ASPECT_CLASS,
                          // 浅色空位：去掉按钮衬底（勿用 dark:，本站主题走 data-theme）
                          'bg-transparent hover:bg-transparent',
                          '[[data-theme=dark]_&]:bg-muted [[data-theme=dark]_&]:hover:bg-muted/80',
                        )}
                      >
                        <IconDeploySlotEmptyAvatar className="size-11 shrink-0" />
                        <span className={GAME_DEPLOYED_EMPTY_SLOT_CTA_CLASS}>
                          {t('演出')}
                        </span>
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('向右查看派遣角色')}
                      disabled={!canFocusNext}
                      onClick={handleFocusNext}
                      className={MOBILE_FOCUS_CHEVRON_CLASS}
                    >
                      <IconChevronLeft className="size-6 rotate-180" />
                    </Button>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col items-center gap-3 p-3">
                    {/* 占位与有角色卡信息区同高，保证整卡高度一致 */}
                    <div
                      aria-hidden
                      className="invisible flex w-full flex-col gap-2"
                    >
                      <div className="h-6 w-full" />
                      <div className="flex flex-col gap-0.5">
                        <div className="h-4 w-full" />
                        <div className="h-5 w-full" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-9 flex-1" />
                        <div className="h-9 flex-1" />
                      </div>
                    </div>
                    <div className="mt-auto flex w-full flex-col items-center">
                      {slotDots}
                    </div>
                  </div>
                </div>
              </article>
            )}

            <Button
              type="button"
              className={cn(ONE_CLICK_DEPLOY_BUTTON_CLASS, 'w-full shrink-0')}
              disabled={!canOneClickDeploy}
              onClick={handleOpenDeployAllConfirm}
            >
              {t('一键演出')}
            </Button>

            <GameWaitingActorsSection
              variant="mobile"
              onOpenCandidateDialog={onOpenCandidateDialog}
            />
          </div>

          {/* 桌面：横向多卡轮播 + 三枚批量按钮 */}
          <div className="hidden flex-col gap-4 md:flex">
            {isPending ? (
              <GameDeployedActorsDesktopSkeleton />
            ) : (
              /*
                ScrollArea viewport 为 overflow:scroll，会裁切卡片上下 box-shadow。
                上下内边距给阴影留空间；-mt/-mb 抵消对相邻区块的额外间距。
              */
              <div ref={scrollAreaRootRef} className="relative -mt-5 -mb-5">
                <ScrollArea
                  orientation="horizontal"
                  hideScrollbar
                  className={cn(
                    'w-full',
                    '[&_[data-slot=scroll-area-viewport]]:pt-5',
                    '[&_[data-slot=scroll-area-viewport]]:pb-5',
                  )}
                >
                  <ul
                    className="grid w-full list-none p-0"
                    style={GAME_DEPLOYED_ACTOR_LIST_STYLE}
                  >
                    {deploySlots.map((slot, index) => (
                      <li
                        key={slot?.actorNftId ?? `empty-${index}`}
                        ref={handleAssignSlotRef(index)}
                        className="min-w-0"
                      >
                        {slot ? (
                          <GameDeployedActorCard
                            actor={slot}
                            onReplenishClick={handleOpenReplenishDialog}
                            onRestClick={handleOpenRestDialog}
                          />
                        ) : (
                          <GameDeployedActorEmptySlot
                            onClick={handleOpenCandidateDialog}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>

                <GameDeployCarouselEdgeNav
                  canScrollPrev={canScrollPrev}
                  canScrollNext={canScrollNext}
                  onPrev={handleScrollPrev}
                  onNext={handleScrollNext}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className={cn(ONE_CLICK_DEPLOY_BUTTON_CLASS, 'w-auto shrink-0')}
                disabled={!canOneClickDeploy}
                onClick={handleOpenDeployAllConfirm}
              >
                {t('一键演出')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={BATCH_OUTLINE_BUTTON_CLASS}
                disabled={!canOneClickRefill}
                onClick={handleOpenRefillAllConfirm}
              >
                {t('一键补充')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={BATCH_OUTLINE_BUTTON_CLASS}
                disabled={deployedCount <= 0}
                onClick={handleOpenRestAllConfirm}
              >
                {t('一键休息')}
              </Button>
            </div>
          </div>
        </AppLoadingContainer>
      </div>

      <GameRestActorDialog
        open={isRestDialogOpen}
        onOpenChange={handleRestDialogOpenChange}
        actor={restActor}
        restCount={deployedCount}
      />
      <GameDeployAllActorsConfirmDialog
        open={isDeployAllConfirmOpen}
        onOpenChange={handleDeployAllConfirmOpenChange}
        deployCount={oneClickDeployCount}
      />
      <GameRestAllActorsConfirmDialog
        open={isRestAllConfirmOpen}
        onOpenChange={handleRestAllConfirmOpenChange}
        restCount={deployedCount}
      />
      <GameRefillAllActorsConfirmDialog
        open={isRefillAllConfirmOpen}
        onOpenChange={handleRefillAllConfirmOpenChange}
        actors={refillAllSummary.actors}
        actorCount={refillAllSummary.actorCount}
        totalCost={refillAllSummary.totalCost}
      />
    </section>
  );
}
