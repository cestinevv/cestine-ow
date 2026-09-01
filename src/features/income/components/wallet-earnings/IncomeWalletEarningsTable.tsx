import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { AppDateTimeText } from '@/components/common/AppDateTimeText';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import {
  AppTruncatedText,
  TABLE_TRUNCATE_CELL_CLASS,
} from '@/components/common/AppTruncatedText';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getIncomeWalletEarningsSourceDisplay,
  type IncomeWalletEarningsRow,
} from '@/features/income/incomeWalletEarningsFormat';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { cn, formatNumber } from '@/utils';
import { IncomeWalletEarningsListSentinel } from './IncomeWalletEarningsListSentinel';
import { IncomeWalletEarningsMobileList } from './IncomeWalletEarningsMobileList';
import { IncomeWalletEarningsTypeBadge } from './IncomeWalletEarningsTypeBadge';

export type IncomeWalletEarningsListFooterState = {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  visible: boolean;
  fetchNextPage: () => void;
};

type IncomeWalletEarningsTableProps = {
  rows: IncomeWalletEarningsRow[];
  isLoading?: boolean;
  isError?: boolean;
  listFooter?: IncomeWalletEarningsListFooterState;
};

const cellText = cn(
  'text-sm leading-5 font-normal tracking-[0px] text-wallet-text-secondary',
);

const amountText = cn(
  'text-sm leading-5 font-medium tracking-[0px] text-language-switcher-active',
);

/** Figma 4995:55362 四列等宽（420 / 1680） */
const earningsColumnWidthClassName = 'w-1/4';

const earningsCellPaddingClassName = 'px-4';

function getEarningsColumnClassName(columnId: string) {
  const isAmountColumn = columnId === 'amount';
  const isSourceColumn = columnId === 'source';

  return cn(
    earningsColumnWidthClassName,
    earningsCellPaddingClassName,
    isAmountColumn ? 'text-right' : 'text-left',
    isSourceColumn && TABLE_TRUNCATE_CELL_CLASS,
  );
}

export function IncomeWalletEarningsTable({
  rows,
  isLoading = false,
  isError = false,
  listFooter,
}: IncomeWalletEarningsTableProps) {
  const { t } = useTranslation();
  const isMobile = useMobileViewport();

  const columns = useMemo<ColumnDef<IncomeWalletEarningsRow>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: t('时间'),
        cell: ({ row }) => (
          <AppDateTimeText
            value={row.original.createdAt}
            pattern="YYYY-MM-DD HH:mm"
            layout="responsive-split"
            className={cellText}
          />
        ),
      },
      {
        accessorKey: 'typeLabelKey',
        header: t('类型'),
        cell: ({ row }) => (
          <IncomeWalletEarningsTypeBadge
            labelKey={row.original.typeLabelKey}
            variant={row.original.badgeVariant}
          />
        ),
      },
      {
        accessorKey: 'source',
        header: t('来源'),
        cell: ({ row }) => (
          <AppTruncatedText className={cellText}>
            {getIncomeWalletEarningsSourceDisplay(row.original)}
          </AppTruncatedText>
        ),
      },
      {
        accessorKey: 'amount',
        header: () => (
          <span className="block w-full text-right">{t('数量')}</span>
        ),
        cell: ({ row }) => (
          <span
            className={cn(amountText, 'block whitespace-nowrap text-right')}
          >
            {row.original.amount !== undefined
              ? `${formatNumber(row.original.amount, 2)} ${row.original.assetCode}`
              : '-'}
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
    getRowId: (row) => row.id,
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const rowModelRows = table.getRowModel().rows;
  const columnCount = visibleColumns.length;

  return (
    <>
      <div className="w-full min-w-0 md:hidden">
        <IncomeWalletEarningsMobileList
          rows={rows}
          isLoading={isLoading}
          isError={isError}
        />
        {listFooter && isMobile ? (
          <IncomeWalletEarningsListSentinel
            visible={listFooter.visible}
            isFetchingNextPage={listFooter.isFetchingNextPage}
            hasNextPage={listFooter.hasNextPage}
            fetchNextPage={listFooter.fetchNextPage}
            showTopBorder={false}
            className="min-h-15 border-t-0 py-0"
          />
        ) : null}
      </div>

      <section
        className={cn(
          'hidden w-full min-w-0 rounded-3xl bg-card p-8',
          'md:block',
        )}
      >
        <div
          className={cn(
            'w-full min-w-0 overflow-hidden rounded-xl border border-history-border',
          )}
        >
          <div className="w-full min-w-0 overflow-x-auto">
            <Table className={cn('w-full table-fixed text-sm')}>
              <TableHeader
                className={cn('[&_tr]:border-0 [&_tr:hover]:bg-transparent')}
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-0 hover:bg-transparent"
                  >
                    {headerGroup.headers.map((header) => {
                      const isAmountColumn = header.column.id === 'amount';

                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            'h-14 bg-points-page-surface-muted',
                            getEarningsColumnClassName(header.column.id),
                            isAmountColumn
                              ? 'align-bottom pb-5 pt-5'
                              : 'py-0 align-middle',
                            'text-xs leading-4 font-medium tracking-[0.04px] text-wallet-text-secondary',
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      );
                    })}
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
                  minHeight={280}
                >
                  {rowModelRows.map((row, rowIndex) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        'border-0 hover:bg-transparent',
                        rowIndex < rowModelRows.length - 1 &&
                          'border-b-[0.5px] border-history-border',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            'align-middle py-4',
                            getEarningsColumnClassName(cell.column.id),
                          )}
                        >
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
          {listFooter && !isMobile ? (
            <IncomeWalletEarningsListSentinel
              visible={listFooter.visible}
              isFetchingNextPage={listFooter.isFetchingNextPage}
              hasNextPage={listFooter.hasNextPage}
              fetchNextPage={listFooter.fetchNextPage}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
