import { createFileRoute, Outlet } from '@tanstack/react-router';

import type { DramaDetailInfoResponse } from '@/api/__generated__/story/model/dramaDetailInfoResponse';
import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import {
  getPlayDramaDetail,
  getPlayDramaDetailQueryKey,
  getPlayMediaDetail,
  getPlayMediaDetailQueryKey,
} from '@/features/play/playDramaApi';
import {
  parsePlayDramaId,
  unwrapOrvalPayload,
} from '@/features/play/playFormat';
import { PlayFeedContentType } from '@/features/play/types/playImmersive';
import { seo } from '@/utils';

const PLAY_DETAIL_SEO_FALLBACK = {
  title: 'Short Play | StoryFun',
  description: 'AI short drama based on real events — watch, earn points.',
} as const;

type PlayDramaLayoutSearch = {
  contentType?: PlayFeedContentType;
};

export const Route = createFileRoute('/play/$dramaId')({
  validateSearch: (search: Record<string, unknown>): PlayDramaLayoutSearch => ({
    contentType:
      search.contentType === PlayFeedContentType.ShortVideo
        ? PlayFeedContentType.ShortVideo
        : undefined,
  }),
  loader: async ({ context, location, params }) => {
    const contentType = new URLSearchParams(location.searchStr).get(
      'contentType',
    );
    if (contentType === PlayFeedContentType.ShortVideo) {
      const episodeId = parsePlayDramaId(params.dramaId);
      if (episodeId === undefined) {
        return null;
      }

      try {
        return await context.queryClient.ensureQueryData({
          queryKey: getPlayMediaDetailQueryKey(episodeId, contentType),
          queryFn: ({ signal }) =>
            getPlayMediaDetail(episodeId, contentType, { signal }),
        });
      } catch {
        return null;
      }
    }

    const dramaIdText = parsePlayDramaId(params.dramaId);

    if (dramaIdText === undefined) {
      return null;
    }

    try {
      return await context.queryClient.ensureQueryData({
        queryKey: getPlayDramaDetailQueryKey(dramaIdText),
        queryFn: ({ signal }) => getPlayDramaDetail(dramaIdText, { signal }),
      });
    } catch {
      // 软失败：保留 View 内跳转首页剧场的行为，head 走静态回退
      return null;
    }
  },
  head: ({ loaderData }) => {
    const payload = unwrapOrvalPayload<
      DramaDetailInfoResponse | DramaPlayResponse
    >(loaderData ?? undefined);
    const dramaInfo =
      payload && 'dramaInfo' in payload ? payload.dramaInfo : undefined;
    const shortVideo =
      payload && !('dramaInfo' in payload)
        ? (payload as DramaPlayResponse)
        : undefined;
    const title =
      dramaInfo?.title?.trim() ||
      shortVideo?.description?.trim() ||
      shortVideo?.title?.trim() ||
      PLAY_DETAIL_SEO_FALLBACK.title;
    const description =
      dramaInfo?.desc?.trim() ||
      shortVideo?.description?.trim() ||
      PLAY_DETAIL_SEO_FALLBACK.description;
    const image =
      dramaInfo?.coverImg?.trim() || shortVideo?.coverUrl?.trim() || undefined;

    return {
      meta: [
        ...seo({
          title,
          description,
          image,
        }),
      ],
    };
  },
  component: PlayDramaLayoutRoute,
});

function PlayDramaLayoutRoute() {
  return <Outlet />;
}
