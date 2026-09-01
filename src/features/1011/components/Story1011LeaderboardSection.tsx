import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import {
  getLeaderboardQueryKey,
  leaderboard,
} from '@/api/__generated__/wallet/activity-leaderboard/activity-leaderboard';
import type { MyRankResponse } from '@/api/__generated__/wallet/model/myRankResponse';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';
import { formatNumber } from '@/utils/formatNumber';
import { readSnowflakeId } from '@/utils/snowflakeId';
import { STORY_1011_LEADERBOARD_LIST_VIEWPORT_HEIGHT_PX } from '../constants/story1011Constants';
import {
  getStory1011LeaderboardNextPageParam,
  mergeStory1011LeaderboardPages,
  resolveStory1011ActivityConfig,
} from '../utils/story1011Format';
import { Story1011LeaderboardTable } from './Story1011LeaderboardTable';

type Story1011LeaderboardSectionProps = {
  myRank: MyRankResponse | undefined;
  /** 嵌入 Tab 时去掉 section 外壳与标题 */
  embedded?: boolean;
};

export function Story1011LeaderboardSection({
  myRank,
  embedded = false,
}: Story1011LeaderboardSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const currentUserId = useGlobalStore((state) => state.userProfile?.userId);
  const currentUserIdText = readSnowflakeId(currentUserId);
  const activityConfig = useConfigStore((state) => state.activityConfig);
  const activityId = resolveStory1011ActivityConfig(activityConfig)?.activityId;
  const { ref: loadMoreRef, inView } = useInView();

  const leaderboardQueryKey = useMemo(
    () =>
      [
        ...getLeaderboardQueryKey({
          activityId: activityId ?? 0,
          pageSize: DEFAULT_PAGE_SIZE,
        }),
        'story-1011-infinite',
      ] as const,
    [activityId],
  );

  const previousTotalPointsRef = useRef<number | undefined>(undefined);

  /** Hero / 我的排名积分变动后，同步刷新排行榜列表（跳过首屏 myRank 初次赋值） */
  useEffect(() => {
    const totalPoints = myRank?.totalPoints;

    if (
      previousTotalPointsRef.current === undefined &&
      totalPoints === undefined
    ) {
      return;
    }

    if (previousTotalPointsRef.current === totalPoints) {
      return;
    }

    const hadPreviousPoints = previousTotalPointsRef.current !== undefined;
    previousTotalPointsRef.current = totalPoints;

    if (!hadPreviousPoints) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: leaderboardQueryKey });
  }, [myRank?.totalPoints, queryClient, leaderboardQueryKey]);

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: leaderboardQueryKey,
    queryFn: ({ pageParam, signal }) => {
      if (activityId == null) {
        return Promise.reject(new Error('Missing activityId'));
      }

      return leaderboard(
        {
          activityId,
          pageSize: DEFAULT_PAGE_SIZE,
          mark: pageParam as number,
        },
        { signal },
      );
    },
    initialPageParam: 0,
    getNextPageParam: getStory1011LeaderboardNextPageParam,
    enabled: isLogin && activityId != null,
  });

  const rows = mergeStory1011LeaderboardPages(data?.pages);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const inner = (
    <>
      <div className="flex w-full flex-col gap-6">
        {embedded ? null : (
          <h2 className="m-0 text-lg leading-6.5 font-bold tracking-[-0.04px] text-foreground">
            {t('排行榜')}
          </h2>
        )}

        <div
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border border-story-checkin-accent/16',
            'bg-story-checkin-accent/5 p-4 text-center',
          )}
        >
          <MyRankStat
            value={myRank?.rank == null ? '—' : formatNumber(myRank.rank)}
            label={t('排名')}
          />
          <MyRankStat
            value={
              myRank?.totalPoints == null
                ? '—'
                : formatNumber(myRank.totalPoints)
            }
            label={t('积分')}
          />
          <MyRankStat
            value={
              myRank?.rewardAmount == null
                ? '—'
                : `$${formatNumber(myRank.rewardAmount)}`
            }
            label={t('奖励')}
          />
        </div>
      </div>

      <div
        className="shrink-0 overflow-y-auto"
        style={{ height: STORY_1011_LEADERBOARD_LIST_VIEWPORT_HEIGHT_PX }}
      >
        <Story1011LeaderboardTable
          rows={rows}
          isLoading={isPending}
          isError={isError}
          currentUserIdText={currentUserIdText}
        />

        <div ref={loadMoreRef} className="flex h-8 items-center justify-center">
          {isFetchingNextPage ? <Spinner className="size-4" /> : null}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex w-full flex-col gap-4">{inner}</div>;
  }

  return (
    <section
      className={cn(
        // Layout & Positioning
        'flex w-full shrink-0 flex-col lg:w-125',
        // Sizing & Spacing — Figma 7026:36408：p-24 / gap-16 / rounded-12
        'gap-4 rounded-xl border border-story-checkin-accent/16 bg-card p-5 lg:p-6',
      )}
    >
      {inner}
    </section>
  );
}

function MyRankStat({ value, label }: { value: string; label: string }) {
  // formatNumber 空值返回 '-'，与模块占位符 '—' 统一视觉
  const displayValue = value === '-' ? '—' : value;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-base leading-6 font-bold text-foreground">
        {displayValue}
      </span>
      <span className="text-xs leading-4 font-medium tracking-[0.04px] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
