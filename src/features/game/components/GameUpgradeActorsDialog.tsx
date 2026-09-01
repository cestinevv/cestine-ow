import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import {
  getListAllActorsQueryKey,
  listAllActors,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { PageActorDTO } from '@/api/__generated__/mining/model/pageActorDTO';
import IconCheck from '@/assets/svg/IconCheck';
import IconChevronRight from '@/assets/svg/IconChevronRight';
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
import {
  getGameActorRowKey,
  isGameActorMaxLevel,
} from '@/features/game/constants/gameActorConfig';
import { getGameActorLevelBadgeSurfaceClass } from '@/features/game/constants/gameActorLevelVisual';
import { resolveActorDetailRouteId } from '@/features/game/constants/gameActorNft';
import {
  GAME_LIST_ALL_ACTORS_EXCLUDE_MAX_LEVEL,
  GAME_MY_ACTORS_MIXED_PAGE_KEY,
  getGameMyActorsPageSize,
} from '@/features/game/constants/gameConstants';
import { formatGameActorHourlyPaymentValue } from '@/features/game/formatGameActorStoryRate';
import type { GameListAllActorsPollContext } from '@/features/game/gameActorStaminaCache';
import { getGameActorUpgradeRequirementState } from '@/features/game/getGameActorUpgradeRequirementState';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber } from '@/utils';

import { GameActorLevelBadge } from './GameActorLevelBadge';
import { GameActorUpgradeDialog } from './GameActorUpgradeDialog';
import { GameUpgradeBlockedDialog } from './GameUpgradeBlockedDialog';

type GameUpgradeActorsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Figma「立即升级」未达标：36 高、12 圆角、1.5 描边、14 Medium secondary（disabled） */
const UPGRADE_BUTTON_IDLE_CLASS = cn(
  'h-9 w-full rounded-xl border-[1.5px] border-game-header-action-border bg-transparent px-3',
  'text-sm leading-5 font-medium text-game-header-subtitle',
  'disabled:border-game-header-action-border disabled:bg-transparent',
  'disabled:text-button-disabled-foreground disabled:opacity-100',
);

/** Figma「立即升级」可升级：Page&Sheet/dark + white-to-dark */
const UPGRADE_BUTTON_READY_CLASS = cn(
  'h-9 w-full rounded-xl px-3',
  'bg-foreground text-background',
  'text-sm leading-5 font-medium',
  'hover:bg-foreground/90 hover:text-background',
);

function getActorsNextPageParam(
  lastPage: Awaited<ReturnType<typeof listAllActors>>,
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

function RequirementRow({
  label,
  current,
  target,
  met,
  onIconClick,
}: {
  label: string;
  current: number | undefined;
  target: number | undefined;
  met: boolean;
  onIconClick?: () => void;
}) {
  const { t } = useTranslation();
  const progress =
    current !== undefined && target !== undefined && target > 0
      ? Math.min(100, Math.max(0, (current / target) * 100))
      : 0;

  return (
    <div className="flex w-full flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-xs leading-4 font-medium tracking-[0.04px]',
            'text-game-header-title',
          )}
        >
          {label}
        </span>
        {/* 仅未达标「+」可点，打开升级不足引导；达标「✓」纯展示 */}
        {onIconClick && !met ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('补充升级条件')}
            className={cn(
              'size-4 shrink-0 rounded-full p-0.5',
              'bg-background text-game-header-title',
              'hover:bg-background hover:opacity-80',
              'disabled:opacity-100',
            )}
            onClick={onIconClick}
          >
            <IconPlus className="size-3 text-game-header-title" />
          </Button>
        ) : (
          <span
            className={cn(
              'inline-flex size-4 shrink-0 items-center justify-center rounded-full p-0.5',
              'bg-background',
            )}
          >
            {met ? (
              <IconCheck className="size-3 text-game-panel-dot-success" />
            ) : (
              <IconPlus className="size-3 text-game-header-title" />
            )}
          </span>
        )}
      </div>

      {/* Figma：h-16 进度条内叠 current/target 文案 */}
      <div
        className={cn(
          'relative h-4 w-full overflow-hidden rounded-xl',
          'bg-game-panel-row-surface',
        )}
      >
        <div
          className="absolute inset-y-0 left-0 bg-game-panel-dot-success"
          style={{ width: `${progress}%` }}
        />
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'text-xs leading-none tracking-[0.04px]',
            met ? 'text-white/80' : 'text-game-header-subtitle',
          )}
        >
          {current !== undefined ? formatNumber(current, 0) : '-'}
          {'/'}
          {target !== undefined ? formatNumber(target, 0) : '-'}
        </span>
      </div>
    </div>
  );
}

function UpgradeActorCard({
  actor,
  onUpgradeClick,
  onBlockedClick,
}: {
  actor: ActorDTO;
  onUpgradeClick: (actor: ActorDTO) => void;
  onBlockedClick: (actor: ActorDTO) => void;
}) {
  const { t } = useTranslation();
  const initConfig = useConfigStore((state) => state.initConfig);
  const requirement = getGameActorUpgradeRequirementState(
    actor,
    initConfig ?? undefined,
  );
  const isMaxLevel = isGameActorMaxLevel(initConfig ?? undefined, actor.level);
  const actorName = actor.actorName?.trim();
  const actorCode =
    actor.actorTokenId !== undefined
      ? `#${formatNumber(actor.actorTokenId, 0)}`
      : undefined;
  const avatarUrl = actor.avatarUrl?.trim();
  const avatarAlt = actorName
    ? t('{{name}} 的角色头像', { name: actorName })
    : t('角色头像');
  const actorDetailId = resolveActorDetailRouteId({
    actorNftId: actor.actorNftId,
    actorCollectionId: actor.actorCollectionId,
  });
  const toLevelSurfaceClass =
    requirement.toLevel !== undefined
      ? getGameActorLevelBadgeSurfaceClass(requirement.toLevel)
      : undefined;

  const handleUpgradeClick = () => {
    if (isMaxLevel || !requirement.isReady) {
      return;
    }

    onUpgradeClick(actor);
  };

  // Figma 198:44098 — 点击条件旁 +/✓ 打开「升级不足」引导弹窗
  const handleRequirementIconClick = () => {
    if (isMaxLevel) {
      return;
    }

    onBlockedClick(actor);
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

        {!isMaxLevel && requirement.toLevel !== undefined ? (
          <div
            className={cn(
              'flex w-full flex-col items-center gap-2',
              'rounded-lg px-3 py-1',
              'bg-game-upgrade-compare-surface',
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className={cn(
                  'rounded-full py-0.5 pr-1.5 pl-2',
                  'bg-button-disabled-surface',
                  'text-xs leading-4 font-medium tracking-[0.04px] text-white',
                )}
              >
                Lv{actor.level ?? '-'}
              </span>
              <IconChevronRight
                className="size-4 shrink-0 text-game-header-title"
                aria-hidden
              />
              <span
                className={cn(
                  'rounded-full py-0.5 pr-1.5 pl-2',
                  'text-xs leading-4 font-medium tracking-[0.04px] text-white',
                  toLevelSurfaceClass,
                )}
              >
                Lv{requirement.toLevel}
              </span>
            </div>

            <p className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-1 whitespace-nowrap">
              <span className="text-xs leading-4 font-normal tracking-[0.04px] text-game-header-title">
                {t('片酬')}
              </span>
              <span className="text-xs leading-4 font-bold tracking-[0.04px] text-game-header-title">
                {formatGameActorHourlyPaymentValue(
                  requirement.currentStoryRate,
                )}
                {' → '}
                {formatGameActorHourlyPaymentValue(requirement.nextStoryRate)}
              </span>
              <span className="text-xs leading-4 font-normal tracking-[0.04px] text-game-header-subtitle">
                STORY/h
              </span>
            </p>
          </div>
        ) : null}

        <RequirementRow
          label={t('完播')}
          current={requirement.completedPlayCount}
          target={requirement.heatThreshold}
          met={requirement.isHeatMet}
          onIconClick={handleRequirementIconClick}
        />
        <RequirementRow
          label={t('相同角色')}
          current={requirement.materialCount}
          target={requirement.requiredMaterialCount}
          met={requirement.isMaterialMet}
          onIconClick={handleRequirementIconClick}
        />

        <Button
          type="button"
          disabled={!requirement.isReady || isMaxLevel}
          className={
            requirement.isReady
              ? UPGRADE_BUTTON_READY_CLASS
              : UPGRADE_BUTTON_IDLE_CLASS
          }
          variant={requirement.isReady ? 'default' : 'outline'}
          onClick={handleUpgradeClick}
        >
          {t('立即升级')}
        </Button>
      </div>
    </article>
  );
}

export function GameUpgradeActorsDialog({
  open,
  onOpenChange,
}: GameUpgradeActorsDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ref, inView } = useInView();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );
  const [selectedActor, setSelectedActor] = useState<ActorDTO | null>(null);
  const [isBlockedOpen, setIsBlockedOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
  );

  const upgradeListContext = useMemo<GameListAllActorsPollContext>(
    () => ({
      sort: 'COMPUTING_POWER',
      walletQueryKeyScope,
    }),
    [walletQueryKeyScope],
  );

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      ...getListAllActorsQueryKey({
        sort: 'COMPUTING_POWER',
        excludeMaxLevel: GAME_LIST_ALL_ACTORS_EXCLUDE_MAX_LEVEL,
      }),
      ...GAME_MY_ACTORS_MIXED_PAGE_KEY,
      'upgrade-dialog',
      walletQueryKeyScope,
    ] as const,
    queryFn: ({ pageParam }) =>
      listAllActors({
        sort: 'COMPUTING_POWER',
        excludeMaxLevel: GAME_LIST_ALL_ACTORS_EXCLUDE_MAX_LEVEL,
        pageSize: getGameMyActorsPageSize(pageParam as string),
        pageNum: pageParam as string,
      }),
    initialPageParam: '1',
    getNextPageParam: getActorsNextPageParam,
    enabled: open && isLogin,
    retry: false,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

  const actors = useMemo(() => {
    const pages = data?.pages ?? [];
    return pages.flatMap((page) => {
      const pageData = unwrapOrvalPayload<PageActorDTO>(page);
      return pageData?.records ?? [];
    });
  }, [data?.pages]);

  const initConfig = useConfigStore((state) => state.initConfig);
  const selectedRequirement = selectedActor
    ? getGameActorUpgradeRequirementState(
        selectedActor,
        initConfig ?? undefined,
      )
    : null;

  const handleUpgradeClick = (actor: ActorDTO) => {
    setSelectedActor(actor);
    setIsUpgradeOpen(true);
  };

  // 条件旁图标 → Figma 198:44098「升级不足」引导
  const handleBlockedClick = (actor: ActorDTO) => {
    setSelectedActor(actor);
    setIsBlockedOpen(true);
  };

  // 空态加号 → 角色 IP 广场（Figma 796:144158）
  const handleGoToActorPlaza = () => {
    onOpenChange(false);
    void navigate({ to: '/actor' });
  };

  const handleBlockedOpenChange = (nextOpen: boolean) => {
    setIsBlockedOpen(nextOpen);
    if (!nextOpen) {
      setSelectedActor(null);
    }
  };

  const handleUpgradeOpenChange = (nextOpen: boolean) => {
    setIsUpgradeOpen(nextOpen);
    if (!nextOpen) {
      setSelectedActor(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          bare
          bodyScroll={false}
          className={cn(
            'flex w-full flex-col overflow-hidden',
            'gap-0 p-0',
            'md:max-w-[1200px]',
          )}
        >
          {/* Figma 198:44095 / 191:38366 — p-32 */}
          <div
            className={cn(
              'flex min-h-0 w-full flex-1 flex-col',
              'gap-6 p-6 md:p-8',
              'max-h-[var(--app-dialog-max-height,90dvh)]',
            )}
          >
            <header className="flex w-full shrink-0 items-center justify-between gap-4">
              <DialogTitle
                className={cn(
                  'm-0 min-w-0 flex-1 text-left',
                  'text-lg leading-[26px] font-bold tracking-[-0.04px]',
                  'text-game-header-title',
                )}
              >
                {t('角色升级')}
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

            <div className="min-h-0 flex-1 overflow-y-auto">
              <AppLoadingContainer
                data={actors}
                isLoading={isPending}
                isError={isError}
                minHeight={280}
                emptyDescription={t('暂无内容')}
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
                    'grid list-none gap-4 p-0',
                    'grid-cols-2 md:grid-cols-4',
                  )}
                >
                  {actors.map((actor) => (
                    <li key={getGameActorRowKey(actor)}>
                      <UpgradeActorCard
                        actor={actor}
                        onUpgradeClick={handleUpgradeClick}
                        onBlockedClick={handleBlockedClick}
                      />
                    </li>
                  ))}
                </ul>
                <div
                  ref={ref}
                  className="flex min-h-8 items-center justify-center py-3"
                >
                  {isFetchingNextPage ? <Spinner className="size-5" /> : null}
                </div>
              </AppLoadingContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GameUpgradeBlockedDialog
        open={isBlockedOpen}
        onOpenChange={handleBlockedOpenChange}
        onNavigateAway={() => {
          setIsBlockedOpen(false);
          setSelectedActor(null);
          onOpenChange(false);
        }}
        actor={selectedActor}
        requirement={selectedRequirement}
      />
      <GameActorUpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={handleUpgradeOpenChange}
        actor={selectedActor}
        upgradeListContext={upgradeListContext}
      />
    </>
  );
}
