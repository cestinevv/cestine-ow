import type { ColumnDef } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { UsdcIncomeLedgerItem } from '@/api/__generated__/wallet/model/usdcIncomeLedgerItem';
import { AppDateTimeText } from '@/components/common/AppDateTimeText';
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

import { getDashboardLedgerBizTypeKey } from '../utils/dashboardBizType';

type DashboardUsdcLedgerTableProps = {
  rows: UsdcIncomeLedgerItem[];
  isLoading?: boolean;
  isError?: boolean;
  minHeight?: number;
};

function DashboardUsdcLedgerList({
  rows,
  isLoading,
  isError,
  minHeight,
  emptyDescription,
}: {
  rows: UsdcIncomeLedgerItem[];
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
      <ul className="flex flex-col">
        {rows.map((row, index) => {
          const rowKey = `${row.time ?? 'ledger'}-${row.bizType ?? ''}-${index}`;

          return (
            <li
              key={rowKey}
              className={cn(
                'flex min-h-[60px] items-center justify-between gap-4 py-3',
                index < rows.length - 1 && 'border-b-[0.5px] border-border',
              )}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm leading-5 font-medium text-foreground">
                  {t(getDashboardLedgerBizTypeKey(row.bizType))}
                </span>
                <AppDateTimeText
                  value={row.time}
                  pattern="YYYY/MM/DD HH:mm"
                  layout="inline"
                  className="text-[10px] leading-3 tracking-[0.08px] text-muted-foreground"
                />
              </div>
              <span className="shrink-0 text-sm leading-5 font-medium text-primary">
                {row.amount === undefined
                  ? '-'
                  : `${formatNumber(row.amount, 4)} USDC`}
              </span>
            </li>
          );
        })}
      </ul>
    </AppLoadingContainer>
  );
}

export function DashboardUsdcLedgerTable({
  rows,
  isLoading = false,
  isError = false,
  minHeight = 200,
}: DashboardUsdcLedgerTableProps) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<UsdcIncomeLedgerItem>[]>(
    () => [
      {
        accessorKey: 'time',
        header: t('时间'),
        cell: ({ row }) => (
          <AppDateTimeText
            value={row.original.time}
            layout="responsive-split"
            className="text-[14px] leading-5 font-normal text-foreground"
          />
        ),
      },
      {
        accessorKey: 'bizType',
        header: t('交易类型'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 text-muted-foreground">
            {t(getDashboardLedgerBizTypeKey(row.original.bizType))}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: t('金额 (USDC)'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 font-medium text-primary">
            {row.original.amount === undefined
              ? '-'
              : `${formatNumber(row.original.amount, 4)} USDC`}
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
      `${row.time ?? 'ledger'}-${row.bizType ?? ''}-${index}`,
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const rowModelRows = table.getRowModel().rows;
  const columnCount = visibleColumns.length;

  return (
    <>
      <div className="md:hidden">
        <DashboardUsdcLedgerList
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
