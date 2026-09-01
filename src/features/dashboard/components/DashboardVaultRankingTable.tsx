import type { ColumnDef } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { ActorVaultRanking } from '@/api/__generated__/wallet/model/actorVaultRanking';
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
import { readSnowflakeId } from '@/utils/snowflakeId';

type DashboardVaultRankingTableProps = {
  rows: ActorVaultRanking[];
  isLoading?: boolean;
  isError?: boolean;
  minHeight?: number;
};

function DashboardVaultRankingList({
  rows,
  isLoading,
  isError,
  minHeight,
  emptyDescription,
}: {
  rows: ActorVaultRanking[];
  isLoading: boolean;
  isError: boolean;
  minHeight: number;
  emptyDescription: string;
}) {
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
          const actorIdText = readSnowflakeId(row.actorId);
          const rowKey = `${actorIdText ?? 'rank'}-${row.rank ?? index}-${index}`;
          const actorName = row.actorName?.trim() || '-';

          return (
            <li
              key={rowKey}
              className={cn(
                'flex min-h-[60px] items-center justify-between gap-4 py-3',
                index < rows.length - 1 && 'border-b-[0.5px] border-border',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 text-sm leading-5 text-foreground">
                  {row.rank ?? '-'}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm leading-5 font-medium text-foreground">
                    {actorName}
                  </span>
                  {actorIdText ? (
                    <span className="text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
                      #{actorIdText}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-sm leading-5 font-medium text-primary">
                {row.vault === undefined
                  ? '-'
                  : `${formatNumber(row.vault, 4)} USDC`}
              </span>
            </li>
          );
        })}
      </ul>
    </AppLoadingContainer>
  );
}

export function DashboardVaultRankingTable({
  rows,
  isLoading = false,
  isError = false,
  minHeight = 200,
}: DashboardVaultRankingTableProps) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<ActorVaultRanking>[]>(
    () => [
      {
        accessorKey: 'rank',
        header: '#',
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 text-foreground">
            {row.original.rank ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'actorName',
        header: t('角色 IP'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 text-muted-foreground">
            {row.original.actorName?.trim() || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'actorId',
        header: t('编号'),
        cell: ({ row }) => {
          const actorIdText = readSnowflakeId(row.original.actorId);

          return (
            <span className="text-[14px] leading-5 text-muted-foreground">
              {actorIdText ? `#${actorIdText}` : '-'}
            </span>
          );
        },
      },
      {
        accessorKey: 'vault',
        header: t('金库资金 (USDC)'),
        cell: ({ row }) => (
          <span className="text-[14px] leading-5 font-medium text-primary">
            {row.original.vault === undefined
              ? '-'
              : `${formatNumber(row.original.vault, 4)} USDC`}
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
      `${readSnowflakeId(row.actorId) ?? 'rank'}-${row.rank ?? index}-${index}`,
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const rowModelRows = table.getRowModel().rows;
  const columnCount = visibleColumns.length;

  return (
    <>
      <div className="md:hidden">
        <DashboardVaultRankingList
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
