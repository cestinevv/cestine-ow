import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import {
  getPointsLedgerQueryKey,
  pointsLedger,
} from '@/api/__generated__/wallet/activity-leaderboard/activity-leaderboard';
import type { PointsLedgerItem } from '@/api/__generated__/wallet/model/pointsLedgerItem';
import { AppDialog } from '@/components/common/AppDialog';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';
import { formatDateFromMillisecond } from '@/utils/formatDate';
import { formatNumber } from '@/utils/formatNumber';
import {
  getStory1011PointsLedgerNextPageParam,
  getStory1011PointsLedgerSourceLabelKey,
  mergeStory1011PointsLedgerPages,
  resolveStory1011ActivityConfig,
} from '../utils/story1011Format';

type Story1011PointsLedgerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 积分流水弹窗 — Figma 7352:40617 */
export function Story1011PointsLedgerDialog({
  open,
  onOpenChange,
}: Story1011PointsLedgerDialogProps) {
  const { t } = useTranslation();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const activityConfig = useConfigStore((state) => state.activityConfig);
  const activityId = resolveStory1011ActivityConfig(activityConfig)?.activityId;
  const { ref: loadMoreRef, inView } = useInView();

  const ledgerQueryKey = [
    ...getPointsLedgerQueryKey({
      activityId: activityId ?? 0,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    'story-1011-infinite',
  ] as const;

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ledgerQueryKey,
    queryFn: ({ pageParam, signal }) => {
      if (activityId == null) {
        return Promise.reject(new Error('Missing activityId'));
      }

      return pointsLedger(
        {
          activityId,
          pageSize: DEFAULT_PAGE_SIZE,
          mark: pageParam as number,
        },
        { signal },
      );
    },
    initialPageParam: 0,
    getNextPageParam: getStory1011PointsLedgerNextPageParam,
    enabled: open && isLogin && activityId != null,
  });

  const rows = mergeStory1011PointsLedgerPages(data?.pages);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  /** 关闭积分流水弹窗 */
  function handleConfirm() {
    onOpenChange(false);
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      width={500}
      bodyScroll={false}
      bodyClassName="flex flex-col gap-6 px-6 pb-6"
      title={t('积分记录')}
    >
      <p className="m-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
        {t('查看你的积分获取明细')}
      </p>

      <AppLoadingContainer
        data={rows}
        isLoading={isPending}
        isError={isError}
        minHeight={200}
        emptyDescription={t('暂无记录')}
      >
        <ul
          className={cn(
            'flex max-h-[280px] flex-col gap-4 overflow-y-auto',
            'm-0 list-none p-0',
          )}
        >
          {rows.map((item) => (
            <Story1011PointsLedgerRow
              key={`${item.createdAt ?? 'na'}-${item.sourceType ?? 'na'}-${item.points ?? 'na'}`}
              item={item}
            />
          ))}
          <li ref={loadMoreRef} className="flex justify-center py-1">
            {isFetchingNextPage ? <Spinner className="size-5" /> : null}
          </li>
        </ul>
      </AppLoadingContainer>

      <Button
        type="button"
        variant="outline"
        onClick={handleConfirm}
        className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
      >
        {t('知道了')}
      </Button>
    </AppDialog>
  );
}

function Story1011PointsLedgerRow({ item }: { item: PointsLedgerItem }) {
  const { t } = useTranslation();
  const labelKey = getStory1011PointsLedgerSourceLabelKey(item.sourceType);

  return (
    <li className="flex gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="m-0 text-sm leading-5 font-medium text-foreground">
          {labelKey ? t(labelKey) : (item.sourceType ?? '—')}
        </p>
        <p className="m-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
          {item.createdAt === undefined
            ? '—'
            : formatDateFromMillisecond(item.createdAt, 'YYYY/MM/DD HH:mm')}
        </p>
      </div>
      <p className="m-0 min-w-0 flex-1 text-right text-base leading-6 font-medium text-play-drama-stat-foreground">
        {item.points === undefined ? '—' : `+${formatNumber(item.points)}`}
      </p>
    </li>
  );
}
