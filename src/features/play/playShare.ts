import type { TFunction } from 'i18next';

import { PlayFeedContentType } from '@/features/play/types/playImmersive';

const SHARE_DESCRIPTION_MAX_LENGTH = 20;

type BuildPlayShareTextOptions = {
  origin: string;
  contentType?: string;
  dramaId?: string;
  episodeId?: string;
  episodeNo?: number;
  dramaTitle?: string;
  description?: string;
  t: TFunction;
};

function truncateShareDescription(description?: string): string | undefined {
  const normalized = description?.trim();
  if (!normalized) {
    return undefined;
  }

  return Array.from(normalized).slice(0, SHARE_DESCRIPTION_MAX_LENGTH).join('');
}

export function buildPlayShareText({
  origin,
  contentType,
  dramaId,
  episodeId,
  episodeNo,
  dramaTitle,
  description,
  t,
}: BuildPlayShareTextOptions): string | undefined {
  const isShortVideo = contentType === PlayFeedContentType.ShortVideo;
  const playPathId = isShortVideo ? episodeId : dramaId;
  if (!playPathId) {
    return undefined;
  }

  const shareUrl = new URL(`/play/${encodeURIComponent(playPathId)}`, origin);

  if (isShortVideo) {
    shareUrl.searchParams.set('contentType', PlayFeedContentType.ShortVideo);
  } else {
    if (episodeNo !== undefined) {
      shareUrl.searchParams.set('episode', String(episodeNo));
    }
    if (episodeId) {
      shareUrl.searchParams.set('episodeId', episodeId);
    }
  }

  const normalizedDescription = truncateShareDescription(description);
  if (isShortVideo) {
    return normalizedDescription
      ? t('{{description}}... {{url}}。来 StoryFun，观看精美短视频。', {
          description: normalizedDescription,
          url: shareUrl.toString(),
        })
      : shareUrl.toString();
  }

  const normalizedTitle = dramaTitle?.trim();
  return normalizedTitle && normalizedDescription && episodeNo !== undefined
    ? t(
        '{{title}} | 第{{episode}}集：{{description}}... {{url}}。来 StoryFun，观看精美AI短剧。',
        {
          title: normalizedTitle,
          episode: episodeNo,
          description: normalizedDescription,
          url: shareUrl.toString(),
        },
      )
    : shareUrl.toString();
}
