import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getGetLedgerQueryKey,
  getLedger,
} from '@/api/__generated__/wallet/platform-dashboard-controller/platform-dashboard-controller';
import { AppDialog } from '@/components/common/AppDialog';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { useDashboardDialogLoadMore } from '../hooks/useDashboardDialogLoadMore';
import {
  getDashboardCursorNextPageParam,
  mergeDashboardLedgerPages,
} from '../utils/dashboardFormat';
import { DashboardUsdcLedgerTable } from './DashboardUsdcLedgerTable';

type DashboardUsdcLedgerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DashboardUsdcLedgerDialog({
  open,
  onOpenChange,
}: DashboardUsdcLedgerDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { handleSentinelRef, canFetchNextPage, markLoadMoreTriggered } =
    useDashboardDialogLoadMore(open);

  const requestParams = useMemo(() => ({ pageSize: DEFAULT_PAGE_SIZE }), []);
  const ledgerQueryKey = useMemo(
    () =>
      [
        ...getGetLedgerQueryKey(requestParams),
        'dashboard-ledger-dialog',
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
    queryKey: ledgerQueryKey,
    queryFn: ({ pageParam, signal }) =>
      getLedger(
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
    () => mergeDashboardLedgerPages(data?.pages),
    [data?.pages],
  );

  useEffect(() => {
    if (open) {
      return;
    }

    queryClient.removeQueries({ queryKey: ledgerQueryKey });
  }, [open, queryClient, ledgerQueryKey]);

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
      title={t('近期 USDC 收入流水')}
      width={800}
      maxHeight="90dvh"
    >
      <div className="flex flex-col gap-4">
        <DashboardUsdcLedgerTable
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
