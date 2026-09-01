import { useTranslation } from 'react-i18next';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/utils';

const headerCell = cn(
  'align-middle font-bold',
  'text-sm leading-6 tracking-[-0.1px] text-foreground',
  'md:text-base md:leading-[26px] md:tracking-[-0.08px]',
);

const bodyCell = cn(
  'align-middle font-normal',
  'text-sm leading-6 tracking-[-0.1px] text-foreground',
  'md:text-base md:leading-[26px] md:tracking-[-0.08px]',
);

function cellPadding(columnIndex: number, columnCount: number) {
  if (columnCount <= 1) return 'px-4 py-3 md:px-5 md:py-4';
  if (columnIndex === 0) return 'px-4 py-3 pr-2 md:px-5 md:py-4 md:pr-3';
  if (columnIndex === columnCount - 1) {
    return 'px-2 py-3 pl-2 md:px-3 md:py-4 md:pl-3 md:pr-5';
  }
  return 'px-2 py-3 md:px-3 md:py-4';
}

type WhitepaperBorderedTableProps = {
  headerKeys: readonly string[];
  /** 每行单元格为 i18n key，列数须与 headerKeys 一致；空单元格使用单个空格 key `" "` */
  rowKeys: readonly (readonly string[])[];
  /** Figma 多数表头居中；body 默认左对齐 */
  headerAlign?: 'left' | 'center';
  bodyAlign?: 'left' | 'center';
};

/** 白皮书正文栅格表格（与返佣表视觉一致） */
export function WhitepaperBorderedTable({
  headerKeys,
  rowKeys,
  headerAlign = 'center',
  bodyAlign = 'left',
}: WhitepaperBorderedTableProps) {
  const { t } = useTranslation();
  const columnCount = headerKeys.length;
  const headerAlignClass =
    headerAlign === 'center' ? 'text-center' : 'text-left';
  const bodyAlignClass = bodyAlign === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="w-full overflow-hidden bg-background">
      <Table
        className={cn('w-full min-w-0 table-fixed md:table-auto', 'text-sm')}
      >
        <TableHeader
          className={cn('[&_tr]:border-border [&_tr:hover]:bg-transparent')}
        >
          <TableRow
            className={cn('border-b border-border', 'hover:bg-transparent')}
          >
            {headerKeys.map((key, columnIndex) => {
              const padding = cellPadding(columnIndex, columnCount);

              return (
                <TableHead
                  key={key}
                  className={cn(
                    'h-auto',
                    padding,
                    headerCell,
                    headerAlignClass,
                    'border border-border',
                    'whitespace-normal',
                  )}
                >
                  {t(key)}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowKeys.map((row) => {
            const rowKey = row.join('||');

            return (
              <TableRow
                key={rowKey}
                className={cn(
                  'border-b border-border last:border-b-0',
                  'hover:bg-transparent',
                )}
              >
                {row.map((cellKey, columnIndex) => {
                  const headerForColumn = headerKeys[columnIndex] ?? cellKey;
                  const padding = cellPadding(columnIndex, columnCount);

                  return (
                    <TableCell
                      key={`${headerForColumn}|${cellKey}`}
                      className={cn(
                        padding,
                        bodyCell,
                        bodyAlignClass,
                        'border border-border',
                        'whitespace-normal',
                      )}
                    >
                      {cellKey === ' ' ? '\u00a0' : t(cellKey)}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
