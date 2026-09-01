import { useNavigate } from '@tanstack/react-router';
import { AlertTriangleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import store2 from 'store2';

import { useGetWeeklyStats } from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { WeeklyStatsDTO } from '@/api/__generated__/mining/model/weeklyStatsDTO';
import type { UserProfileResponse } from '@/api/__generated__/wallet/model/userProfileResponse';
import { useUserInfo } from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
import IconArrowBigTop from '@/assets/svg/IconArrowBigTop';
import IconHelp2 from '@/assets/svg/IconHelp2';
import IconHistoryRecords from '@/assets/svg/IconHistoryRecords';
import { Button } from '@/components/ui/button';
import { GamePageHeaderActionsSheet } from '@/features/game/components/GamePageHeaderActionsSheet';
import { GameRiskAccountDialog } from '@/features/game/components/GameRiskAccountDialog';
import { GameTodoSheet } from '@/features/game/components/GameTodoSheet';
import { GameUpgradeActorsDialog } from '@/features/game/components/GameUpgradeActorsDialog';
import {
  GameWeeklyStatHelpDialog,
  type GameWeeklyStatHelpType,
} from '@/features/game/components/GameWeeklyStatHelpDialog';
import { useGameTodoItems } from '@/features/game/hooks/useGameTodoItems';
import { useGameUpgradableActorCount } from '@/features/game/hooks/useGameUpgradableActorCount';
import { MiningRulesDialog } from '@/features/mining/components/MiningRulesDialog';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { unwrapWalletApiData } from '@/features/profile/profileFormat';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber } from '@/utils';

/* Figma 198:44070 — Page&Sheet/secondary + Border/secondary pill */
const HEADER_ACTION_BUTTON_CLASS = cn(
  'h-9 shrink-0 rounded-[33px] border-[0.5px] border-game-header-action-border',
  'bg-game-header-action-surface px-3 py-1.5',
  'text-sm leading-5 font-normal text-game-header-action-foreground',
  'hover:bg-game-header-action-hover hover:text-game-header-action-foreground',
);

/* Figma 350:61400 — 移动端头部 badge pill：pl-4 pr-6 py-2 gap-4 */
const MOBILE_HEADER_BADGE_CLASS = cn(
  'flex h-auto min-h-0 items-center gap-1 rounded-[59px]',
  'bg-game-header-action-surface py-0.5 pl-1 pr-1.5',
  'hover:bg-game-header-action-surface hover:text-game-header-title',
);

type GamePageHeaderProps = {
  onOpenCandidateDialog: () => void;
  onOpenReplenishDialog: (actor: ActorDTO) => void;
};

export function GamePageHeader({
  onOpenCandidateDialog,
  onOpenReplenishDialog,
}: GamePageHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfile = useGlobalStore((state) => state.userProfile);
  const setUserInfo = useGlobalStore((state) => state.setUserInfo);
  const { todoItems, todoCount } = useGameTodoItems();
  const { upgradableActorCount } = useGameUpgradableActorCount();
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [helpType, setHelpType] = useState<GameWeeklyStatHelpType | null>(null);
  const [isActionsSheetOpen, setIsActionsSheetOpen] = useState(false);
  const [isTodoSheetOpen, setIsTodoSheetOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

  const { data: userInfoResponse } = useUserInfo({
    query: { enabled: isLogin },
  });

  const {
    data: weeklyStatsResponse,
    isPending: isWeeklyStatsPending,
    isError: isWeeklyStatsError,
  } = useGetWeeklyStats({
    query: {
      enabled: isLogin,
      retry: false,
    },
  });

  useEffect(() => {
    if (userInfoResponse?.status !== 200) {
      return;
    }

    const freshProfile =
      unwrapWalletApiData<UserProfileResponse>(userInfoResponse);
    if (!freshProfile) {
      return;
    }

    const token = store2.get('userToken') as string | undefined;
    setUserInfo({ token, userProfile: freshProfile });
  }, [userInfoResponse, setUserInfo]);

  const weeklyStats = useMemo(
    () => unwrapOrvalPayload<WeeklyStatsDTO>(weeklyStatsResponse),
    [weeklyStatsResponse],
  );

  // 本周片酬：用 weeklyTotalOutput（本周预估实际产出）
  const weeklyTotalOutputDisplay =
    !isWeeklyStatsPending &&
    !isWeeklyStatsError &&
    weeklyStats?.weeklyTotalOutput !== undefined
      ? formatNumber(weeklyStats.weeklyTotalOutput, 2)
      : undefined;

  const trustValue =
    userProfile?.trust !== undefined ? Number(userProfile.trust) : undefined;
  const isRiskAccount =
    isLogin &&
    trustValue !== undefined &&
    Number.isFinite(trustValue) &&
    trustValue < 1;

  const handleRiskAccountClick = () => {
    setRiskDialogOpen(true);
  };

  const handleOpenRules = () => {
    setIsRulesOpen(true);
  };

  const handleRulesOpenChange = (open: boolean) => {
    setIsRulesOpen(open);
  };

  const handleOpenWeekPoolHelp = () => {
    setHelpType('weekPool');
  };

  const handleHelpOpenChange = (open: boolean) => {
    if (!open) {
      setHelpType(null);
    }
  };

  const handleOpenSettlementRecords = () => {
    void navigate({ to: '/income' });
  };

  const handleOpenActionsSheet = () => {
    setIsActionsSheetOpen(true);
  };

  const handleActionsSheetOpenChange = (open: boolean) => {
    setIsActionsSheetOpen(open);
  };

  const handleOpenTodoSheet = () => {
    setIsTodoSheetOpen(true);
  };

  const handleTodoSheetOpenChange = (open: boolean) => {
    setIsTodoSheetOpen(open);
  };

  const handleOpenUpgradeDialog = () => {
    setIsUpgradeDialogOpen(true);
  };

  const handleUpgradeDialogOpenChange = (open: boolean) => {
    setIsUpgradeDialogOpen(open);
  };

  return (
    <>
      <header
        className={cn(
          'flex w-full shrink-0 flex-col items-stretch',
          'md:flex-row md:items-center md:justify-between',
          'gap-3 rounded-2xl p-4 md:gap-6 md:p-5',
          'bg-game-header-surface',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0 md:gap-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <h1
                className={cn(
                  'min-w-0 truncate text-[17px] leading-[25px] font-bold text-game-header-title',
                  'md:text-[30px] md:leading-9 md:tracking-[-0.12px]',
                )}
              >
                {t('升级 · 演出 · 赚片酬')}
              </h1>
              {isRiskAccount ? (
                <button
                  type="button"
                  onClick={handleRiskAccountClick}
                  className="flex shrink-0 items-center gap-1 rounded-[49px] bg-game-risk-badge-surface px-1.5 py-1 text-xs leading-4 font-normal tracking-[0.04px] text-game-risk-badge-text"
                >
                  <AlertTriangleIcon className="size-4 shrink-0" />
                  {t('风险账户')}
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-3 md:hidden">
              <Button
                type="button"
                variant="ghost"
                onClick={handleOpenTodoSheet}
                className={MOBILE_HEADER_BADGE_CLASS}
                aria-label={t('待办')}
              >
                <IconHistoryRecords className="size-5 shrink-0 text-game-header-title" />
                {todoCount > 0 ? (
                  <span className="text-xs leading-4 font-medium tracking-[0.04px] text-game-header-title">
                    {formatNumber(todoCount, 0)}
                  </span>
                ) : null}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleOpenUpgradeDialog}
                className={MOBILE_HEADER_BADGE_CLASS}
                aria-label={t('升级')}
              >
                <IconArrowBigTop className="size-5 shrink-0 text-game-header-title" />
                {upgradableActorCount !== undefined &&
                upgradableActorCount > 0 ? (
                  <span className="text-xs leading-4 font-medium tracking-[0.04px] text-game-header-title">
                    {formatNumber(upgradableActorCount, 0)}
                  </span>
                ) : null}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleOpenActionsSheet}
                className={cn(
                  'h-auto min-h-0 shrink-0 p-1',
                  'text-game-header-title hover:bg-transparent hover:text-game-header-title',
                )}
                aria-label={t('规则')}
              >
                <IconHelp2 className="size-6 shrink-0" />
              </Button>
            </div>
          </div>

          <p
            className={cn(
              'text-[13px] leading-[18px] tracking-normal text-game-header-subtitle',
              'md:text-sm md:leading-5',
            )}
          >
            <span>{t('本周片酬')}</span>
            <span className="mx-1 font-bold text-game-header-monetary">
              {weeklyTotalOutputDisplay ?? '-'}
            </span>
            <span>STORY</span>
          </p>
        </div>

        <div
          className={cn(
            'hidden w-full shrink-0 flex-wrap items-center gap-3',
            'md:flex md:w-auto md:justify-end',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={handleOpenRules}
            className={HEADER_ACTION_BUTTON_CLASS}
          >
            {t('规则')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleOpenWeekPoolHelp}
            className={HEADER_ACTION_BUTTON_CLASS}
          >
            {t('奖池')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleOpenSettlementRecords}
            className={HEADER_ACTION_BUTTON_CLASS}
          >
            {t('记录')}
          </Button>
        </div>
      </header>

      <GameRiskAccountDialog
        open={riskDialogOpen}
        onOpenChange={setRiskDialogOpen}
      />
      <GameWeeklyStatHelpDialog
        open={helpType !== null}
        onOpenChange={handleHelpOpenChange}
        helpType={helpType}
        weeklyStats={weeklyStats ?? undefined}
      />
      <MiningRulesDialog
        open={isRulesOpen}
        onOpenChange={handleRulesOpenChange}
      />
      <GamePageHeaderActionsSheet
        open={isActionsSheetOpen}
        onOpenChange={handleActionsSheetOpenChange}
        onOpenRules={handleOpenRules}
        onOpenWeekPoolHelp={handleOpenWeekPoolHelp}
        onOpenSettlementRecords={handleOpenSettlementRecords}
      />
      <GameTodoSheet
        open={isTodoSheetOpen}
        onOpenChange={handleTodoSheetOpenChange}
        todoItems={todoItems}
        todoCount={todoCount}
        onOpenCandidateDialog={onOpenCandidateDialog}
        onOpenReplenishDialog={onOpenReplenishDialog}
      />
      <GameUpgradeActorsDialog
        open={isUpgradeDialogOpen}
        onOpenChange={handleUpgradeDialogOpenChange}
      />
    </>
  );
}
