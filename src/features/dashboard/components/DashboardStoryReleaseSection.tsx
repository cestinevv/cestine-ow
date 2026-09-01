import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useListWeeklyRewards } from '@/api/__generated__/mining/mining/mining';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { cn } from '@/utils';
import { mergeDashboardWeeklyRewardPages } from '../utils/dashboardFormat';
import { DashboardPreviewSectionHeader } from './DashboardPreviewSectionHeader';
import { DashboardSectionTitle } from './DashboardSectionTitle';
import { DashboardStoryAllocationTable } from './DashboardStoryAllocationTable';
import { DashboardWeeklyRewardsDialog } from './DashboardWeeklyRewardsDialog';
import { DashboardWeeklyRewardsTable } from './DashboardWeeklyRewardsTable';

export function DashboardStoryReleaseSection() {
  const { t } = useTranslation();
  const [weeklyDialogOpen, setWeeklyDialogOpen] = useState(false);

  const weeklyQuery = useListWeeklyRewards(
    { pageSize: DEFAULT_PAGE_SIZE, mark: 0 },
    { query: { retry: false } },
  );

  const weeklyRows = mergeDashboardWeeklyRewardPages(
    weeklyQuery.data ? [weeklyQuery.data] : undefined,
  );

  // 打开历史挖矿数据弹窗。
  const handleOpenWeeklyDialog = () => {
    setWeeklyDialogOpen(true);
  };

  return (
    <section className="flex flex-col gap-4 md:gap-8">
      <DashboardSectionTitle title={t('STORY 释放概览')} />

      <DashboardStoryAllocationTable />

      <div
        className={cn(
          'flex flex-col gap-4 p-4 md:gap-6 md:p-8',
          'rounded-2xl border border-white bg-card md:border-0',
        )}
      >
        <DashboardPreviewSectionHeader
          title={t('近期挖矿释放')}
          actionLabel={t('查看更多')}
          onAction={handleOpenWeeklyDialog}
        />
        <DashboardWeeklyRewardsTable
          rows={weeklyRows}
          isLoading={weeklyQuery.isPending}
          isError={false}
        />
      </div>

      <DashboardWeeklyRewardsDialog
        open={weeklyDialogOpen}
        onOpenChange={setWeeklyDialogOpen}
      />
    </section>
  );
}
