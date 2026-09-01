import IconBrandTinder from '@/assets/svg/IconBrandTinder';
import IconBrandYoutube from '@/assets/svg/IconBrandYoutube';
import IconPlayBookmarkOutline from '@/assets/svg/IconPlayBookmarkOutline';
import IconStar18 from '@/assets/svg/IconStar18';
import IconUser18 from '@/assets/svg/IconUser18';
import { UserProfileRouteLink } from '@/components/common/UserProfileRouteLink';
import {
  formatPlayAvgRatingForSummary,
  formatPlayCompactCount,
  formatPlayHeatValue,
} from '@/features/play/playFormat';
import { cn, formatCreatorDisplayName, formatNumber } from '@/utils';

type PlayTheaterBannerStatsProps = {
  creatorName?: string;
  creatorUserId?: string;
  totalPlayCount?: number;
  totalHeatValue?: number;
  avgRating?: number;
  totalRatingUserCount?: number;
  favoriteCount?: number;
  showPlaceholders?: boolean;
};

export function PlayTheaterBannerStats({
  creatorName,
  creatorUserId,
  totalPlayCount,
  totalHeatValue,
  avgRating,
  totalRatingUserCount,
  favoriteCount,
  showPlaceholders = false,
}: PlayTheaterBannerStatsProps) {
  const trimmedCreatorName = creatorName?.trim();
  const creatorDisplayName = trimmedCreatorName
    ? formatCreatorDisplayName(trimmedCreatorName)
    : undefined;
  const playCountLabel =
    totalPlayCount !== undefined ? formatNumber(totalPlayCount, 0) : undefined;
  const heatLabel = formatPlayHeatValue(totalHeatValue);
  const ratingLabel = formatPlayAvgRatingForSummary(
    avgRating,
    totalRatingUserCount,
  );
  const favoriteCountLabel =
    favoriteCount !== undefined
      ? formatPlayCompactCount(favoriteCount)
      : undefined;
  const ratingUserCountLabel =
    totalRatingUserCount !== undefined
      ? formatPlayCompactCount(totalRatingUserCount)
      : undefined;

  const hasAnyStat = Boolean(
    trimmedCreatorName ||
      playCountLabel ||
      heatLabel ||
      ratingLabel ||
      favoriteCountLabel ||
      showPlaceholders,
  );

  if (!hasAnyStat) {
    return null;
  }

  const textClass = 'text-sm leading-5 text-white';
  const iconClass = 'text-white';

  return (
    <div className="flex w-full flex-wrap items-center gap-3 md:gap-4">
      {trimmedCreatorName && creatorUserId ? (
        <UserProfileRouteLink
          userId={creatorUserId}
          className={cn(
            'inline-flex min-w-0 items-center gap-1 text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <IconUser18
            aria-hidden
            className={cn('size-[18px] shrink-0', iconClass)}
          />
          <span className="truncate" title={trimmedCreatorName}>
            {creatorDisplayName}
          </span>
        </UserProfileRouteLink>
      ) : trimmedCreatorName ? (
        <span
          className={cn('inline-flex min-w-0 items-center gap-1', textClass)}
        >
          <IconUser18
            aria-hidden
            className={cn('size-[18px] shrink-0', iconClass)}
          />
          <span className="truncate" title={trimmedCreatorName}>
            {creatorDisplayName}
          </span>
        </span>
      ) : null}
      {playCountLabel ? (
        <span
          className={cn('inline-flex shrink-0 items-center gap-1', textClass)}
        >
          <IconBrandYoutube
            aria-hidden
            className={cn('size-[18px]', iconClass)}
          />
          {playCountLabel}
        </span>
      ) : showPlaceholders ? (
        <span
          className={cn('inline-flex shrink-0 items-center gap-1', textClass)}
        >
          <IconBrandYoutube
            aria-hidden
            className={cn('size-[18px]', iconClass)}
          />
          --
        </span>
      ) : null}
      {heatLabel ? (
        <span
          className={cn('inline-flex shrink-0 items-center gap-1', textClass)}
        >
          <IconBrandTinder
            aria-hidden
            className={cn('size-[18px]', iconClass)}
          />
          {heatLabel}
        </span>
      ) : showPlaceholders ? (
        <span
          className={cn('inline-flex shrink-0 items-center gap-1', textClass)}
        >
          <IconBrandTinder
            aria-hidden
            className={cn('size-[18px]', iconClass)}
          />
          --
        </span>
      ) : null}
      {ratingLabel ? (
        <span
          className={cn('inline-flex shrink-0 items-center gap-1', textClass)}
          title={ratingUserCountLabel}
        >
          <IconStar18 aria-hidden className={cn('size-[18px]', iconClass)} />
          {ratingLabel}
        </span>
      ) : null}
      {favoriteCountLabel ? (
        <span
          className={cn('inline-flex shrink-0 items-center gap-1', textClass)}
        >
          <IconPlayBookmarkOutline
            aria-hidden
            className={cn('size-[18px]', iconClass)}
          />
          {favoriteCountLabel}
        </span>
      ) : null}
    </div>
  );
}
