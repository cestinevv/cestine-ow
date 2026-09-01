import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import { ContentBadge } from '@/features/badge/ContentBadge';
import { formatPowerFactor } from '@/features/mining/miningPower';
import { PlayDramaCardActors } from '@/features/play/components/PlayDramaCardActors';
import { PlayDramaCardStats } from '@/features/play/components/PlayDramaCardStats';
import { cn, formatCreatorDisplayName } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

type ActorCastDramaCardProps = {
  item: DramaListItemResponse;
};

export function ActorCastDramaCard({ item }: ActorCastDramaCardProps) {
  const { t } = useTranslation();

  const dramaIdText = readSnowflakeId(item.dramaId);
  const dramaTitle = item.dramaTitle?.trim() ?? '';
  const coverUrl = item.dramaCoverUrl?.trim();
  const dramaTags =
    item.tags?.map((tag) => tag.trim()).filter((tag) => tag.length > 0) ?? [];
  const hasActorCollections = (item.actorCollections?.length ?? 0) > 0;
  const creatorName = item.creatorName?.trim();
  const creatorLabel = creatorName
    ? `@${formatCreatorDisplayName(creatorName)}`
    : '@JACK';
  const genreLabel = dramaTags[0] ? t(dramaTags[0]) : t('科幻');
  const actorComputingPowerLabel = formatPowerFactor(
    item.actorCollections?.[0]?.computingPower,
  );

  const episodeCountLabel =
    item.totalEpisodes !== undefined && Number.isFinite(item.totalEpisodes)
      ? t('{{count}}集', {
          count: Math.max(0, Math.floor(item.totalEpisodes)),
        })
      : null;

  const dramaLinkProps = dramaIdText
    ? {
        to: '/play/$dramaId' as const,
        params: { dramaId: dramaIdText },
      }
    : null;

  const linkedContent = (
    <>
      <div className="relative w-full overflow-hidden">
        {coverUrl ? (
          <img
            alt=""
            className="block aspect-[232/310] w-full object-cover"
            decoding="async"
            height={310}
            loading="lazy"
            src={coverUrl}
            width={232}
          />
        ) : (
          <div className="aspect-[232/310] w-full bg-muted" aria-hidden />
        )}

        <ContentBadge
          badge={item.badge}
          variant="drama"
          shape="corner"
          className="absolute top-0 left-0 max-w-full"
        />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-linear-to-b from-transparent to-black/60 p-3 pt-10">
          {hasActorCollections ? (
            <div className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/30 py-1 pr-2 pl-1 backdrop-blur-[2.5px]">
              <PlayDramaCardActors
                actorCollections={item.actorCollections ?? []}
                size="banner"
                className="-space-x-4 gap-0"
              />
              <div className="flex flex-col leading-none text-white">
                <span className="text-[13px] leading-[18px] font-bold">
                  {actorComputingPowerLabel}
                </span>
                <span className="text-[10px] leading-3 text-white/80">
                  STORY/h
                </span>
              </div>
            </div>
          ) : null}
          <PlayDramaCardStats item={item} compact showPlaceholders />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 p-3">
        {dramaTitle ? (
          <h3
            className="truncate text-base leading-6 font-medium text-foreground"
            title={dramaTitle}
          >
            {dramaTitle}
          </h3>
        ) : null}
        <div className="flex min-w-0 items-center justify-between gap-2 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
          <span className="min-w-0 truncate">
            {genreLabel}
            {episodeCountLabel ? ` · ${episodeCountLabel}` : ''}
          </span>
          <span className="shrink-0 truncate">{creatorLabel}</span>
        </div>
      </div>
    </>
  );

  return (
    <article
      className={cn(
        'flex h-full w-full min-w-[175px] flex-col overflow-hidden rounded-[10px] border border-border/60 bg-card index-shadow-pipeline-hover',
        'md:min-w-[190px]',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {dramaLinkProps ? (
          <Link
            {...dramaLinkProps}
            className="flex min-h-0 flex-col no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {linkedContent}
          </Link>
        ) : (
          linkedContent
        )}
      </div>
    </article>
  );
}
