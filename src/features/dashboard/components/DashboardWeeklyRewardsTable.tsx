import type { ColumnDef } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { WeeklyRewardsDTO } from '@/api/__generated__/mining/model/weeklyRewardsDTO';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatNumber } from '@/utils';

import {
  formatDashboardRewardPeriod,
  formatDashboardUsageRate,
} from '../utils/dashboardFormat';
import {
  DashboardMobileKvCard,
  type DashboardMobileKvRow,
} from './DashboardMobileKvCard';

type DashboardWeeklyRewardsTableProps = {
  rows: WeeklyRewardsDTO[];
  isLoading?: boolean;
  isError?: boolean;
  minHeight?: number;
};

function buildWeeklyRewardKvRows(
  row: WeeklyRewardsDTO,
  t: (key: string) => string,
): DashboardMobileKvRow[] {
  return [
    {
      label: t('周期'),
      value: formatDashboardRewardPeriod(
        row.rewardPeriodStart,
        row.rewardPeriodEnd,
      ),
    },
    {
      label: t('周硬顶'),
      value: row.hardLimit === undefined ? '-' : formatNumber(row.hardLimit, 1),
    },
    {
      label: t('质押挖矿'),
      value:
        row.miningRewards === undefined
          ? '-'
          : formatNumber(row.miningRewards, 1),
    },
    {
      label: t('邀请挖矿'),
      value:
        row.inviteRewards === undefined
          ? '-'
          : formatNumber(row.inviteRewards, 1),
    },
    {
      label: t('使用率'),
      value: formatDashboardUsageRate(row),
    },
  ];
}

function DashboardWeeklyRewardsKvList({
  rows,
  isLoading,
  isError,
  minHeight,
  emptyDescription,
}: {
  rows: WeeklyRewardsDTO[];
  isLoading: boolean;
  isError: boolean;
  minHeight: number;
  emptyDescription: string;
}) {
  const { t } = useTranslation();

  return (
    <AppLoadingContainer
      data={rows}
      isLoading={isLoading}
      isError={isError}
      minHeight={minHeight}
      emptyDescription={emptyDescription}
      scrollable={false}
    >
      <div className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const rowKey = `${row.rewardPeriodStart ?? 'week'}-${row.rewardPeriodEnd ?? index}-${index}`;

          return (
            <DashboardMobileKvCard
              key={rowKey}
              rows={buildWeeklyRewardKvRows(row, t)}
              isLast={index === rows.length - 1}
            />
          );
        })}
      </div>
    </AppLoadingContainer>
  );
}

export function DashboardWeeklyRewardsTable({
  rows,
  isLoading = false,
  isError = false,
  minHeight = 200,
}: DashboardWeeklyRewardsTableProps) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<WeeklyRewardsDTO>[]>(
    () => [
      {
        id: 'period',
        header: t('周期'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 text-muted-foreground">
            {formatDashboardRewardPeriod(
              row.original.rewardPeriodStart,
              row.original.rewardPeriodEnd,
            )}
          </span>
        ),
      },
      {
        accessorKey: 'hardLimit',
        header: t('周硬顶'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 text-muted-foreground">
            {row.original.hardLimit === undefined
              ? '-'
              : formatNumber(row.original.hardLimit, 1)}
          </span>
        ),
      },
      {
        accessorKey: 'miningRewards',
        header: t('质押挖矿'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 font-medium text-primary">
            {row.original.miningRewards === undefined
              ? '-'
              : formatNumber(row.original.miningRewards, 1)}
          </span>
        ),
      },
      {
        accessorKey: 'inviteRewards',
        header: t('邀请挖矿'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 font-medium text-primary">
            {row.original.inviteRewards === undefined
              ? '-'
              : formatNumber(row.original.inviteRewards, 1)}
          </span>
        ),
      },
      {
        id: 'usageRate',
        header: t('使用率'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 text-muted-foreground">
            {formatDashboardUsageRate(row.original)}
          </span>
        ),
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) =>
      `${row.rewardPeriodStart ?? 'week'}-${row.rewardPeriodEnd ?? index}-${index}`,
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const rowModelRows = table.getRowModel().rows;
  const columnCount = visibleColumns.length;

  return (
    <>
      <div className="md:hidden">
        <DashboardWeeklyRewardsKvList
          rows={rows}
          isLoading={isLoading}
          isError={isError}
          minHeight={minHeight}
          emptyDescription={t('暂无记录')}
        />
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <Table className="w-full text-sm">
          <TableHeader className="[&_tr]:border-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-0 bg-muted hover:bg-muted"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'h-14 px-4 py-5',
                      'text-xs leading-4 font-medium tracking-[0.04px] text-muted-foreground',
                    )}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <AppLoadingContainer
              asTable
              colSpan={columnCount}
              data={rowModelRows}
              isLoading={isLoading}
              isError={isError}
              minHeight={minHeight}
              emptyDescription={t('暂无记录')}
            >
              {rowModelRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b-[0.5px] border-border hover:bg-transparent"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="h-[52px] px-4 py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </AppLoadingContainer>
          </TableBody>
        </Table>
      </div>
    </>
  );
}
