import {
  PlayFeedContentType,
  type PlayImmersiveItem,
  type PlayImmersiveSideTab,
} from '@/features/play/types/playImmersive';

export function getPlayPlaylistNavigateSearch(
  item: PlayImmersiveItem,
  extra?: { sideTab?: PlayImmersiveSideTab },
) {
  const isShortVideo = item.contentType === PlayFeedContentType.ShortVideo;

  return {
    episode: isShortVideo ? undefined : item.episodeNo,
    episodeId: item.episodeId,
    contentType: isShortVideo ? PlayFeedContentType.ShortVideo : undefined,
    sideTab: extra?.sideTab,
  };
}
