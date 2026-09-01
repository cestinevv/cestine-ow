import { Link, useNavigate } from '@tanstack/react-router';
import { type MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import { UserProfileAvatarLink } from '@/components/common/UserProfileAvatarLink';
import { Button } from '@/components/ui/button';
import { PlayActorCompensationDialog } from '@/features/play/components/PlayActorCompensationDialog';
import { PlayBoundActorAvatar } from '@/features/play/components/PlayBoundActorAvatar';
import { PlayDramaCardStats } from '@/features/play/components/PlayDramaCardStats';
import { PLAY_DRAMA_ACTOR_DISPLAY_LIMIT } from '@/features/play/constants/playDramaActorLimit';
import { getDramaListItemCreatorProfileUserId } from '@/features/play/playCreatorProfile';
import type { PlayDramaActorInfo } from '@/features/play/playFormat';
import {
  formatPlayDramaCardMetaLabel,
  formatPlayStoryPerHour,
  getPlayDramaActors,
  PLAY_CARD_COVER_ASPECT_CLASS,
} from '@/features/play/playFormat';
import { navigateToPlayWatchPage } from '@/features/play/playWatchNavigation';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import {
  cn,
  formatCreatorAtHandle,
  plus,
  readSnowflakeId,
  SHOW_DEV_ONLY_UI,
} from '@/utils';
import { formatDurationFromSeconds } from '@/utils/formatDuration';

type PlayDramaCardProps = {
  item: DramaListItemResponse | FeedItemResponse;
  onBeforePlay?: () => void;
  /** 为 false 时拦截进入播放，并触发 onPlayBlocked */
  canPlay?: boolean;
  onPlayBlocked?: () => void;
  showDuration?: boolean;
};

function isFeedItem(
  item: DramaListItemResponse | FeedItemResponse,
): item is FeedItemResponse {
  return 'type' in item || 'drama' in item || 'episode' in item;
}

export function PlayDramaCard({
  item,
  onBeforePlay,
  canPlay = true,
  onPlayBlocked,
  showDuration = true,
}: PlayDramaCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobileViewport = useMobileViewport();
  const [isActorDialogOpen, setIsActorDialogOpen] = useState(false);

  const feedItem = isFeedItem(item) ? item : undefined;
  const dramaItem = isFeedItem(item) ? undefined : item;
  const dramaId =
    readSnowflakeId(feedItem?.drama?.dramaId ?? dramaItem?.dramaId) ?? '';
  const title = (feedItem?.drama?.title ?? dramaItem?.dramaTitle)?.trim() ?? '';
  const coverImage = (
    feedItem?.drama?.coverUrl ??
    feedItem?.episode?.coverUrl ??
    dramaItem?.dramaCoverUrl
  )?.trim();
  const tags = feedItem?.drama?.tags ?? dramaItem?.tags ?? [];
  const creatorName = item.creatorName?.trim();
  const creatorUserId = feedItem
    ? readSnowflakeId(feedItem.userId)
    : dramaItem
      ? getDramaListItemCreatorProfileUserId(dramaItem)
      : undefined;
  const actors = (
    feedItem
      ? (feedItem.drama?.actorCollections ?? []).map((actor) => ({
          id: readSnowflakeId(actor.actorCollectionId),
          name: actor.actorCollectionName?.trim(),
          avatar: actor.actorCollectionAvatar?.trim(),
          computingPower:
            typeof actor.computingPower === 'number' &&
            Number.isFinite(actor.computingPower)
              ? actor.computingPower
              : undefined,
        }))
      : getPlayDramaActors({
          actorCollections: dramaItem?.actorCollections,
        })
  ).slice(0, PLAY_DRAMA_ACTOR_DISPLAY_LIMIT);
  let totalComputingPower: string | undefined;
  for (const actor of actors) {
    if (
      typeof actor.computingPower !== 'number' ||
      !Number.isFinite(actor.computingPower)
    ) {
      continue;
    }
    totalComputingPower =
      totalComputingPower === undefined
        ? String(actor.computingPower)
        : plus(totalComputingPower, actor.computingPower);
  }
  const genreLabel = tags[0];
  const episodeNo = feedItem?.episode?.episodeNo;
  const durationLabel = showDuration
    ? formatDurationFromSeconds(feedItem?.episode?.durationSec)
    : undefined;
  const metaLabel = formatPlayDramaCardMetaLabel(t, genreLabel);
  if (!dramaId) {
    return null;
  }

  const detailLinkTo = isMobileViewport
    ? ('/play/$dramaId/watch' as const)
    : ('/play/$dramaId' as const);

  const handleCardNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!canPlay) {
      event.preventDefault();
      onPlayBlocked?.();
      return;
    }

    onBeforePlay?.();

    if (!isMobileViewport) {
      return;
    }

    event.preventDefault();
    navigateToPlayWatchPage(navigate, dramaId, episodeNo);
  };

  const handleActorDialogOpen = () => {
    setIsActorDialogOpen(true);
  };

  return (
    <article
      className={cn(
        // Layout / Visual — Figma 14:4322：radius 10 / white-to-secondary / border tertiary
        'group relative flex h-full w-full flex-col overflow-hidden rounded-[10px]',
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
            className={cn(
              'absolute top-1/2 left-1/2 size-full max-w-none -translate-x-1/2 -translate-y-1/2 object-cover',
              'transition-[width,height] duration-300 ease-out group-hover:size-[calc(100%+16px)]',
            )}
            decoding="async"
            height={620}
            loading="lazy"
            src={coverImage}
            width={464}
          />
        ) : (
          <div className="size-full bg-muted" />
        )}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-black/60"
          aria-hidden
        />
        {durationLabel ? (
          <span className="pointer-events-none absolute top-3 right-3 z-10 text-sm leading-5 text-white">
            {durationLabel}
          </span>
        ) : null}

        <Link
          to={detailLinkTo}
          params={{ dramaId }}
          onClick={handleCardNavigate}
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="sr-only">{title}</span>
        </Link>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-col items-start gap-2">
          {SHOW_DEV_ONLY_UI && actors.length > 0 ? (
            <CardActorGlassPill
              actors={actors}
              totalComputingPower={totalComputingPower}
              onClick={handleActorDialogOpen}
            />
          ) : null}
          <PlayDramaCardStats
            item={item}
            tone="dark"
            compact
            showPlaceholders
          />
        </div>
      </div>

      <Link
        to={detailLinkTo}
        params={{ dramaId }}
        onClick={handleCardNavigate}
        className="flex min-w-0 flex-col no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex min-w-0 flex-col gap-2 p-3">
          {title ? (
            <h2
              className="w-full truncate text-base leading-6 font-[510] text-foreground"
              title={title}
            >
              {title}
            </h2>
          ) : null}

          <div className="flex min-w-0 items-start gap-2">
            {metaLabel ? (
              <span className="min-w-0 flex-1 truncate text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                {metaLabel}
              </span>
            ) : (
              <span className="min-w-0 flex-1" />
            )}
            {creatorName ? (
              <UserProfileAvatarLink
                userId={creatorUserId}
                className="flex min-w-0 flex-1 items-center justify-end text-xs leading-4 tracking-[0.04px] text-muted-foreground"
              >
                <span className="min-w-0 truncate">
                  {formatCreatorAtHandle(creatorName)}
                </span>
              </UserProfileAvatarLink>
            ) : null}
          </div>
        </div>
      </Link>

      <PlayActorCompensationDialog
        actors={actors}
        open={isActorDialogOpen}
        onOpenChange={setIsActorDialogOpen}
      />
    </article>
  );
}

function CardActorGlassPill({
  actors,
  totalComputingPower,
  onClick,
}: {
  actors: PlayDramaActorInfo[];
  totalComputingPower?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'pointer-events-auto inline-flex h-auto w-fit max-w-full items-center gap-1.5 rounded-full py-1 pr-2 pl-1',
        'border-[0.5px] border-white/15 bg-theater-ip-glass-surface text-white backdrop-blur-[2.5px]',
        'hover:bg-theater-ip-glass-surface/90 hover:text-white',
      )}
    >
      <span className="flex items-center">
        {actors.map((actor, index) => (
          <PlayBoundActorAvatar
            key={actor.id ?? index}
            avatar={actor.avatar}
            name={actor.name}
            // isolate：稿面里前一个头像的角标会被后一个头像盖住，需限制角标 z-index 作用域
            className={cn('isolate', index > 0 && '-ml-4')}
          />
        ))}
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[13px] leading-4.5 font-bold">
          {totalComputingPower !== undefined
            ? formatPlayStoryPerHour(totalComputingPower)
            : '--'}
        </span>
        <span className="text-[10px] leading-3 tracking-[0.08px] text-white/80">
          STORY/h
        </span>
      </span>
    </Button>
  );
}
