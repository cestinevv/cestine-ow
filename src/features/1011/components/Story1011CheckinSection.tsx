import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getMyRankQueryKey } from '@/api/__generated__/wallet/activity-leaderboard/activity-leaderboard';
import type { CheckinResponse } from '@/api/__generated__/wallet/model/checkinResponse';
import type { CheckinWeeklyResponse } from '@/api/__generated__/wallet/model/checkinWeeklyResponse';
import type { DayCheckinVO } from '@/api/__generated__/wallet/model/dayCheckinVO';
import {
  getGetWeeklySignInfoQueryKey,
  useDailyCheckin,
  useGetWeeklySignInfo,
} from '@/api/__generated__/wallet/story-checkin/story-checkin';
import IconCircleCheck from '@/assets/svg/IconCircleCheck';
import IconCircleX from '@/assets/svg/IconCircleX';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import { GameDialogSubmitLabel } from '@/features/game/components/GameDialogSubmitLabel';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';
import { formatNumber } from '@/utils/formatNumber';

import { story1011Media } from '../constants/story1011Media';
import {
  getStory1011AccentSubmitButtonVisualClassName,
  STORY_1011_CHECKIN_SIGNED_CONTROL_CLASS,
} from '../utils/story1011AccentSubmitButton';
import {
  getStory1011CheckinDayPoints,
  getStory1011DayState,
  resolveStory1011ActivityConfig,
  Story1011CheckinDayState,
} from '../utils/story1011Format';
import { Story1011PointsRewardDialog } from './Story1011PointsRewardDialog';

type Story1011CheckinSectionProps = {
  /** 嵌入 Hero 区紧凑卡片：仅白卡片外壳，无外层 section */
  embedded?: boolean;
};

export function Story1011CheckinSection({
  embedded = false,
}: Story1011CheckinSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const activityConfig = useConfigStore((state) => state.activityConfig);
  const story1011ActivityConfig =
    resolveStory1011ActivityConfig(activityConfig);
  const activityId = story1011ActivityConfig?.activityId;
  const checkinDailyPoints = story1011ActivityConfig?.checkinDailyPoints;
  const weeklyQuery = useGetWeeklySignInfo(activityId ?? 0, {
    query: { enabled: isLogin && activityId != null },
  });
  const checkinMutation = useDailyCheckin();
  const [isRewardOpen, setIsRewardOpen] = useState(false);
  const [rewardPoints, setRewardPoints] = useState<number | undefined>();
  const isClaiming = checkinMutation.isPending;

  const weekly = unwrapOrvalPayload<CheckinWeeklyResponse>(weeklyQuery.data);
  const records = weekly?.checkinRecords ?? [];

  const hasClaimableDay = records.some(
    (record) =>
      getStory1011DayState(record) === Story1011CheckinDayState.Claimable,
  );

  const hasSignedToday = records.some((record) => {
    if (!record.isSigned || !record.date?.trim()) {
      return false;
    }

    const parsed = new Date(record.date);

    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    const now = new Date();

    return (
      parsed.getFullYear() === now.getFullYear() &&
      parsed.getMonth() === now.getMonth() &&
      parsed.getDate() === now.getDate()
    );
  });

  /** 签到成功：刷新周签到与排名，并弹出积分奖励 */
  async function handleClaim() {
    if (activityId == null) {
      return;
    }

    try {
      const response = await checkinMutation.mutateAsync({
        activityId,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getGetWeeklySignInfoQueryKey(activityId),
        }),
        queryClient.invalidateQueries({
          queryKey: getMyRankQueryKey({
            activityId,
          }),
        }),
      ]);

      const result = unwrapOrvalPayload<CheckinResponse>(response);
      setRewardPoints(result?.points);
      setIsRewardOpen(true);
    } catch {
      /* appAxiosInstance 已 toast */
    }
  }

  const compactInner = (
    <>
      <h2 className="m-0 text-base leading-6 font-bold tracking-normal text-foreground">
        {t('每日签到')}
      </h2>

      <AppLoadingContainer
        data={records}
        isLoading={weeklyQuery.isPending}
        isError={weeklyQuery.isError}
        minHeight={100}
        scrollable={false}
      >
        <CheckinTimelineRow
          records={records}
          checkinDailyPoints={checkinDailyPoints}
        />
      </AppLoadingContainer>

      {hasClaimableDay ? (
        <Button
          type="button"
          disabled={isClaiming}
          onClick={handleClaim}
          className={cn(
            'h-auto w-full rounded px-3 py-1.5',
            'text-sm leading-5 font-bold',
            getStory1011AccentSubmitButtonVisualClassName(isClaiming),
          )}
        >
          <GameDialogSubmitLabel isPending={isClaiming} className="gap-1">
            {t('签到')}
          </GameDialogSubmitLabel>
        </Button>
      ) : hasSignedToday ? (
        <Button
          type="button"
          disabled
          variant="outline"
          className={cn(
            STORY_1011_CHECKIN_SIGNED_CONTROL_CLASS,
            'h-auto bg-transparent hover:bg-transparent',
            'disabled:opacity-100 disabled:border-border',
          )}
        >
          {t('已签到')}
        </Button>
      ) : null}
    </>
  );

  const compactContent = (
    <div
      className={cn(
        'flex w-full flex-col gap-4 rounded-xl border border-story-checkin-accent/16 bg-card p-3',
      )}
    >
      {compactInner}
    </div>
  );

  const desktopContent = (
    <>
      <h2 className="m-0 text-lg leading-6.5 font-bold tracking-[-0.04px] text-foreground">
        {t('每日签到')}
      </h2>

      <AppLoadingContainer
        data={records}
        isLoading={weeklyQuery.isPending}
        isError={weeklyQuery.isError}
        minHeight={140}
        scrollable={false}
      >
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-7">
          {records.map((record, index) => (
            <li key={record.date ?? `day-${record.dayOfWeek ?? index}`}>
              <CheckinDayCard
                record={record}
                checkinDailyPoints={checkinDailyPoints}
                isClaiming={isClaiming}
                onClaim={handleClaim}
              />
            </li>
          ))}
        </ul>
      </AppLoadingContainer>
    </>
  );

  const rewardDialog = (
    <Story1011PointsRewardDialog
      open={isRewardOpen}
      onOpenChange={setIsRewardOpen}
      points={rewardPoints}
    />
  );

  if (embedded) {
    return (
      <>
        {compactContent}
        {rewardDialog}
      </>
    );
  }

  return (
    <>
      <div className="lg:hidden">{compactContent}</div>

      <section
        className={cn(
          'hidden w-full flex-col gap-4 rounded-xl border border-story-checkin-accent/16 bg-card p-5 lg:flex lg:p-6',
        )}
      >
        {desktopContent}
      </section>

      {rewardDialog}
    </>
  );
}

function CheckinTimelineRow({
  records,
  checkinDailyPoints,
}: {
  records: readonly DayCheckinVO[];
  checkinDailyPoints: number[] | undefined;
}) {
  const lastIndex = records.length - 1;

  return (
    <ul className="m-0 grid w-full list-none grid-cols-7 gap-1 p-0">
      {records.map((record, index) => (
        <li key={record.date ?? `timeline-${record.dayOfWeek ?? index}`}>
          <CheckinTimelineCell
            record={record}
            checkinDailyPoints={checkinDailyPoints}
            isFirst={index === 0}
            isLast={index === lastIndex}
          />
        </li>
      ))}
    </ul>
  );
}

function CheckinTimelineCell({
  record,
  checkinDailyPoints,
  isFirst,
  isLast,
}: {
  record: DayCheckinVO;
  checkinDailyPoints: number[] | undefined;
  isFirst: boolean;
  isLast: boolean;
}) {
  const state = getStory1011DayState(record);
  const dayLabel = `D${record.dayOfWeek ?? ''}`;
  const dayPoints = getStory1011CheckinDayPoints(
    record.dayOfWeek,
    checkinDailyPoints,
  );
  const pointsLabel =
    dayPoints === undefined ? '—' : `+${formatNumber(dayPoints)}`;
  const isClaimable = state === Story1011CheckinDayState.Claimable;
  const isSigned = state === Story1011CheckinDayState.Signed;
  const isMissed = state === Story1011CheckinDayState.Missed;
  const isPastOutcome = isSigned || isMissed;

  return (
    <article className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'flex w-full flex-col items-center justify-center rounded-lg border p-2',
          'bg-linear-to-b from-story-checkin-accent/5 to-transparent',
          isClaimable
            ? 'border-story-checkin-accent'
            : isPastOutcome
              ? 'border-border'
              : 'border-story-checkin-accent/16',
        )}
      >
        {isSigned ? (
          <IconCircleCheck
            checked
            className="size-5 shrink-0 text-muted-foreground"
          />
        ) : null}

        {isMissed ? (
          <IconCircleX className="size-5 shrink-0 text-muted-foreground" />
        ) : null}

        {!isPastOutcome ? (
          <img
            src={story1011Media.pointsCoin}
            alt=""
            width={20}
            height={20}
            className="size-5 object-cover"
          />
        ) : null}

        <span
          className={cn(
            'text-[13px] leading-[18px] font-medium',
            isPastOutcome ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {pointsLabel}
        </span>
      </div>

      {/* 圆点与轴线同层：线段经圆心贯穿，并向 gap 两侧延伸 2px 接缝 */}
      <div className="relative flex h-1.5 w-full items-center justify-center">
        <span
          aria-hidden
          className={cn(
            'absolute top-1/2 h-px -translate-y-1/2 bg-border',
            isFirst && isLast
              ? 'hidden'
              : isFirst
                ? 'right-0 left-1/2 -mr-0.5'
                : isLast
                  ? 'right-1/2 left-0 -ml-0.5'
                  : '-right-0.5 -left-0.5',
          )}
        />
        <span
          className={cn(
            'relative z-10 size-1.5 shrink-0 rounded-full',
            isClaimable ? 'bg-story-checkin-accent' : 'bg-border',
          )}
        />
      </div>

      <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
        {dayLabel}
      </span>
    </article>
  );
}

function CheckinDayCard({
  record,
  checkinDailyPoints,
  isClaiming,
  onClaim,
}: {
  record: DayCheckinVO;
  checkinDailyPoints: number[] | undefined;
  isClaiming: boolean;
  onClaim: () => void;
}) {
  const { t } = useTranslation();
  const state = getStory1011DayState(record);
  const dayLabel = `D${record.dayOfWeek ?? ''}`;
  const dayPoints = getStory1011CheckinDayPoints(
    record.dayOfWeek,
    checkinDailyPoints,
  );
  const pointsLabel =
    dayPoints === undefined ? '—' : `+${formatNumber(dayPoints)}`;
  const isClaimable = state === Story1011CheckinDayState.Claimable;
  const isSigned = state === Story1011CheckinDayState.Signed;
  const isMissed = state === Story1011CheckinDayState.Missed;
  const isUpcoming = state === Story1011CheckinDayState.Upcoming;

  return (
    <article
      className={cn(
        'flex flex-col items-center justify-center',
        'gap-3 rounded-2xl border p-4',
        'bg-linear-to-b from-story-checkin-accent/5 to-transparent',
        isClaimable
          ? 'border-story-checkin-accent'
          : 'border-story-checkin-accent/16',
      )}
    >
      <span className="text-sm leading-5 text-muted-foreground">
        {dayLabel}
      </span>

      <div className="flex items-center justify-center gap-1">
        <img
          src={story1011Media.pointsCoin}
          alt=""
          width={20}
          height={20}
          className={cn(
            'size-5 object-cover',
            (isSigned || isMissed) && 'opacity-50',
          )}
        />
        <span
          className={cn(
            'text-base leading-6 font-medium',
            isSigned || isMissed ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {pointsLabel}
        </span>
      </div>

      {isMissed ? (
        <div className="flex w-full items-center justify-center rounded border-[1.5px] border-border p-2">
          <IconCircleX className="size-5 text-muted-foreground" />
        </div>
      ) : null}

      {isSigned ? (
        <div className={STORY_1011_CHECKIN_SIGNED_CONTROL_CLASS}>
          {t('已签到')}
        </div>
      ) : null}

      {isClaimable ? (
        <Button
          type="button"
          disabled={isClaiming}
          onClick={onClaim}
          className={cn(
            'h-auto w-full rounded px-3 py-1.5',
            'text-sm leading-5 font-bold',
            getStory1011AccentSubmitButtonVisualClassName(isClaiming),
          )}
        >
          <GameDialogSubmitLabel isPending={isClaiming} className="gap-1">
            {t('签到')}
          </GameDialogSubmitLabel>
        </Button>
      ) : null}

      {isUpcoming ? (
        <Button
          type="button"
          disabled
          className={cn(
            'h-auto w-full rounded bg-story-checkin-accent/16 px-3 py-1.5',
            'text-sm leading-5 font-bold text-muted-foreground',
            'disabled:opacity-100',
          )}
        >
          {t('签到')}
        </Button>
      ) : null}
    </article>
  );
}
