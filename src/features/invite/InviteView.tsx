import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  getGetTotalRewardQueryKey,
  getGetWeeklyStatsQueryKey,
  useGetTotalReward,
  useGetWeeklyStats,
} from '@/api/__generated__/mining/mining/mining';
import type { TotalRewardDTO } from '@/api/__generated__/mining/model/totalRewardDTO';
import type { WeeklyStatsDTO } from '@/api/__generated__/mining/model/weeklyStatsDTO';
import type { InviteInfoResponse } from '@/api/__generated__/wallet/model/inviteInfoResponse';
import {
  getInviteInfoQueryKey,
  useInviteInfo,
} from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
import { ContentContainer } from '@/components/common/ContentContainer';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';

import { DirectInviteUsersDialog } from './components/DirectInviteUsersDialog';
import { IncomeInviteLinkCard } from './components/IncomeInviteLinkCard';
import { IncomeInviteRulesSection } from './components/IncomeInviteRulesSection';
import { IncomeInviteWeeklyPoolSection } from './components/IncomeInviteWeeklyPoolSection';
import { InviteCodeBindingDialog } from './components/InviteCodeBindingDialog';
import { InviteCodeBindingEntry } from './components/InviteCodeBindingEntry';

export function InviteView() {
  const navigate = useNavigate();
  const [isDirectInviteDialogOpen, setIsDirectInviteDialogOpen] =
    useState(false);
  const [isInviteCodeDialogOpen, setIsInviteCodeDialogOpen] = useState(false);

  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
  );

  const { data: inviteInfoResponse, isSuccess: isInviteInfoSuccess } =
    useInviteInfo({
      query: {
        enabled: isLogin,
        retry: false,
        queryKey: [...getInviteInfoQueryKey(), walletQueryKeyScope],
      },
    });

  const { data: totalRewardResponse } = useGetTotalReward({
    query: {
      enabled: isLogin,
      retry: false,
      queryKey: [...getGetTotalRewardQueryKey(), walletQueryKeyScope],
    },
  });

  const { data: weeklyStatsResponse } = useGetWeeklyStats({
    query: {
      enabled: isLogin,
      retry: false,
      queryKey: [...getGetWeeklyStatsQueryKey(), walletQueryKeyScope],
    },
  });

  const inviteInfo = unwrapOrvalPayload<InviteInfoResponse>(inviteInfoResponse);

  const totalReward = unwrapOrvalPayload<TotalRewardDTO>(totalRewardResponse);
  const cumulativeInviteStoryEarnings =
    totalReward?.totalInviteReward !== undefined
      ? String(totalReward.totalInviteReward)
      : undefined;

  const weeklyStats = unwrapOrvalPayload<WeeklyStatsDTO>(weeklyStatsResponse);
  const weeklyPoolAmount =
    weeklyStats?.weekInvitePool !== undefined
      ? String(weeklyStats.weekInvitePool)
      : undefined;

  function handleViewRecords() {
    void navigate({ to: '/income' });
  }

  function handleOpenInviteCodeDialog() {
    setIsInviteCodeDialogOpen(true);
  }

  // 点击累计邀请人数卡片，打开直接下级用户弹窗
  const handleOpenDirectInviteDialog = () => {
    setIsDirectInviteDialogOpen(true);
  };

  return (
    <div
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-points-page-surface-muted',
      )}
    >
      <ContentContainer
        className={cn('flex w-full flex-col gap-3 py-4', 'md:gap-4')}
      >
        <IncomeInviteWeeklyPoolSection weeklyPoolAmount={weeklyPoolAmount} />

        <IncomeInviteLinkCard
          inviteCode={inviteInfo?.inviteCode}
          totalInviteCount={inviteInfo?.totalInviteCount}
          cumulativeInviteStoryEarnings={cumulativeInviteStoryEarnings}
          onInviteCountClick={handleOpenDirectInviteDialog}
          onEarningsClick={handleViewRecords}
        />

        <DirectInviteUsersDialog
          open={isDirectInviteDialogOpen}
          onOpenChange={setIsDirectInviteDialogOpen}
        />

        {isInviteInfoSuccess && !inviteInfo?.inviterUserId ? (
          <InviteCodeBindingEntry onClick={handleOpenInviteCodeDialog} />
        ) : null}

        <InviteCodeBindingDialog
          open={isInviteCodeDialogOpen}
          onOpenChange={setIsInviteCodeDialogOpen}
        />

        <IncomeInviteRulesSection />
      </ContentContainer>
    </div>
  );
}
