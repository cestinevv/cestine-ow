import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import { FeedItemResponseType } from '@/api/__generated__/recommend/model/feedItemResponseType';
import { PlayFeedContentType } from '@/features/play/types/playImmersive';

export function getFeedItemContentType(
  item?: FeedItemResponse,
): PlayFeedContentType | undefined {
  if (item?.type === FeedItemResponseType.SHORT_VIDEO) {
    return PlayFeedContentType.ShortVideo;
  }

  if (
    item?.type === FeedItemResponseType.DRAMA ||
    item?.type === FeedItemResponseType.DRAMA_EPISODE
  ) {
    return PlayFeedContentType.DramaEpisode;
  }

  return undefined;
}

export function getFeedItemMediaAccessUrl(
  item?: FeedItemResponse,
): string | undefined {
  return item?.episode?.mediaAccessUrl;
}

export function getFeedItemPlaybackType(
  item?: FeedItemResponse,
): string | undefined {
  return item?.episode?.playbackType;
}
