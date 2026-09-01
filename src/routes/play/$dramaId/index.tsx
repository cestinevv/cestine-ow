import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { PlayImmersiveView } from '@/features/play/PlayImmersiveView';
import { PlayShortVideoView } from '@/features/play/PlayShortVideoView';
import { getPlayPlaylistNavigateSearch } from '@/features/play/playPlaylistNavigate';
import { usePlayPlaylistStore } from '@/features/play/playPlaylistStore';
import {
  isWorkListPlaylistSource,
  PlayFeedContentType,
  type PlayImmersiveItem,
  PlayImmersiveLayoutVariant,
  PlayImmersiveMode,
  PlayImmersiveSideTab,
} from '@/features/play/types/playImmersive';
import {
  getIsMobileViewport,
  useMobileViewport,
} from '@/hooks/useMobileViewport';
import { readSnowflakeId } from '@/utils';

type PlayDramaSearch = {
  autoplay?: number;
  commentId?: string;
  contentType?: PlayFeedContentType;
  episode?: number;
  episodeId?: string;
  sideTab?: PlayImmersiveSideTab;
};

export const Route = createFileRoute('/play/$dramaId/')({
  component: PlayDramaImmersiveRoute,
  validateSearch: (search: Record<string, unknown>): PlayDramaSearch => {
    const rawAutoplay = search.autoplay;
    let autoplay: number | undefined;

    if (typeof rawAutoplay === 'number' && rawAutoplay === 1) {
      autoplay = 1;
    } else if (typeof rawAutoplay === 'string' && rawAutoplay.trim() === '1') {
      autoplay = 1;
    }

    const rawEpisode = search.episode;
    const rawCommentId = search.commentId;
    const rawContentType = search.contentType;
    const rawEpisodeId = search.episodeId;
    const rawSideTab = search.sideTab;
    let episode: number | undefined;
    const commentId =
      typeof rawCommentId === 'string'
        ? readSnowflakeId(rawCommentId)
        : undefined;
    const contentType =
      rawContentType === PlayFeedContentType.ShortVideo
        ? PlayFeedContentType.ShortVideo
        : undefined;
    const episodeId =
      typeof rawEpisodeId === 'string'
        ? readSnowflakeId(rawEpisodeId)
        : undefined;

    if (typeof rawEpisode === 'number' && Number.isFinite(rawEpisode)) {
      episode = Math.max(1, Math.floor(rawEpisode));
    } else if (typeof rawEpisode === 'string') {
      const parsed = Number.parseInt(rawEpisode, 10);
      if (Number.isFinite(parsed)) {
        episode = Math.max(1, parsed);
      }
    }

    const sideTab =
      rawSideTab === PlayImmersiveSideTab.Comment
        ? PlayImmersiveSideTab.Comment
        : undefined;

    return { autoplay, commentId, contentType, episode, episodeId, sideTab };
  },
  beforeLoad: ({ params, search }) => {
    // 移动端继续走 H5 watch 全屏页
    if (
      getIsMobileViewport() &&
      search.contentType !== PlayFeedContentType.ShortVideo
    ) {
      throw redirect({
        to: '/play/$dramaId/watch',
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

function PlayDramaImmersiveRoute() {
  const navigate = useNavigate();
  const { dramaId } = Route.useParams();
  const { autoplay, commentId, contentType, episode, episodeId, sideTab } =
    Route.useSearch();
  const isMobileViewport = useMobileViewport();
  const playlistSource = usePlayPlaylistStore((state) => state.source);
  const playlistItems = usePlayPlaylistStore((state) => state.items);
  const playlistHasMore = usePlayPlaylistStore((state) => state.hasMore);
  const playlistIsLoadingMore = usePlayPlaylistStore(
    (state) => state.isLoadingMore,
  );
  const loadMorePlaylist = usePlayPlaylistStore(
    (state) => state.loadMorePlaylist,
  );
  const [pendingPlaylistIndex, setPendingPlaylistIndex] = useState<
    number | null
  >(null);

  // SSR 无法读取视口；水合后补一次移动端重定向，确保直接打开详情也进入 H5 watch
  useEffect(() => {
    if (!isMobileViewport || contentType === PlayFeedContentType.ShortVideo) {
      return;
    }

    void navigate({
      to: '/play/$dramaId/watch',
      params: { dramaId },
      search: {
        episode,
        episodeId,
        commentId,
        sideTab,
        autoplay,
      },
      replace: true,
    });
  }, [
    autoplay,
    commentId,
    contentType,
    dramaId,
    episode,
    episodeId,
    isMobileViewport,
    navigate,
    sideTab,
  ]);

  // 作品搜索可能包含同一短剧的多个剧集，优先用 episodeId 定位实际点击项
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

  // 搜索 / 个人作品 / 创作管理用 playlist 翻作品；剧场点进单部剧只带当前剧，上下键翻集
  const shouldUsePlaylist =
    isWorkListPlaylistSource(playlistSource) && playlistIndex >= 0;
  const items: PlayImmersiveItem[] = shouldUsePlaylist
    ? playlistItems.map((item, index) =>
        index === playlistIndex
          ? {
              ...item,
              episodeNo: episode ?? item.episodeNo,
              episodeId: episodeId ?? item.episodeId,
              contentType: contentType ?? item.contentType,
            }
          : item,
      )
    : [{ dramaId, episodeNo: episode, episodeId, contentType }];
  const activeIndex = shouldUsePlaylist ? playlistIndex : 0;
  const activeItem = items[activeIndex];
  const isShortVideoPlayback =
    contentType === PlayFeedContentType.ShortVideo ||
    activeItem?.contentType === PlayFeedContentType.ShortVideo;

  useEffect(() => {
    if (pendingPlaylistIndex === null) {
      return;
    }

    if (pendingPlaylistIndex < playlistItems.length) {
      const next = playlistItems[pendingPlaylistIndex];
      setPendingPlaylistIndex(null);
      void navigate({
        to: '/play/$dramaId',
        params: { dramaId: next.dramaId },
        search: getPlayPlaylistNavigateSearch(next, { sideTab }),
        replace: true,
      });
      return;
    }

    if (!playlistHasMore && !playlistIsLoadingMore) {
      setPendingPlaylistIndex(null);

      // 仅 1 条时不回绕到第一条
      if (playlistItems.length <= 1) {
        return;
      }

      const first = playlistItems[0];
      if (isWorkListPlaylistSource(playlistSource) && first) {
        void navigate({
          to: '/play/$dramaId',
          params: { dramaId: first.dramaId },
          search: getPlayPlaylistNavigateSearch(first, { sideTab }),
          replace: true,
        });
      }
    }
  }, [
    navigate,
    pendingPlaylistIndex,
    playlistHasMore,
    playlistIsLoadingMore,
    playlistItems,
    playlistSource,
    sideTab,
  ]);

  // 列表队列内翻到另一条作品；剧场点进的单部剧不走这里
  const handleActiveIndexChange = (index: number) => {
    const next = items[index];
    if (!next && playlistHasMore) {
      setPendingPlaylistIndex(index);
      void loadMorePlaylist();
      return;
    }

    // 作品列表仅 1 条时不循环回第一条，避免短视频播完又被「翻」走
    if (!next && isWorkListPlaylistSource(playlistSource)) {
      if (items.length <= 1) {
        return;
      }

      const first = items[0];
      if (first) {
        void navigate({
          to: '/play/$dramaId',
          params: { dramaId: first.dramaId },
          search: getPlayPlaylistNavigateSearch(first, { sideTab }),
          replace: true,
        });
      }
      return;
    }

    if (!next) {
      return;
    }

    void navigate({
      to: '/play/$dramaId',
      params: { dramaId: next.dramaId },
      search: getPlayPlaylistNavigateSearch(next, { sideTab }),
      replace: true,
    });
  };

  if (isShortVideoPlayback) {
    return (
      <PlayShortVideoView
        episodeId={episodeId ?? dramaId}
        items={shouldUsePlaylist ? items : undefined}
        activeIndex={shouldUsePlaylist ? activeIndex : undefined}
        onActiveIndexChange={
          shouldUsePlaylist ? handleActiveIndexChange : undefined
        }
        hasMore={shouldUsePlaylist ? playlistHasMore : undefined}
        onLoadMore={
          shouldUsePlaylist
            ? () => {
                void loadMorePlaylist();
              }
            : undefined
        }
        loop={shouldUsePlaylist}
        initialSideTab={sideTab}
      />
    );
  }

  return (
    <PlayImmersiveView
      mode={PlayImmersiveMode.Drama}
      layoutVariant={PlayImmersiveLayoutVariant.Fullscreen}
      items={items}
      activeIndex={activeIndex}
      onActiveIndexChange={handleActiveIndexChange}
      hasMore={shouldUsePlaylist && playlistHasMore}
      onLoadMore={
        shouldUsePlaylist
          ? () => {
              void loadMorePlaylist();
            }
          : undefined
      }
      loop={shouldUsePlaylist}
      targetCommentId={commentId}
      initialSideTab={sideTab}
      explicitAutoplay={autoplay === 1}
    />
  );
}
