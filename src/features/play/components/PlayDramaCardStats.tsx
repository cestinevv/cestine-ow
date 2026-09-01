import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import IconBrandTinder from '@/assets/svg/IconBrandTinder';
import IconBrandYoutube from '@/assets/svg/IconBrandYoutube';
import IconPlayRatingStar from '@/assets/svg/IconPlayRatingStar';
import IconUser18 from '@/assets/svg/IconUser18';
import { UserProfileRouteLink } from '@/components/common/UserProfileRouteLink';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatPlayAvgRatingForSummary,
  formatPlayCompactCount,
  formatPlayHeatValue,
  getPlayDramaListItemCreatorUserId,
} from '@/features/play/playFormat';
import {
  cn,
  formatCreatorDisplayName,
  formatNumber,
  readSnowflakeId,
} from '@/utils';

type PlayDramaCardStatsProps = {
  item: DramaListItemResponse | FeedItemResponse;
  tone?: 'light' | 'dark';
  compact?: boolean;
  showRatingStar?: boolean;
  showPlaceholders?: boolean;
};

function isFeedItem(
  item: DramaListItemResponse | FeedItemResponse,
): item is FeedItemResponse {
  return 'type' in item || 'drama' in item || 'episode' in item;
}

function PlayDramaCardStatTooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className={cn(
              'inline-flex min-w-0 appearance-none items-center border-0 bg-transparent p-0',
              'font-inherit text-inherit cursor-help',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className,
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="rounded-xl px-3 py-2 text-xs leading-4 font-medium"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function PlayDramaCardStats({
  item,
  tone = 'dark',
  compact = false,
  showRatingStar = true,
  showPlaceholders = false,
}: PlayDramaCardStatsProps) {
  const { t } = useTranslation();
  const feedItem = isFeedItem(item) ? item : undefined;
  const dramaItem = isFeedItem(item) ? undefined : item;
  const creatorName = item.creatorName?.trim();
  const creatorDisplayName = creatorName
    ? formatCreatorDisplayName(creatorName)
    : undefined;
  const creatorUserId = feedItem
    ? readSnowflakeId(feedItem.userId)
    : dramaItem
      ? getPlayDramaListItemCreatorUserId(dramaItem)
      : undefined;
  const completedCount =
    feedItem?.episode?.completeCount ?? dramaItem?.totalCompletedViewCount;
  const playCount = feedItem?.episode?.playCount ?? dramaItem?.totalPlayCount;
  const playCountLabel =
    completedCount !== undefined
      ? compact
        ? formatPlayCompactCount(completedCount)
        : formatNumber(completedCount, 0)
      : playCount !== undefined
        ? compact
          ? formatPlayCompactCount(playCount)
          : formatNumber(playCount, 0)
        : undefined;
  const heatLabel = formatPlayHeatValue(
    feedItem?.drama?.totalHeatValue ?? dramaItem?.totalHeatValue,
  );
  const ratingLabel = formatPlayAvgRatingForSummary(
    feedItem?.drama?.avgRating ?? dramaItem?.avgRating,
  );

  const textClass =
    tone === 'light'
      ? 'text-sm leading-5 text-muted-foreground'
      : 'text-sm leading-5 text-white';
  const iconClass = tone === 'light' ? 'text-muted-foreground' : 'text-white';

  if (compact) {
    return (
      <div className="flex w-full items-center gap-4 overflow-hidden">
        {playCountLabel || showPlaceholders ? (
          <PlayDramaCardStatTooltip label={t('完播')}>
            <span className={cn('inline-flex items-center gap-0.5', textClass)}>
              <IconBrandYoutube
                aria-hidden
                className={cn('size-3', iconClass)}
              />
              {playCountLabel ?? '--'}
            </span>
          </PlayDramaCardStatTooltip>
        ) : null}
        {heatLabel || showPlaceholders ? (
          <PlayDramaCardStatTooltip label={t('热度')}>
            <span className={cn('inline-flex items-center gap-0.5', textClass)}>
              <IconBrandTinder
                aria-hidden
                className={cn('size-3', iconClass)}
              />
              {heatLabel ?? '--'}
            </span>
          </PlayDramaCardStatTooltip>
        ) : null}
        {ratingLabel ? (
          <PlayDramaCardStatTooltip label={t('评分')}>
            <span className={cn('inline-flex items-center gap-0.5', textClass)}>
              <IconPlayRatingStar
                aria-hidden
                className={cn('size-3', iconClass)}
              />
              {ratingLabel}
            </span>
          </PlayDramaCardStatTooltip>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
        {creatorName && creatorUserId ? (
          <UserProfileRouteLink
            userId={creatorUserId}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-1 overflow-hidden',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              textClass,
            )}
          >
            <IconUser18
              aria-hidden
              className={cn('size-[18px] shrink-0', iconClass)}
            />
            <span className="min-w-0 truncate" title={creatorName}>
              {creatorDisplayName}
            </span>
          </UserProfileRouteLink>
        ) : creatorName ? (
          <span
            className={cn(
              'flex min-w-0 flex-1 items-center gap-1 overflow-hidden',
              textClass,
            )}
          >
            <IconUser18
              aria-hidden
              className={cn('size-[18px] shrink-0', iconClass)}
            />
            <span className="min-w-0 truncate" title={creatorName}>
              {creatorDisplayName}
            </span>
          </span>
        ) : null}
        {playCountLabel ? (
          <PlayDramaCardStatTooltip label={t('完播')}>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1',
                textClass,
              )}
            >
              <IconBrandYoutube
                aria-hidden
                className={cn('size-[18px]', iconClass)}
              />
              {playCountLabel}
            </span>
          </PlayDramaCardStatTooltip>
        ) : null}
        {heatLabel ? (
          <PlayDramaCardStatTooltip label={t('热度')}>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1',
                textClass,
              )}
            >
              <IconBrandTinder
                aria-hidden
                className={cn('size-[18px]', iconClass)}
              />
              {heatLabel}
            </span>
          </PlayDramaCardStatTooltip>
        ) : null}
        {!showRatingStar && ratingLabel ? (
          <PlayDramaCardStatTooltip label={t('评分')}>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1',
                textClass,
              )}
            >
              <IconPlayRatingStar
                aria-hidden
                filled
                className="size-[18px] text-play-rating-star"
              />
              {ratingLabel}
            </span>
          </PlayDramaCardStatTooltip>
        ) : null}
      </div>
      {showRatingStar && ratingLabel ? (
        <PlayDramaCardStatTooltip label={t('评分')}>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm leading-5 text-play-rating-star">
            <IconPlayRatingStar
              aria-hidden
              filled
              className="size-[18px] text-play-rating-star"
            />
            {ratingLabel}
          </span>
        </PlayDramaCardStatTooltip>
      ) : null}
    </div>
  );
}

export function getPlayDramaCardCreatorUserId(item: DramaListItemResponse) {
  return getPlayDramaListItemCreatorUserId(item);
}
