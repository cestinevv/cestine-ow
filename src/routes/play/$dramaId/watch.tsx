import { createFileRoute, redirect } from '@tanstack/react-router';

import { PlayWatchView } from '@/features/play/PlayWatchView';
import { usePlayPlaylistStore } from '@/features/play/playPlaylistStore';
import {
  isWorkListPlaylistSource,
  PlayImmersiveSideTab,
} from '@/features/play/types/playImmersive';
import { getIsMobileViewport } from '@/hooks/useMobileViewport';
import { readSnowflakeId } from '@/utils';

type PlayWatchSearch = {
  autoplay?: number;
  commentId?: string;
  episode?: number;
  episodeId?: string;
  sideTab?: PlayImmersiveSideTab;
};

export const Route = createFileRoute('/play/$dramaId/watch')({
  component: PlayWatchRoute,
  validateSearch: (search: Record<string, unknown>): PlayWatchSearch => {
    const rawAutoplay = search.autoplay;
    let autoplay: number | undefined;

    if (typeof rawAutoplay === 'number' && rawAutoplay === 1) {
      autoplay = 1;
    } else if (typeof rawAutoplay === 'string' && rawAutoplay.trim() === '1') {
      autoplay = 1;
    }

    const rawEpisode = search.episode;
    const rawCommentId = search.commentId;
    const rawEpisodeId = search.episodeId;
    const rawSideTab = search.sideTab;
    let episode: number | undefined;
    const commentId =
      typeof rawCommentId === 'string'
        ? readSnowflakeId(rawCommentId)
        : undefined;
    const episodeId =
      typeof rawEpisodeId === 'string'
        ? readSnowflakeId(rawEpisodeId)
        : undefined;

    if (typeof rawEpisode === 'number' && Number.isFinite(rawEpisode)) {
      episode = rawEpisode;
    } else if (typeof rawEpisode === 'string' && rawEpisode.trim()) {
      const parsed = Number(rawEpisode);
      if (Number.isFinite(parsed) && parsed > 0) {
        episode = parsed;
      }
    }

    const sideTab =
      rawSideTab === PlayImmersiveSideTab.Comment
        ? PlayImmersiveSideTab.Comment
        : undefined;

    return { autoplay, commentId, episode, episodeId, sideTab };
  },
  beforeLoad: ({ params, search }) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!getIsMobileViewport()) {
      throw redirect({
        to: '/play/$dramaId',
        params: { dramaId: params.dramaId },
        search: {
          episode: search.episode,
          episodeId: search.episodeId,
          commentId: search.commentId,
          sideTab: search.sideTab,
          autoplay: search.autoplay,
        },
      });
    }
  },
});

function PlayWatchRoute() {
  const { dramaId } = Route.useParams();
  const { autoplay, commentId, episode, episodeId, sideTab } =
    Route.useSearch();
  const playlistSource = usePlayPlaylistStore((state) => state.source);
  const playlistItems = usePlayPlaylistStore((state) => state.items);
  const exactPlaylistIndex = episodeId
    ? playlistItems.findIndex(
        (item) => item.dramaId === dramaId && item.episodeId === episodeId,
      )
    : -1;
  const playlistIndex =
    playlistSource === undefined
      ? -1
      : exactPlaylistIndex >= 0
        ? exactPlaylistIndex
        : playlistItems.findIndex((item) => item.dramaId === dramaId);
  const feedItem = isWorkListPlaylistSource(playlistSource)
    ? playlistItems[playlistIndex]?.feed
    : undefined;

  return (
    <PlayWatchView
      dramaId={dramaId}
      feedItem={feedItem}
      initialEpisode={episode}
      initialEpisodeId={episodeId}
      targetCommentId={commentId}
      initialCommentOpen={sideTab === PlayImmersiveSideTab.Comment}
      explicitAutoplay={autoplay === 1}
    />
  );
}
