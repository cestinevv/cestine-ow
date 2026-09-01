import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import { FeedItemResponseType } from '@/api/__generated__/recommend/model/feedItemResponseType';
import IconPlayHeartFilled from '@/assets/svg/IconPlayHeartFilled';
import IconPlayHeartOutline from '@/assets/svg/IconPlayHeartOutline';
import { UserProfileAvatar } from '@/components/common/UserProfileAvatar';
import { UserProfileAvatarLink } from '@/components/common/UserProfileAvatarLink';
import { ContentBadge } from '@/features/badge/ContentBadge';
import {
  formatPlayCompactCount,
  getRoleAvatarFallback,
  PLAY_CARD_COVER_ASPECT_CLASS,
} from '@/features/play/playFormat';
import {
  PlayFeedContentType,
  PlayImmersiveSideTab,
} from '@/features/play/types/playImmersive';
import { cn, formatCreatorAtHandle, readSnowflakeId } from '@/utils';
import { formatDurationFromSeconds } from '@/utils/formatDuration';

type SearchWorkCardProps = {
  item: FeedItemResponse;
  onBeforePlay: () => void;
};

export function SearchWorkCard({ item, onBeforePlay }: SearchWorkCardProps) {
  const { t } = useTranslation();
  const dramaId = readSnowflakeId(item.drama?.dramaId);
  const episodeId = readSnowflakeId(item.episode?.episodeId);
  const isShortVideo = item.type === FeedItemResponseType.SHORT_VIDEO;
  const isDramaEpisode = item.type === FeedItemResponseType.DRAMA_EPISODE;
  const playPathId = isShortVideo ? episodeId : dramaId;
  const coverImage =
    item.episode?.coverUrl?.trim() || item.drama?.coverUrl?.trim();
  const description = item.episode?.description?.trim();
  const creatorName = item.creatorName?.trim();
  const creatorUserId = readSnowflakeId(item.userId);
  const creatorAvatar = item.creatorAvatarUrl;
  const likeCountLabel = formatPlayCompactCount(item.episode?.likeCount);
  const durationLabel = formatDurationFromSeconds(item.episode?.durationSec);
  const contentLabel = isShortVideo
    ? t('短视频')
    : item.episode?.episodeNo !== undefined
      ? t('第{{n}}集', { n: item.episode.episodeNo })
      : undefined;

  const content = (
    <article
      className={cn(
        'group flex h-full w-full flex-col overflow-hidden rounded-[10px]',
        'border-[0.3px] border-theater-drama-card-border bg-theater-drama-card-surface text-card-foreground',
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden',
          PLAY_CARD_COVER_ASPECT_CLASS,
        )}
      >
        {coverImage ? (
          <img
            alt=""
            src={coverImage}
            width={464}
            height={620}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.055]"
          />
        ) : (
          <div className="size-full bg-muted" />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-b from-transparent to-black/65"
          aria-hidden
        />
        {isDramaEpisode ? (
          <ContentBadge
            badge={item.drama?.badge}
            variant="drama"
            shape="corner"
            className="pointer-events-none absolute top-0 left-0 z-10 max-w-full"
          />
        ) : null}
        {durationLabel ? (
          <span className="pointer-events-none absolute top-3 right-3 z-10 text-sm leading-5 text-white">
            {durationLabel}
          </span>
        ) : null}
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-4 overflow-hidden">
          {likeCountLabel ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-sm leading-5 text-white">
              <span className="sr-only">{t('点赞')}</span>
              {item.likedByMe === true ? (
                <IconPlayHeartFilled
                  aria-hidden
                  className="size-3 text-watch-like-active"
                />
              ) : (
                <IconPlayHeartOutline aria-hidden className="size-3" />
              )}
              {likeCountLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        {description ? (
          <h2
            className="w-full truncate text-base leading-6 font-medium text-foreground"
            title={description}
          >
            {description}
          </h2>
        ) : null}
        <div className="mt-auto flex min-w-0 items-center justify-between gap-2">
          {contentLabel ? (
            <span className="min-w-0 truncate text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {contentLabel}
            </span>
          ) : (
            <span />
          )}
          {creatorName ? (
            <UserProfileAvatarLink
              userId={creatorUserId}
              className="flex min-w-0 shrink-0 items-center gap-1 text-xs leading-4 tracking-[0.04px] text-muted-foreground"
            >
              <UserProfileAvatar
                userId={creatorUserId}
                avatarUrl={creatorAvatar}
                size={16}
                fallbackChar={getRoleAvatarFallback(creatorName)}
                className="size-4"
              />
              <span className="max-w-20 truncate">
                {formatCreatorAtHandle(creatorName)}
              </span>
            </UserProfileAvatarLink>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (!playPathId || !episodeId) {
    return content;
  }

  return (
    <Link
      to="/play/$dramaId"
      params={{ dramaId: playPathId }}
      search={{
        contentType: isShortVideo ? PlayFeedContentType.ShortVideo : undefined,
        episode: item.episode?.episodeNo,
        episodeId,
        sideTab: PlayImmersiveSideTab.Comment,
      }}
      onClick={onBeforePlay}
      className="block h-full no-underline"
    >
      {content}
    </Link>
  );
}
