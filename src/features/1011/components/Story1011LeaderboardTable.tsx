import type { ColumnDef } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';

import type { LeaderboardItem } from '@/api/__generated__/wallet/model/leaderboardItem';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/utils';
import { formatNumber } from '@/utils/formatNumber';
import { readSnowflakeId } from '@/utils/snowflakeId';
import { STORY_1011_LEADERBOARD_LIST_BODY_HEIGHT_PX } from '../constants/story1011Constants';
import { story1011RankMedals } from '../constants/story1011Media';
import { formatStory1011UserLabel } from '../utils/story1011Format';

type Story1011LeaderboardTableProps = {
  rows: LeaderboardItem[];
  isLoading: boolean;
  isError: boolean;
  currentUserIdText: string | undefined;
};

export function Story1011LeaderboardTable({
  rows,
  isLoading,
  isError,
  currentUserIdText,
}: Story1011LeaderboardTableProps) {
  const { t } = useTranslation();

  const columns: ColumnDef<LeaderboardItem>[] = [
    {
      id: 'rank',
      header: t('排名'),
      meta: { headerClassName: 'w-16', cellClassName: 'w-16' },
      cell: ({ row }) => {
        const rank = row.original.rank;
        const medal =
          rank === 1 || rank === 2 || rank === 3
            ? story1011RankMedals[rank]
            : undefined;

        if (medal) {
          return (
            <img
              src={medal}
              alt=""
              width={28}
              height={28}
              className="size-7 object-contain"
            />
          );
        }

        // 与前三奖牌同宽居中，纵向对齐
        return (
          <div
            className={cn(
              'flex size-7 items-center justify-center',
              'text-[15px] leading-5.5 text-foreground',
            )}
          >
            {rank === undefined ? '—' : formatNumber(rank)}
          </div>
        );
      },
    },
    {
      id: 'user',
      header: t('用户'),
      cell: ({ row }) => {
        const userIdText = readSnowflakeId(row.original.userId);
        const isMe =
          currentUserIdText !== undefined &&
          userIdText !== undefined &&
          currentUserIdText === userIdText;

        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[15px] leading-5.5 text-foreground">
              {formatStory1011UserLabel(
                row.original.userId,
                row.original.nickname,
              )}
            </span>
            {isMe ? (
              <span
                className={cn(
                  // Figma 6962:46919：bg secondary #f0f0f3 / rounded-3 / 12 Medium
                  'shrink-0 rounded-[3px] bg-muted px-1 py-0.5',
                  'text-xs leading-4 font-medium tracking-[0.04px] text-muted-foreground',
                )}
              >
                {t('你')}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'points',
      header: t('积分'),
      meta: { headerClassName: 'w-[72px]', cellClassName: 'w-[72px]' },
      cell: ({ row }) => (
        <span className="text-[15px] leading-5.5 text-foreground">
          {row.original.totalPoints === undefined
            ? '—'
            : formatNumber(row.original.totalPoints)}
        </span>
      ),
    },
    {
      id: 'reward',
      header: t('奖励'),
      meta: { headerClassName: 'w-[96px]', cellClassName: 'w-[96px]' },
      cell: ({ row }) => (
        <span className="text-[15px] leading-5.5 font-medium text-story-checkin-accent">
          {row.original.rewardAmount == null
            ? '—'
            : `$${formatNumber(row.original.rewardAmount)}`}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // 不用 Table 外层 overflow-x-auto：会截断 sticky，表头无法相对侧栏滚动区置顶
  return (
    <div className="relative w-full">
      <table className="w-full table-fixed caption-bottom text-sm">
        <TableHeader className="[&_tr]:border-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-0 hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  | { headerClassName?: string }
                  | undefined;

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      // Layout & Positioning — 相对列表滚动容器置顶
                      'sticky top-0 z-10',
                      // Sizing & Spacing — 表头 12 Regular + 与首行 gap-12
                      'h-auto px-0 py-0 pb-3',
                      header.id === 'user' ? 'pr-2' : undefined,
                      // Visuals & Typography
                      'bg-card text-left align-middle text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground',
                      meta?.headerClassName,
                    )}
                  >
                    {flexRender(
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
            data={rows}
            isLoading={isLoading}
            isError={isError}
            asTable
            colSpan={4}
            minHeight={STORY_1011_LEADERBOARD_LIST_BODY_HEIGHT_PX}
          >
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-0 hover:bg-transparent">
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { cellClassName?: string }
                    | undefined;

                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        // 行内容 22 + 上下各 6 → 行间距约 12（稿面 gap-12）
                        'px-0 py-1.5 align-middle',
                        cell.column.id === 'user' ? 'pr-2' : undefined,
                        meta?.cellClassName,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </AppLoadingContainer>
        </TableBody>
      </table>
    </div>
  );
}
