import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { WatchHistoryRecentItemResponse } from '@/api/__generated__/story/model/watchHistoryRecentItemResponse';
import { WatchHistoryRecentItemResponseKind } from '@/api/__generated__/story/model/watchHistoryRecentItemResponseKind';
import { useListRecent } from '@/api/__generated__/story/watch-history/watch-history';
import IconMoreArrow from '@/assets/svg/IconMoreArrow';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { PlayFeedContentType } from '@/features/play/types/playImmersive';
import { ProfilePageTab } from '@/features/profile/components/ProfileDramaTabPanel';
import { MOBILE_DRAWER_CARD_CLASS } from '@/layouts/components/mobileNavigationDrawerFormat';
import { cn, readSnowflakeId } from '@/utils';

const WATCH_HISTORY_RECENT_LIMIT = 3;

type MobileWatchHistoryPreviewProps = {
  enabled: boolean;
  onNavigate: () => void;
};

export function MobileWatchHistoryPreview({
  enabled,
  onNavigate,
}: MobileWatchHistoryPreviewProps) {
  const { t } = useTranslation();
  const recentQuery = useListRecent(
    { limit: WATCH_HISTORY_RECENT_LIMIT },
    {
      query: {
        enabled,
        select: (response) =>
          unwrapOrvalPayload<WatchHistoryRecentItemResponse[]>(response) ?? [],
        retry: false,
      },
    },
  );

  return (
    <section className={MOBILE_DRAWER_CARD_CLASS}>
      <Button
        variant="ghost"
        nativeButton={false}
        render={
          <Link
            to="/profile"
            search={{ tab: ProfilePageTab.History }}
            preload="intent"
            onClick={onNavigate}
          />
        }
        className="h-5 w-full justify-start gap-1 rounded-none p-0 hover:bg-transparent"
      >
        <span className="text-sm leading-5 font-bold">{t('观看历史')}</span>
        <IconMoreArrow className="ml-auto h-4 w-2 text-muted-foreground" />
      </Button>

      <AppLoadingContainer
        data={recentQuery.data ?? []}
        isLoading={recentQuery.isLoading}
        minHeight={120}
        scrollable={false}
        emptyContent={
          <p className="text-center text-xs text-muted-foreground">
            {t('暂无相关内容')}
          </p>
        }
        stateClassName="text-xs"
      >
        <ul className="grid grid-cols-3 gap-3 pt-4">
          {(recentQuery.data ?? []).map((item, index) => (
            <li key={getWatchHistoryRecentKey(item, index)}>
              <WatchHistoryRecentCard item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </AppLoadingContainer>
    </section>
  );
}

function getWatchHistoryRecentKey(
  item: WatchHistoryRecentItemResponse,
  index: number,
) {
  if (item.kind === WatchHistoryRecentItemResponseKind.DRAMA) {
    return `drama-${item.drama?.dramaId ?? item.watchedAt ?? index}`;
  }

  if (item.kind === WatchHistoryRecentItemResponseKind.VIDEO) {
    return `video-${item.video?.episodeId ?? item.watchedAt ?? index}`;
  }

  return `recent-${item.watchedAt ?? index}`;
}

function WatchHistoryRecentCard({
  item,
  onNavigate,
}: {
  item: WatchHistoryRecentItemResponse;
  onNavigate: () => void;
}) {
  if (item.kind === WatchHistoryRecentItemResponseKind.DRAMA && item.drama) {
    return <WatchHistoryDramaPreviewCard item={item} onNavigate={onNavigate} />;
  }

  if (item.kind === WatchHistoryRecentItemResponseKind.VIDEO && item.video) {
    return <WatchHistoryVideoPreviewCard item={item} onNavigate={onNavigate} />;
  }

  return null;
}

function WatchHistoryDramaPreviewCard({
  item,
  onNavigate,
}: {
  item: WatchHistoryRecentItemResponse;
  onNavigate: () => void;
}) {
  const drama = item.drama;
  const dramaId = readSnowflakeId(drama?.dramaId);
  const episodeId = readSnowflakeId(drama?.lastEpisodeId);
  const title = drama?.dramaTitle?.trim() ?? '';
  const progressText =
    drama?.watchProgressText?.trim() ||
    (drama?.lastEpisodeNo !== undefined && drama?.totalEpisodes !== undefined
      ? `${drama.lastEpisodeNo}/${drama.totalEpisodes}集`
      : undefined);

  if (!dramaId) {
    return (
      <WatchHistoryPreviewShell
        coverUrl={drama?.dramaCoverUrl}
        title={title}
        progressText={progressText}
      />
    );
  }

  return (
    <Link
      to="/play/$dramaId/watch"
      params={{ dramaId }}
      search={{
        episode: drama?.lastEpisodeNo,
        episodeId,
      }}
      onClick={onNavigate}
      className="block min-w-0 no-underline"
    >
      <WatchHistoryPreviewShell
        coverUrl={drama?.dramaCoverUrl}
        title={title}
        progressText={progressText}
      />
    </Link>
  );
}

function WatchHistoryVideoPreviewCard({
  item,
  onNavigate,
}: {
  item: WatchHistoryRecentItemResponse;
  onNavigate: () => void;
}) {
  const video = item.video;
  const episodeId = readSnowflakeId(video?.episodeId);
  const dramaId = readSnowflakeId(video?.dramaId) ?? episodeId;
  const title = video?.title?.trim() ?? '';
  const progressText =
    video?.episodeNo !== undefined ? `第${video.episodeNo}集` : undefined;

  if (!dramaId || !episodeId) {
    return (
      <WatchHistoryPreviewShell
        coverUrl={video?.coverUrl}
        title={title}
        progressText={progressText}
      />
    );
  }

  return (
    <Link
      to="/play/$dramaId"
      params={{ dramaId }}
      search={{
        contentType: PlayFeedContentType.ShortVideo,
        episodeId,
      }}
      onClick={onNavigate}
      className="block min-w-0 no-underline"
    >
      <WatchHistoryPreviewShell
        coverUrl={video?.coverUrl}
        title={title}
        progressText={progressText}
      />
    </Link>
  );
}

function WatchHistoryPreviewShell({
  coverUrl,
  title,
  progressText,
}: {
  coverUrl?: string;
  title: string;
  progressText?: string;
}) {
  return (
    <article className="flex w-full flex-col gap-1.5 rounded-lg">
      <div className="relative aspect-232/310 w-full overflow-hidden rounded-md">
        {coverUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            loading="lazy"
            src={coverUrl}
          />
        ) : (
          <div className="size-full bg-background" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? (
          <p
            className={cn(
              'truncate text-sm leading-5 font-normal text-foreground',
            )}
            title={title}
          >
            {title}
          </p>
        ) : null}
        {progressText ? (
          <p className="truncate text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            {progressText}
          </p>
        ) : null}
      </div>
    </article>
  );
}
