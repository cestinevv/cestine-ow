import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  actorVaultRanking,
  getActorVaultRankingQueryKey,
} from '@/api/__generated__/wallet/platform-dashboard-controller/platform-dashboard-controller';
import { AppDialog } from '@/components/common/AppDialog';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { useDashboardDialogLoadMore } from '../hooks/useDashboardDialogLoadMore';
import {
  getDashboardCursorNextPageParam,
  mergeDashboardVaultRankingPages,
} from '../utils/dashboardFormat';
import { DashboardVaultRankingTable } from './DashboardVaultRankingTable';

type DashboardVaultRankingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DashboardVaultRankingDialog({
  open,
  onOpenChange,
}: DashboardVaultRankingDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { handleSentinelRef, canFetchNextPage, markLoadMoreTriggered } =
    useDashboardDialogLoadMore(open);

  const requestParams = useMemo(() => ({ pageSize: DEFAULT_PAGE_SIZE }), []);
  const rankingQueryKey = useMemo(
    () =>
      [
        ...getActorVaultRankingQueryKey(requestParams),
        'dashboard-vault-ranking-dialog',
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
    queryKey: rankingQueryKey,
    queryFn: ({ pageParam, signal }) =>
      actorVaultRanking(
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
    () => mergeDashboardVaultRankingPages(data?.pages),
    [data?.pages],
  );

  useEffect(() => {
    if (open) {
      return;
    }

    queryClient.removeQueries({ queryKey: rankingQueryKey });
  }, [open, queryClient, rankingQueryKey]);

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
      title={t('角色 IP 金库排行')}
      width={800}
      maxHeight="90dvh"
    >
      <div className="flex flex-col gap-4">
        <DashboardVaultRankingTable
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
