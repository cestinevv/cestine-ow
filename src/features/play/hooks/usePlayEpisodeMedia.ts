import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { DramaEpisodeListItemResponse } from '@/api/__generated__/story/model/dramaEpisodeListItemResponse';
import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import type { PageDtoDramaEpisodeListItemResponse } from '@/api/__generated__/story/model/pageDtoDramaEpisodeListItemResponse';
import type { DramaStatisticsResponse } from '@/api/legacy/storyLegacyTypes';
import {
  getPlayDramaDetail,
  getPlayDramaDetailQueryKey,
  getPlayDramaEpisodesQueryKey,
  getPlayEpisodeDetailByEpisodeId,
  getPlayEpisodeDetailByEpisodeIdQueryKey,
  listPlayDramaEpisodes,
  reportCompletePlayEpisode,
  reportPlayEpisode,
} from '@/features/play/playDramaApi';
import {
  resolveEpisodeTargetStatus,
  shouldFetchNextEpisodePageForTarget,
} from '@/features/play/playEpisodeTargetPolicy';
import {
  attachPlayDramaDetailCreator,
  dramaPlayProvidesEpisodeFavoriteCount,
  getEpisodeApiIdForRequests,
  getPlayCursorNextPageParam,
  mapDramaEpisodeListItemToPlayResponse,
  mergeDramaPlayFavoriteFields,
  normalizeDramaPlayResponse,
  parsePlayDramaId,
  unwrapOrvalPayload,
} from '@/features/play/playFormat';
import {
  hasPlayableEpisodeSource,
  isPlayEpisodeNotTranscodedError,
} from '@/features/play/playMediaErrorCodes';
import { resolveInitialPlaySource } from '@/features/play/playSourceResolver';
import useGlobalStore from '@/stores/global';
import { readSnowflakeId } from '@/utils';

const EPISODE_LIST_PAGE_SIZE = 100;
const EPISODE_TRANSCODE_POLL_INTERVAL_MS = 10_000;

type UsePlayEpisodeMediaArgs = {
  dramaId: string;
  currentEpisode: number;
  /** 推荐 Feed 直出播放时关闭，避免翻页打 detail / episodes */
  enabled?: boolean;
  /** 仅 episodeId 深链：持续翻页直到定位到目标集 */
  targetEpisodeId?: string;
};

function flattenEpisodePages(
  pages: Awaited<ReturnType<typeof listPlayDramaEpisodes>>[],
): DramaEpisodeListItemResponse[] {
  const out: DramaEpisodeListItemResponse[] = [];

  for (const page of pages) {
    const pageData =
      unwrapOrvalPayload<PageDtoDramaEpisodeListItemResponse>(page);
    for (const item of pageData?.list ?? []) {
      out.push(item);
    }
  }

  return [...out].sort((a, b) => (a.episodeNo ?? 0) - (b.episodeNo ?? 0));
}

/**
 * 详情页与 H5 共用的「集媒体」数据层：剧详情 + 分集列表（正序）、
 * CloudFront 鉴权 Cookie 生命周期、下一页预取与有效播放/完播上报。
 *
 * 切集主链路：始终请求 GET .../episodes/{episodeId}/detail 作为可播权威；
 * 在 detail 确认非转码（121018）前不使用列表 hlsUrl/videoUrl，避免 HLS 403。
 */
export function usePlayEpisodeMedia({
  dramaId,
  currentEpisode,
  enabled = true,
  targetEpisodeId,
}: UsePlayEpisodeMediaArgs) {
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const dramaIdText = parsePlayDramaId(dramaId);
  const queriesEnabled = enabled && dramaIdText !== undefined;
  const latchedEpisodeTranscodingRef = useRef(false);

  const {
    data: dramaDetailResponse,
    isLoading: isDramaLoading,
    isError: isDramaQueryError,
  } = useQuery({
    queryKey: getPlayDramaDetailQueryKey(dramaId),
    queryFn: ({ signal }) => getPlayDramaDetail(dramaId, { signal }),
    enabled: queriesEnabled,
    retry: false,
  });

  const dramaDetail = useMemo(() => {
    const payload =
      unwrapOrvalPayload<DramaStatisticsResponse>(dramaDetailResponse);
    return attachPlayDramaDetailCreator(payload ?? undefined);
  }, [dramaDetailResponse]);

  const detailTotalEpisodes =
    dramaDetail?.totalEpisodes ?? dramaDetail?.playbackRule?.totalEpisodes;

  const episodesQuery = useInfiniteQuery({
    queryKey: getPlayDramaEpisodesQueryKey(dramaId, {
      pageSize: EPISODE_LIST_PAGE_SIZE,
    }),
    queryFn: ({ pageParam, signal }) =>
      listPlayDramaEpisodes(
        dramaId,
        {
          pageSize: EPISODE_LIST_PAGE_SIZE,
          mark: pageParam as string | undefined,
        },
        { signal },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getPlayCursorNextPageParam,
    enabled: queriesEnabled,
    retry: false,
  });

  const episodeList = useMemo(
    () => flattenEpisodePages(episodesQuery.data?.pages ?? []),
    [episodesQuery.data?.pages],
  );

  const resolvedTargetEpisodeNo = useMemo(() => {
    if (!targetEpisodeId) {
      return undefined;
    }

    return episodeList.find(
      (item) => readSnowflakeId(item.episodeId) === targetEpisodeId,
    )?.episodeNo;
  }, [episodeList, targetEpisodeId]);

  const targetEpisodeStatus = resolveEpisodeTargetStatus({
    targetEpisodeId,
    resolvedEpisodeNo: resolvedTargetEpisodeNo,
    isPending: episodesQuery.isPending,
    isFetchingNextPage: episodesQuery.isFetchingNextPage,
    hasNextPage: Boolean(episodesQuery.hasNextPage),
    isError: episodesQuery.isError,
    isFetchNextPageError: episodesQuery.isFetchNextPageError,
  });
  const isResolvingTargetEpisode = targetEpisodeStatus === 'resolving';
  const targetEpisodeNotFound = targetEpisodeStatus === 'not-found';
  const targetEpisodeError = targetEpisodeStatus === 'error';

  const effectiveEpisode =
    targetEpisodeId !== undefined
      ? (resolvedTargetEpisodeNo ?? 0)
      : currentEpisode;

  const episodeTotalFromList =
    episodeList.length > 0
      ? Math.max(...episodeList.map((item) => item.episodeNo ?? 0))
      : undefined;

  const episodeTotal = queriesEnabled
    ? (episodeTotalFromList ?? detailTotalEpisodes ?? 1)
    : undefined;

  const currentEpisodeItem = useMemo(
    () =>
      episodeList.find((item) => item.episodeNo === effectiveEpisode) ??
      undefined,
    [effectiveEpisode, episodeList],
  );

  const episodePlay = useMemo(
    () => mapDramaEpisodeListItemToPlayResponse(currentEpisodeItem),
    [currentEpisodeItem],
  );

  const episodeApiId = getEpisodeApiIdForRequests(episodePlay);
  const resolvedEpisodeApiId = episodeApiId ?? readSnowflakeId(targetEpisodeId);

  const isEpisodeDetailEnabled =
    queriesEnabled && effectiveEpisode > 0 && !isResolvingTargetEpisode;
  const isEpisodeListPending =
    isEpisodeDetailEnabled &&
    episodesQuery.isPending &&
    episodeList.length === 0;
  const hasCurrentEpisodePlayableSource = hasPlayableEpisodeSource({
    hlsUrl: episodePlay?.mediaAccessUrl,
    mp4Url: episodePlay?.videoUrl,
  });
  const shouldFetchEpisodePlaybackDetail =
    isEpisodeDetailEnabled && Boolean(resolvedEpisodeApiId);

  const episodePlaybackDetailQuery = useQuery({
    queryKey: getPlayEpisodeDetailByEpisodeIdQueryKey(
      resolvedEpisodeApiId ?? '',
    ),
    queryFn: async ({ signal }) => {
      const response = await getPlayEpisodeDetailByEpisodeId(
        resolvedEpisodeApiId ?? '',
        { signal },
      );
      const raw = unwrapOrvalPayload<DramaPlayResponse>(response) ?? undefined;
      const normalized = normalizeDramaPlayResponse(raw);

      // 与互动层共用同一 queryKey，必须存归一化 DramaPlayResponse。
      // 详情无 favoriteCount 时保留 Feed/列表的 favoritedByMe 与 count，避免旧剧级污染。
      const previous = queryClient.getQueryData<
        (DramaPlayResponse & { favoriteCount?: number }) | undefined
      >(getPlayEpisodeDetailByEpisodeIdQueryKey(resolvedEpisodeApiId ?? ''));

      return mergeDramaPlayFavoriteFields(
        previous as
          | (DramaPlayResponse & { favoriteCount?: number })
          | undefined,
        normalized as
          | (DramaPlayResponse & { favoriteCount?: number })
          | undefined,
        dramaPlayProvidesEpisodeFavoriteCount(raw),
      );
    },
    enabled: queriesEnabled && shouldFetchEpisodePlaybackDetail,
    retry: false,
    staleTime: 0,
  });

  // 缓存已是归一化 play；兼容历史 axios 包装形态
  const episodeDetailPlay = normalizeDramaPlayResponse(
    (() => {
      const raw = episodePlaybackDetailQuery.data;
      if (!raw || typeof raw !== 'object') {
        return undefined;
      }

      if (
        'episodeId' in raw ||
        'favoritedByMe' in raw ||
        'likedByMe' in raw ||
        'mediaAccessUrl' in raw
      ) {
        return raw as DramaPlayResponse;
      }

      return (
        unwrapOrvalPayload<DramaPlayResponse>(raw as { data?: unknown }) ??
        undefined
      );
    })(),
  );
  const hasDetailPlayableSource = hasPlayableEpisodeSource({
    hlsUrl: episodeDetailPlay?.mediaAccessUrl,
    mp4Url: episodeDetailPlay?.videoUrl,
  });
  const episodeListTranscodingError = isPlayEpisodeNotTranscodedError(
    episodesQuery.error,
  );
  const episodeDetailTranscodingError = isPlayEpisodeNotTranscodedError(
    episodePlaybackDetailQuery.error,
  );
  // RQ：无 data 的 error 在 refetch 时会清空 error→pending；锁存避免转码 overlay 闪断
  const isTranscodingNow =
    episodeListTranscodingError || episodeDetailTranscodingError;

  if (hasDetailPlayableSource || hasCurrentEpisodePlayableSource) {
    latchedEpisodeTranscodingRef.current = false;
  } else if (isTranscodingNow) {
    latchedEpisodeTranscodingRef.current = true;
  }

  const episodeDetailTranscodingLatched =
    episodeDetailTranscodingError ||
    (latchedEpisodeTranscodingRef.current &&
      shouldFetchEpisodePlaybackDetail &&
      !hasDetailPlayableSource);
  const isEpisodePlaybackDetailSettled =
    !shouldFetchEpisodePlaybackDetail || episodePlaybackDetailQuery.isFetched;
  const isEpisodePlaybackDetailPending =
    shouldFetchEpisodePlaybackDetail &&
    !isEpisodePlaybackDetailSettled &&
    !episodeDetailTranscodingLatched;
  const canUseListPlaybackSource =
    hasCurrentEpisodePlayableSource &&
    isEpisodePlaybackDetailSettled &&
    !episodeDetailTranscodingLatched &&
    !hasDetailPlayableSource;
  const isEpisodePlaybackDetailError =
    shouldFetchEpisodePlaybackDetail &&
    episodePlaybackDetailQuery.isError &&
    !episodeDetailTranscodingLatched;
  const isEpisodeTranscodingPending =
    isTranscodingNow || latchedEpisodeTranscodingRef.current;
  const isEpisodeDetailError =
    ((isEpisodeDetailEnabled &&
      (episodesQuery.isError ||
        isEpisodePlaybackDetailError ||
        (!episodesQuery.isPending &&
          episodeList.length > 0 &&
          currentEpisodeItem === undefined))) ||
      targetEpisodeError) &&
    !isEpisodeTranscodingPending;

  // 当前集就绪的播放地址：风险厂商浏览器优先 MP4，其余浏览器优先 HLS
  const [playbackUrl, setPlaybackUrl] = useState<string | undefined>();
  const inFlightPlayReportRef = useRef(new Set<string>());
  const inFlightCompleteReportRef = useRef(new Set<string>());

  // 切剧 / 切集：立即清空地址，避免播放器继续用旧片源
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 dramaIdText/effectiveEpisode 触发切剧切集清空
  useLayoutEffect(() => {
    setPlaybackUrl(undefined);
    latchedEpisodeTranscodingRef.current = false;
  }, [dramaIdText, effectiveEpisode]);

  // 切剧时重置上报 in-flight 集合
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 dramaIdText 触发切剧重置，非函数体内引用
  useLayoutEffect(() => {
    inFlightPlayReportRef.current.clear();
    inFlightCompleteReportRef.current.clear();
  }, [dramaIdText]);

  // 单集 detail 判定转码中（121018）时清空列表里可能尚未可用的片源
  useLayoutEffect(() => {
    if (!episodeDetailTranscodingError) {
      return;
    }

    setPlaybackUrl(undefined);
  }, [episodeDetailTranscodingError]);

  useEffect(() => {
    if (!canUseListPlaybackSource) {
      return;
    }

    const incoming = resolveInitialPlaySource({
      hlsUrl: episodePlay?.mediaAccessUrl,
      mp4Url: episodePlay?.videoUrl,
    })?.url;
    const responseEpisodeNo = episodePlay?.episodeNo;

    if (
      responseEpisodeNo !== undefined &&
      responseEpisodeNo !== effectiveEpisode
    ) {
      return;
    }

    if (!incoming) {
      return;
    }

    // 每集只设一次：切集 / 切剧已清空为 undefined，避免窗口重聚焦 refetch
    // 返回新 URL 时覆盖 src 导致播放被 seek(0)+play 打断
    setPlaybackUrl((prev) => (prev === undefined ? incoming : prev));
  }, [
    canUseListPlaybackSource,
    effectiveEpisode,
    episodePlay?.mediaAccessUrl,
    episodePlay?.episodeNo,
    episodePlay?.videoUrl,
  ]);

  useEffect(() => {
    if (episodeDetailTranscodingError || !hasDetailPlayableSource) {
      return;
    }

    const incoming = resolveInitialPlaySource({
      hlsUrl: episodeDetailPlay?.mediaAccessUrl,
      mp4Url: episodeDetailPlay?.videoUrl,
    })?.url;
    const responseEpisodeNo = episodeDetailPlay?.episodeNo;

    if (
      responseEpisodeNo !== undefined &&
      responseEpisodeNo !== effectiveEpisode
    ) {
      return;
    }

    if (!incoming) {
      return;
    }

    setPlaybackUrl(incoming);
  }, [
    effectiveEpisode,
    episodeDetailPlay?.mediaAccessUrl,
    episodeDetailPlay?.episodeNo,
    episodeDetailPlay?.videoUrl,
    episodeDetailTranscodingError,
    hasDetailPlayableSource,
  ]);

  // 有 targetEpisodeId 时持续翻页，直到定位目标、确认不存在或请求失败
  useEffect(() => {
    if (
      !queriesEnabled ||
      !shouldFetchNextEpisodePageForTarget({
        status: targetEpisodeStatus,
        hasNextPage: Boolean(episodesQuery.hasNextPage),
        isFetchingNextPage: episodesQuery.isFetchingNextPage,
      })
    ) {
      return;
    }

    void episodesQuery.fetchNextPage();
  }, [
    episodesQuery.fetchNextPage,
    episodesQuery.hasNextPage,
    episodesQuery.isFetchingNextPage,
    queriesEnabled,
    targetEpisodeStatus,
  ]);

  // 当前集或下一集不在已加载列表中时继续翻页
  useEffect(() => {
    if (!queriesEnabled || targetEpisodeId) {
      return;
    }

    if (
      episodesQuery.isError ||
      episodesQuery.isFetchNextPageError ||
      !episodesQuery.hasNextPage ||
      episodesQuery.isFetchingNextPage
    ) {
      return;
    }

    const hasCurrent = episodeList.some(
      (item) => item.episodeNo === currentEpisode,
    );
    const hasNext = episodeList.some(
      (item) => item.episodeNo === currentEpisode + 1,
    );

    if (
      hasCurrent &&
      (hasNext || episodeTotal === undefined || currentEpisode >= episodeTotal)
    ) {
      return;
    }

    void episodesQuery.fetchNextPage();
  }, [
    currentEpisode,
    episodeList,
    episodeTotal,
    episodesQuery.fetchNextPage,
    episodesQuery.hasNextPage,
    episodesQuery.isError,
    episodesQuery.isFetchNextPageError,
    episodesQuery.isFetchingNextPage,
    queriesEnabled,
    targetEpisodeId,
  ]);

  // 转码中：轮询单集 detail（权威）与分集列表
  useEffect(() => {
    if (!queriesEnabled || !isEpisodeTranscodingPending) {
      return;
    }

    const timer = window.setInterval(() => {
      if (shouldFetchEpisodePlaybackDetail) {
        void episodePlaybackDetailQuery.refetch();
      }
      void episodesQuery.refetch();
    }, EPISODE_TRANSCODE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    episodePlaybackDetailQuery.refetch,
    episodesQuery.refetch,
    isEpisodeTranscodingPending,
    queriesEnabled,
    shouldFetchEpisodePlaybackDetail,
  ]);

  const prefetchEpisodeDetail = (episode: number) => {
    if (
      !queriesEnabled ||
      dramaIdText === undefined ||
      episode <= 0 ||
      (episodeTotal !== undefined && episode > episodeTotal)
    ) {
      return;
    }

    if (episodeList.some((item) => item.episodeNo === episode)) {
      return;
    }

    if (episodesQuery.isError || episodesQuery.isFetchNextPageError) {
      return;
    }

    if (episodesQuery.hasNextPage && !episodesQuery.isFetchingNextPage) {
      void episodesQuery.fetchNextPage();
    }
  };

  /** 分集列表 / 单集 detail 失败后的重试 */
  const refetchEpisodeDetail = () => {
    if (shouldFetchEpisodePlaybackDetail) {
      void episodePlaybackDetailQuery.refetch();
    }
    void episodesQuery.refetch();
  };

  /** 有效播放上报：须已登录；带 watchMs；in-flight 去重 */
  const reportEpisodePlay = (id: string, watchMs?: number) => {
    if (!isLogin || !dramaIdText) {
      return Promise.resolve();
    }

    const inFlightKey = `play:${id}`;
    if (inFlightPlayReportRef.current.has(inFlightKey)) {
      return Promise.resolve();
    }

    inFlightPlayReportRef.current.add(inFlightKey);

    return reportPlayEpisode(dramaId, id, { watchMs })
      .catch(() => undefined)
      .finally(() => {
        inFlightPlayReportRef.current.delete(inFlightKey);
      });
  };

  /** 有效完播上报：须已登录；in-flight 去重，失败后可由 bridge 侧重试 */
  const reportEpisodeComplete = (id: string) => {
    if (!isLogin || !dramaIdText) {
      return Promise.resolve();
    }

    const inFlightKey = `complete:${id}`;
    if (inFlightCompleteReportRef.current.has(inFlightKey)) {
      return Promise.resolve();
    }

    inFlightCompleteReportRef.current.add(inFlightKey);

    return reportCompletePlayEpisode(dramaId, id)
      .catch(() => undefined)
      .finally(() => {
        inFlightCompleteReportRef.current.delete(inFlightKey);
      });
  };

  return {
    dramaIdText,
    dramaDetail,
    isDramaPending: queriesEnabled && isDramaLoading,
    isDramaError: queriesEnabled && isDramaQueryError,
    episodeList,
    episodeTotal,
    episodePlay,
    episodeApiId,
    isEpisodeDetailEnabled,
    isEpisodeListPending,
    isEpisodeDetailError,
    isEpisodeTranscodingPending,
    isEpisodePlaybackDetailPending,
    playbackUrl,
    fallbackMp4Url:
      episodePlay?.videoUrl?.trim() ||
      episodeDetailPlay?.videoUrl?.trim() ||
      undefined,
    hlsUrl:
      episodePlay?.mediaAccessUrl?.trim() ||
      episodeDetailPlay?.mediaAccessUrl?.trim() ||
      undefined,
    prefetchEpisodeDetail,
    refetchEpisodeDetail,
    reportEpisodePlay,
    reportEpisodeComplete,
    resolvedTargetEpisodeNo,
    isResolvingTargetEpisode,
    targetEpisodeNotFound,
    targetEpisodeStatus,
    invalidateEpisodeQueries: () => {
      void queryClient.invalidateQueries({
        queryKey: getPlayDramaEpisodesQueryKey(dramaId, {
          pageSize: EPISODE_LIST_PAGE_SIZE,
        }),
      });
    },
  };
}
