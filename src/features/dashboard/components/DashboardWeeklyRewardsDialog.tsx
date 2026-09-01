import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getListWeeklyRewardsQueryKey,
  listWeeklyRewards,
} from '@/api/__generated__/mining/mining/mining';
import { AppDialog } from '@/components/common/AppDialog';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { useDashboardDialogLoadMore } from '../hooks/useDashboardDialogLoadMore';
import {
  getDashboardCursorNextPageParam,
  mergeDashboardWeeklyRewardPages,
} from '../utils/dashboardFormat';
import { DashboardWeeklyRewardsTable } from './DashboardWeeklyRewardsTable';

type DashboardWeeklyRewardsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DashboardWeeklyRewardsDialog({
  open,
  onOpenChange,
}: DashboardWeeklyRewardsDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { handleSentinelRef, canFetchNextPage, markLoadMoreTriggered } =
    useDashboardDialogLoadMore(open);

  const requestParams = useMemo(() => ({ pageSize: DEFAULT_PAGE_SIZE }), []);
  const weeklyQueryKey = useMemo(
    () =>
      [
        ...getListWeeklyRewardsQueryKey(requestParams),
        'dashboard-weekly-dialog',
      ] as const,
    [requestParams],
  );

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: weeklyQueryKey,
    queryFn: ({ pageParam, signal }) =>
      listWeeklyRewards(
        {
          ...requestParams,
          mark: pageParam as number,
        },
        { signal },
      ),
    initialPageParam: 0,
    getNextPageParam: getDashboardCursorNextPageParam,
    enabled: open,
    retry: false,
    gcTime: 0,
  });

  const rows = useMemo(
    () => mergeDashboardWeeklyRewardPages(data?.pages),
    [data?.pages],
  );

  useEffect(() => {
    if (open) {
      return;
    }

    queryClient.removeQueries({ queryKey: weeklyQueryKey });
  }, [open, queryClient, weeklyQueryKey]);

  useEffect(() => {
    if (canFetchNextPage && hasNextPage && !isFetchingNextPage) {
      markLoadMoreTriggered();
      void fetchNextPage();
    }
  }, [
    canFetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    markLoadMoreTriggered,
  ]);

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('历史挖矿数据')}
      width={800}
      maxHeight="90dvh"
    >
      <div className="flex flex-col gap-4">
        <DashboardWeeklyRewardsTable
          rows={rows}
          isLoading={isPending}
          isError={isError}
          minHeight={280}
        />
        <div
          ref={handleSentinelRef}
          className="flex min-h-8 items-center justify-center py-2"
        >
          {isFetchingNextPage ? <Spinner className="size-5" /> : null}
        </div>
      </div>
    </AppDialog>
  );
}
