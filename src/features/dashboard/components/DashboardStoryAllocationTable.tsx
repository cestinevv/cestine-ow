import type { ColumnDef } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useTotalReleased } from '@/api/__generated__/mining/mining/mining';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { useConfigStore } from '@/stores/config';
import { cn, formatNumber } from '@/utils';

import { formatDashboardStoryReleaseProgress } from '../utils/dashboardFormat';
import type { DashboardStoryAllocationRow } from '../utils/dashboardStoryAllocation';
import {
  buildDashboardStoryAllocationRows,
  formatDashboardStoryTotalSupplyLabel,
} from '../utils/dashboardStoryAllocation';
import {
  DashboardMobileKvCard,
  type DashboardMobileKvRow,
} from './DashboardMobileKvCard';

function getAllocationTitle(
  row: DashboardStoryAllocationRow,
  t: (key: string) => string,
): string {
  if (row.id === 'nftMiningPool') {
    return `NFT ${t('挖矿池')}`;
  }
  return t(row.titleKey);
}

function buildAllocationKvRows(
  row: DashboardStoryAllocationRow,
  t: (key: string) => string,
  releasedLabel: string,
  progressLabel: string,
): DashboardMobileKvRow[] {
  return [
    {
      label: t('分配对象'),
      value: getAllocationTitle(row, t),
    },
    {
      label: t('比例'),
      value:
        row.percent === undefined ? '-' : `${formatNumber(row.percent, 0)}%`,
    },
    {
      label: t('数量'),
      value: row.amountLabel,
    },
    {
      label: t('已释放'),
      value: releasedLabel,
      valueClassName: 'text-primary',
    },
    {
      label: t('释放进度'),
      value: progressLabel,
    },
  ];
}

/** 已释放 / 释放进度与 totalReleased 请求同拍：未就绪 `-`，就绪后非挖矿池行落 0 / 0% */
function getAllocationReleaseLabels(
  row: DashboardStoryAllocationRow,
  isReleasedReady: boolean,
  nftReleasedLabel: string,
  nftProgressLabel: string,
): { releasedLabel: string; progressLabel: string } {
  if (!isReleasedReady) {
    return { releasedLabel: '-', progressLabel: '-' };
  }

  if (row.id === 'nftMiningPool') {
    return {
      releasedLabel: nftReleasedLabel,
      progressLabel: nftProgressLabel,
    };
  }

  return { releasedLabel: '0', progressLabel: '0%' };
}

export function DashboardStoryAllocationTable() {
  const { t } = useTranslation();
  const mining = useConfigStore((state) => state.initConfig?.mining);

  const totalReleasedQuery = useTotalReleased({
    query: { retry: false },
  });
  const totalReleased = unwrapOrvalPayload<number>(totalReleasedQuery.data);

  // 与 totalReleased 同拍：未成功前整列 `-`；成功后挖矿池用实值，其余行占位 0 / 0%
  const isReleasedReady = totalReleasedQuery.isSuccess;
  const releasedAmount = isReleasedReady ? (totalReleased ?? 0) : undefined;

  // 始终 6 行轮廓；配置未就绪时比例/数量等为 `-`
  const rows = useMemo(
    () => buildDashboardStoryAllocationRows(mining),
    [mining],
  );

  const nftMiningPoolAmount = rows.find(
    (row) => row.id === 'nftMiningPool',
  )?.amount;

  const nftReleasedLabel = isReleasedReady
    ? formatNumber(releasedAmount, 2)
    : '-';

  // NFT 挖矿池：已释放 / 分配数量 × 100%
  const nftProgressLabel =
    !isReleasedReady || nftMiningPoolAmount === undefined
      ? '-'
      : formatDashboardStoryReleaseProgress(
          releasedAmount,
          nftMiningPoolAmount,
        );

  const columns = useMemo<ColumnDef<DashboardStoryAllocationRow>[]>(
    () => [
      {
        id: 'target',
        header: t('分配对象'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 text-foreground">
            {getAllocationTitle(row.original, t)}
          </span>
        ),
      },
      {
        accessorKey: 'percent',
        header: t('比例'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 text-foreground">
            {row.original.percent === undefined
              ? '-'
              : `${formatNumber(row.original.percent, 0)}%`}
          </span>
        ),
      },
      {
        accessorKey: 'amountLabel',
        header: t('数量'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 text-foreground">
            {row.original.amountLabel}
          </span>
        ),
      },
      {
        id: 'released',
        header: t('已释放'),
        cell: ({ row }) => {
          const { releasedLabel } = getAllocationReleaseLabels(
            row.original,
            isReleasedReady,
            nftReleasedLabel,
            nftProgressLabel,
          );

          return (
            <span className="text-[14px] leading-5 font-medium text-primary">
              {releasedLabel}
            </span>
          );
        },
      },
      {
        id: 'progress',
        header: t('释放进度'),
        cell: ({ row }) => {
          const { progressLabel } = getAllocationReleaseLabels(
            row.original,
            isReleasedReady,
            nftReleasedLabel,
            nftProgressLabel,
          );

          return (
            <span className="text-[14px] leading-5 text-muted-foreground">
              {progressLabel}
            </span>
          );
        },
      },
    ],
    [isReleasedReady, nftProgressLabel, nftReleasedLabel, t],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const rowModelRows = table.getRowModel().rows;
  const totalLabel = formatDashboardStoryTotalSupplyLabel(mining?.totalSupply);

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-4 md:gap-6 md:p-8',
        'rounded-2xl border border-white bg-card md:border-0',
      )}
    >
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <h3 className="text-base leading-5 font-bold text-foreground md:text-lg md:leading-[26px]">
          {t('STORY 总量分配')}
        </h3>
        <p
          className={cn(
            'inline-flex h-8 w-fit items-center rounded-full border border-border px-4',
            'text-sm leading-5 text-muted-foreground md:h-auto md:rounded-none md:border-0 md:px-0',
          )}
        >
          {t('总量')} {totalLabel} STORY
        </p>
      </div>

      <div className="md:hidden">
        <div className="flex flex-col gap-4">
          {rows.map((row, index) => {
            const { releasedLabel, progressLabel } = getAllocationReleaseLabels(
              row,
              isReleasedReady,
              nftReleasedLabel,
              nftProgressLabel,
            );

            return (
              <DashboardMobileKvCard
                key={row.id}
                rows={buildAllocationKvRows(
                  row,
                  t,
                  releasedLabel,
                  progressLabel,
                )}
                isLast={index === rows.length - 1}
              />
            );
          })}
        </div>
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
            {rowModelRows.map((row) => (
              <TableRow
                key={row.id}
                className="border-b-[0.5px] border-border hover:bg-transparent"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="h-[52px] px-4 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
