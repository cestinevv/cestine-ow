import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import type { DramaStatisticsResponse } from '@/api/legacy/storyLegacyTypes';
import {
  getPlayDramaDetail,
  getPlayDramaDetailQueryKey,
  getPlayDramaEpisodesQueryKey,
  getPlayMediaDetail,
  getPlayMediaDetailQueryKey,
  togglePlayFavoriteDrama,
  togglePlayFavoriteEpisode,
  togglePlayFavoriteShortVideo,
  togglePlayLikeEpisode,
  togglePlayLikeShortVideo,
} from '@/features/play/playDramaApi';
import {
  invalidateProfileFavoritesQueries,
  patchRecommendFeedFavorite,
  syncPlayDramaDetailFavoriteCount,
  syncPlayDramaDetailFavoritedByMe,
} from '@/features/play/playFavoriteCache';
import {
  dramaPlayProvidesEpisodeFavoriteCount,
  mergeDramaPlayFavoriteFields,
  normalizeDramaPlayResponse,
  readPlayDramaFavoriteCount,
  readPlayDramaFavoritedByMe,
  unwrapOrvalPayload,
} from '@/features/play/playFormat';
import { PlayFeedContentType } from '@/features/play/types/playImmersive';
import { useProfileBlockInteractionGuard } from '@/features/profile/useProfileBlockInteractionGuard';
import { readSnowflakeId } from '@/utils/snowflakeId';

const ENGAGEMENT_STALE_TIME_MS = 15_000;
const ENGAGEMENT_GC_TIME_MS = 10 * 60_000;

type UsePlayEpisodeEngagementArgs = {
  dramaId: string;
  episodeId?: string;
  contentType?: string;
  /** 单集快照：点赞/评论/favoritedByMe；Feed 亦带 episode.favoriteCount */
  snapshot?: DramaPlayResponse;
  /**
   * 整剧收藏态初值：剧详情即将回显的 `favoritedByMe`。
   * 仅短剧 Tab 书签使用，与播放栏单集收藏分离。
   */
  dramaFavoritedByMe?: boolean;
  /** 整剧收藏数：剧详情 totalFavoriteCount（仅短剧 Tab） */
  dramaFavoriteCount?: number;
  isLogin: boolean;
  creatorUserId?: string;
};

type LikeOverlay = {
  likedByMe: boolean;
  likeCount?: number;
};

type LikeSnapshot = {
  likedByMe?: boolean;
  likeCount?: number;
};

type FavoriteOverlay = {
  favoritedByMe: boolean;
  favoriteCount?: number;
};

/** 互动层播放数据：生成模型暂无 favoriteCount，运行时由 Feed / 列表注入 */
type PlayEngagementData = DramaPlayResponse & {
  favoriteCount?: number;
};

function readEpisodeFavoriteCount(
  play: DramaPlayResponse | undefined,
): number | undefined {
  return (play as PlayEngagementData | undefined)?.favoriteCount;
}

async function fetchEpisodeEngagement(
  episodeId: string,
  contentType: string | undefined,
  signal?: AbortSignal,
): Promise<{
  raw: DramaPlayResponse | undefined;
  normalized: (DramaPlayResponse & { favoriteCount?: number }) | undefined;
}> {
  const response = await getPlayMediaDetail(episodeId, contentType, { signal });
  const raw = unwrapOrvalPayload<DramaPlayResponse>(response) ?? undefined;

  return {
    raw,
    normalized: normalizeDramaPlayResponse(raw) as
      | (DramaPlayResponse & { favoriteCount?: number })
      | undefined,
  };
}

/**
 * 单集 detail 缓存可能是归一化 DramaPlayResponse，也可能是历史 axios 包装。
 * 侧栏媒体层与互动层共用 queryKey，读取时必须兼容两种形态。
 */
function coerceCachedDramaPlay(
  data: unknown,
): (DramaPlayResponse & { favoriteCount?: number }) | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const asPlay =
    'episodeId' in data ||
    'favoritedByMe' in data ||
    'likedByMe' in data ||
    'mediaAccessUrl' in data
      ? (data as DramaPlayResponse & { favoriteCount?: number })
      : (unwrapOrvalPayload<DramaPlayResponse & { favoriteCount?: number }>(
          data as { data?: unknown },
        ) ?? undefined);

  return normalizeDramaPlayResponse(asPlay) as
    | (DramaPlayResponse & { favoriteCount?: number })
    | undefined;
}

/**
 * 当前集互动层：Feed / 分集列表快照立即展示；仅在点赞、收藏或显式 refresh（如开评论）时拉单集详情校正。
 *
 * 收藏约定（三维）：
 * - 播放栏 / Feed：单集或短视频 → episodeId 维度
 * - 短剧 Tab 头图：整剧 → dramaId 维度（toggleDramaFavorite）
 * - overlay 仅乐观；权威写入 Query / Feed 后清除
 */
export function usePlayEpisodeEngagement({
  dramaId,
  episodeId,
  contentType,
  snapshot,
  dramaFavoritedByMe,
  dramaFavoriteCount,
  isLogin,
  creatorUserId,
}: UsePlayEpisodeEngagementArgs) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { guardBlockedInteraction } =
    useProfileBlockInteractionGuard(creatorUserId);
  const episodeIdText = readSnowflakeId(episodeId);
  const dramaIdText = readSnowflakeId(dramaId);
  const isShortVideo = contentType === PlayFeedContentType.ShortVideo;
  const [requestedEpisodeId, setRequestedEpisodeId] = useState<string>();
  const [likeOverlays, setLikeOverlays] = useState<Record<string, LikeOverlay>>(
    {},
  );
  const [likePendingEpisodeId, setLikePendingEpisodeId] = useState<string>();
  const [favoriteOverlays, setFavoriteOverlays] = useState<
    Record<string, FavoriteOverlay>
  >({});
  const [favoritePendingKey, setFavoritePendingKey] = useState<string>();
  const [dramaFavoriteOverlay, setDramaFavoriteOverlay] = useState<
    FavoriteOverlay | undefined
  >();
  const [isDramaFavoritePending, setIsDramaFavoritePending] = useState(false);
  /** 本会话已对某集写入收藏权威（toggle / 校正），此后该集可信详情缓存 */
  const episodeFavoriteAuthorityRef = useRef<Set<string>>(new Set());

  /** 播放栏收藏一律按当前集 / 短视频条 */
  const favoriteScopeKey = episodeIdText;

  const queryKey = getPlayMediaDetailQueryKey(episodeIdText ?? '', contentType);
  // 仅点赞 / 收藏 / refresh 等显式意图才拉 detail，不再「播满 1 秒」自动校正
  const queryEnabled =
    Boolean(episodeIdText) && requestedEpisodeId === episodeIdText;

  const episodeQuery = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const { raw, normalized } = await fetchEpisodeEngagement(
        episodeIdText ?? '',
        contentType,
        signal,
      );
      const previous =
        coerceCachedDramaPlay(queryClient.getQueryData(queryKey)) ??
        coerceCachedDramaPlay(snapshot);

      return mergeDramaPlayFavoriteFields(
        previous,
        normalized,
        dramaPlayProvidesEpisodeFavoriteCount(raw),
      );
    },
    enabled: queryEnabled,
    placeholderData: snapshot,
    staleTime: ENGAGEMENT_STALE_TIME_MS,
    gcTime: ENGAGEMENT_GC_TIME_MS,
    retry: false,
  });

  // 禁用 query 时仍可能读到旧详情缓存；无单集 favoriteCount 时信 Feed/列表快照
  const cachedEngagement = coerceCachedDramaPlay(episodeQuery.data);
  const snapshotEngagement =
    coerceCachedDramaPlay(snapshot) ??
    (snapshot as PlayEngagementData | undefined);
  const engagement = mergeDramaPlayFavoriteFields(
    snapshotEngagement,
    cachedEngagement ?? snapshotEngagement,
    dramaPlayProvidesEpisodeFavoriteCount(cachedEngagement),
  );

  const resolveLikeState = (
    rawEpisodeId?: string,
    listSnapshot?: LikeSnapshot,
  ) => {
    const targetId = readSnowflakeId(rawEpisodeId);
    if (!isLogin || !targetId) {
      return {
        likedByMe: false,
        likeCount: listSnapshot?.likeCount,
      };
    }

    const overlay = likeOverlays[targetId];
    if (overlay) {
      return {
        likedByMe: overlay.likedByMe,
        likeCount: overlay.likeCount ?? listSnapshot?.likeCount,
      };
    }

    if (targetId === episodeIdText) {
      return {
        likedByMe: engagement?.likedByMe ?? false,
        likeCount: engagement?.likeCount ?? listSnapshot?.likeCount,
      };
    }

    const cached = coerceCachedDramaPlay(
      queryClient.getQueryData(
        getPlayMediaDetailQueryKey(targetId, contentType),
      ),
    );

    return {
      likedByMe: cached?.likedByMe ?? listSnapshot?.likedByMe ?? false,
      likeCount: cached?.likeCount ?? listSnapshot?.likeCount,
    };
  };

  const likedByMe = resolveLikeState(episodeIdText, {
    likedByMe: engagement?.likedByMe,
    likeCount: engagement?.likeCount,
  }).likedByMe;

  const resolveFavoriteState = (
    rawEpisodeId?: string,
    listSnapshot?: { favoritedByMe?: boolean; favoriteCount?: number },
  ) => {
    const targetId = readSnowflakeId(rawEpisodeId);
    const overlay = targetId ? favoriteOverlays[targetId] : undefined;

    if (overlay) {
      return {
        favoritedByMe: isLogin ? overlay.favoritedByMe : false,
        favoriteCount: overlay.favoriteCount ?? listSnapshot?.favoriteCount,
      };
    }

    if (!targetId) {
      return {
        favoritedByMe: false,
        favoriteCount: listSnapshot?.favoriteCount,
      };
    }

    if (targetId === episodeIdText) {
      // Feed/列表快照优先；仅本会话写过收藏权威后才信详情缓存（避免旧剧级 favoritedByMe 点亮）
      const trustCacheFavorite =
        episodeFavoriteAuthorityRef.current.has(targetId) ||
        listSnapshot?.favoritedByMe === undefined;

      return {
        favoritedByMe: isLogin
          ? Boolean(
              trustCacheFavorite
                ? (engagement?.favoritedByMe ?? listSnapshot?.favoritedByMe)
                : (listSnapshot?.favoritedByMe ?? engagement?.favoritedByMe),
            )
          : false,
        favoriteCount:
          readEpisodeFavoriteCount(engagement) ?? listSnapshot?.favoriteCount,
      };
    }

    const cached = coerceCachedDramaPlay(
      queryClient.getQueryData(
        getPlayMediaDetailQueryKey(targetId, contentType),
      ),
    );

    return {
      favoritedByMe: isLogin
        ? (cached?.favoritedByMe ?? listSnapshot?.favoritedByMe ?? false)
        : false,
      favoriteCount:
        readEpisodeFavoriteCount(cached) ?? listSnapshot?.favoriteCount,
    };
  };

  const favoriteState = resolveFavoriteState(episodeIdText, {
    favoritedByMe: snapshotEngagement?.favoritedByMe,
    favoriteCount: readEpisodeFavoriteCount(snapshotEngagement),
  });
  const favoritedByMe = favoriteState.favoritedByMe;
  const favoriteCount = favoriteState.favoriteCount;

  const dramaFavoritedByMeResolved = isLogin
    ? (dramaFavoriteOverlay?.favoritedByMe ?? dramaFavoritedByMe ?? false)
    : false;
  const dramaFavoriteCountResolved =
    dramaFavoriteOverlay?.favoriteCount ?? dramaFavoriteCount;

  // 换剧后清掉整剧收藏乐观态，改信新剧详情
  // biome-ignore lint/correctness/useExhaustiveDependencies: dramaId 变化即重置
  useEffect(() => {
    setDramaFavoriteOverlay(undefined);
  }, [dramaIdText]);

  const likeMutation = useMutation({
    mutationFn: ({ episodeId }: { desired: boolean; episodeId: string }) =>
      isShortVideo
        ? togglePlayLikeShortVideo(episodeId)
        : togglePlayLikeEpisode(dramaIdText ?? '', episodeId),
    onMutate: async ({ desired, episodeId }) => {
      const targetKey = getPlayMediaDetailQueryKey(episodeId, contentType);
      await queryClient.cancelQueries({ queryKey: targetKey });
      const previous = queryClient.getQueryData<DramaPlayResponse | undefined>(
        targetKey,
      );
      queryClient.setQueryData<DramaPlayResponse | undefined>(
        targetKey,
        (current) => ({
          ...(current ??
            (episodeId === episodeIdText ? snapshot : undefined) ??
            {}),
          likedByMe: desired,
          likeCount:
            (current ?? (episodeId === episodeIdText ? snapshot : undefined))
              ?.likeCount === undefined
              ? undefined
              : Math.max(
                  0,
                  ((
                    current ??
                    (episodeId === episodeIdText ? snapshot : undefined)
                  )?.likeCount ?? 0) + (desired ? 1 : -1),
                ),
        }),
      );
      return { previous, targetKey };
    },
    onError: (_error, _variables, context) => {
      if (!context?.targetKey) {
        return;
      }

      queryClient.setQueryData(context.targetKey, context.previous);
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ episodeId }: { desired: boolean; episodeId: string }) =>
      isShortVideo
        ? togglePlayFavoriteShortVideo(episodeId)
        : togglePlayFavoriteEpisode(episodeId),
    onMutate: async ({ desired, episodeId }) => {
      const targetKey = getPlayMediaDetailQueryKey(episodeId, contentType);
      await queryClient.cancelQueries({ queryKey: targetKey });
      const previous = queryClient.getQueryData<DramaPlayResponse | undefined>(
        targetKey,
      );
      const baseline =
        (previous as PlayEngagementData | undefined) ??
        (episodeId === episodeIdText
          ? (snapshot as PlayEngagementData | undefined)
          : undefined);
      queryClient.setQueryData<PlayEngagementData | undefined>(
        targetKey,
        (current) => {
          const source =
            (current as PlayEngagementData | undefined) ?? baseline ?? {};
          return {
            ...source,
            favoritedByMe: desired,
            favoriteCount:
              source.favoriteCount === undefined
                ? undefined
                : Math.max(0, source.favoriteCount + (desired ? 1 : -1)),
          };
        },
      );
      return { previous, targetKey };
    },
    onError: (_error, _variables, context) => {
      if (!context?.targetKey) {
        return;
      }

      queryClient.setQueryData(context.targetKey, context.previous);
    },
  });

  const dramaFavoriteMutation = useMutation({
    mutationFn: () => togglePlayFavoriteDrama(dramaIdText ?? ''),
  });

  const fetchAuthorityFor = (targetEpisodeId: string, force = false) => {
    const targetKey = getPlayMediaDetailQueryKey(targetEpisodeId, contentType);
    if (targetEpisodeId === episodeIdText) {
      setRequestedEpisodeId(targetEpisodeId);
    }

    return queryClient.fetchQuery({
      queryKey: targetKey,
      queryFn: async ({ signal }) => {
        const { raw, normalized } = await fetchEpisodeEngagement(
          targetEpisodeId,
          contentType,
          signal,
        );
        const previous =
          coerceCachedDramaPlay(queryClient.getQueryData(targetKey)) ??
          (targetEpisodeId === episodeIdText
            ? coerceCachedDramaPlay(snapshot)
            : undefined);

        return mergeDramaPlayFavoriteFields(
          previous,
          normalized,
          dramaPlayProvidesEpisodeFavoriteCount(raw),
        );
      },
      staleTime: force ? 0 : ENGAGEMENT_STALE_TIME_MS,
      gcTime: ENGAGEMENT_GC_TIME_MS,
    });
  };

  const fetchAuthority = (force = false) => {
    if (!episodeIdText) {
      return Promise.resolve(undefined);
    }

    return fetchAuthorityFor(episodeIdText, force);
  };

  const clearFavoriteOverlay = (scopeKey: string) => {
    setFavoriteOverlays((current) => {
      if (!(scopeKey in current)) {
        return current;
      }

      const next = { ...current };
      delete next[scopeKey];
      return next;
    });
  };

  /** 单集 / 短视频收藏权威写入：当前集 cache + Feed（仅 episodeId） */
  const writeEpisodeFavoriteAuthorityToCaches = ({
    favoritedByMeValue,
    favoriteCountValue,
    episodePlay,
    targetEpisodeId,
  }: {
    favoritedByMeValue: boolean;
    favoriteCountValue?: number;
    episodePlay?: DramaPlayResponse;
    targetEpisodeId?: string;
  }) => {
    const id = targetEpisodeId ?? episodeIdText;
    if (!id) {
      return;
    }

    episodeFavoriteAuthorityRef.current.add(id);

    queryClient.setQueryData<PlayEngagementData | undefined>(
      getPlayMediaDetailQueryKey(id, contentType),
      (current) => ({
        ...(current ?? episodePlay ?? snapshot ?? {}),
        favoritedByMe: favoritedByMeValue,
        favoriteCount: favoriteCountValue,
      }),
    );

    patchRecommendFeedFavorite(queryClient, {
      episodeId: id,
      favoritedByMe: favoritedByMeValue,
      favoriteCount: favoriteCountValue,
    });
  };

  const toggleLikeByEpisodeId = async (
    rawEpisodeId: string,
    listSnapshot?: LikeSnapshot,
  ) => {
    if (!guardBlockedInteraction('like')) {
      return;
    }

    const targetId = readSnowflakeId(rawEpisodeId);
    if (!targetId || (!isShortVideo && !dramaIdText) || likePendingEpisodeId) {
      return;
    }

    const baseline = resolveLikeState(targetId, listSnapshot);
    const desired = !baseline.likedByMe;
    const optimisticCount =
      baseline.likeCount === undefined
        ? undefined
        : Math.max(0, baseline.likeCount + (desired ? 1 : -1));

    setLikeOverlays((current) => ({
      ...current,
      [targetId]: { likedByMe: desired, likeCount: optimisticCount },
    }));
    setLikePendingEpisodeId(targetId);

    try {
      await likeMutation.mutateAsync({ desired, episodeId: targetId });

      void fetchAuthorityFor(targetId, true)
        .then((refreshed) => {
          if (!refreshed) {
            return;
          }

          const targetKey = getPlayMediaDetailQueryKey(targetId, contentType);
          const serverLiked = Boolean(refreshed.likedByMe);

          if (serverLiked !== desired) {
            queryClient.setQueryData<DramaPlayResponse | undefined>(
              targetKey,
              (current) => ({
                ...(current ?? refreshed),
                likedByMe: desired,
                likeCount:
                  optimisticCount ?? current?.likeCount ?? refreshed.likeCount,
              }),
            );
            return;
          }

          setLikeOverlays((current) => ({
            ...current,
            [targetId]: {
              likedByMe: serverLiked,
              likeCount: refreshed.likeCount ?? optimisticCount,
            },
          }));
        })
        .catch(() => {
          // 校正失败保留乐观态
        });
    } catch {
      setLikeOverlays((current) => {
        const next = { ...current };
        delete next[targetId];
        return next;
      });
      toast.error(t('再试一次'));
    } finally {
      setLikePendingEpisodeId((current) =>
        current === targetId ? undefined : current,
      );
    }
  };

  const toggleLike = async () => {
    if (!episodeIdText) {
      return;
    }

    await toggleLikeByEpisodeId(episodeIdText, {
      likedByMe: engagement?.likedByMe,
      likeCount: engagement?.likeCount,
    });
  };

  const toggleFavorite = async () => {
    if (!guardBlockedInteraction('favorite')) {
      return;
    }

    if (!episodeIdText || !favoriteScopeKey || favoritePendingKey) {
      return;
    }

    const baseline = resolveFavoriteState(episodeIdText, {
      favoritedByMe: engagement?.favoritedByMe,
      favoriteCount: readEpisodeFavoriteCount(engagement),
    });
    const desired = !baseline.favoritedByMe;
    const optimisticCount =
      baseline.favoriteCount === undefined
        ? undefined
        : Math.max(0, baseline.favoriteCount + (desired ? 1 : -1));

    setFavoriteOverlays((current) => ({
      ...current,
      [favoriteScopeKey]: {
        favoritedByMe: desired,
        favoriteCount: optimisticCount,
      },
    }));
    setFavoritePendingKey(favoriteScopeKey);

    writeEpisodeFavoriteAuthorityToCaches({
      favoritedByMeValue: desired,
      favoriteCountValue: optimisticCount,
      episodePlay: engagement,
      targetEpisodeId: episodeIdText,
    });

    try {
      await favoriteMutation.mutateAsync({
        desired,
        episodeId: episodeIdText,
      });

      void fetchAuthority(true)
        .then((refreshed) => {
          if (!refreshed) {
            return;
          }

          const serverFavorited = Boolean(refreshed.favoritedByMe);
          const serverCount =
            readEpisodeFavoriteCount(refreshed) ?? optimisticCount;

          // 写库短暂滞后：detail 未追上则保留乐观态，避免回闪
          if (serverFavorited !== desired) {
            writeEpisodeFavoriteAuthorityToCaches({
              favoritedByMeValue: desired,
              favoriteCountValue: optimisticCount,
              episodePlay: refreshed,
              targetEpisodeId: episodeIdText,
            });
            return;
          }

          writeEpisodeFavoriteAuthorityToCaches({
            favoritedByMeValue: serverFavorited,
            favoriteCountValue: serverCount,
            episodePlay: refreshed,
            targetEpisodeId: episodeIdText,
          });
          clearFavoriteOverlay(favoriteScopeKey);
          invalidateProfileFavoritesQueries(queryClient);
        })
        .catch(() => {
          // 校正失败保留乐观态 / overlay
        });

      if (!isShortVideo && dramaIdText) {
        void queryClient.invalidateQueries({
          queryKey: getPlayDramaEpisodesQueryKey(dramaIdText),
        });
      }
    } catch {
      writeEpisodeFavoriteAuthorityToCaches({
        favoritedByMeValue: baseline.favoritedByMe,
        favoriteCountValue: baseline.favoriteCount,
        episodePlay: engagement,
        targetEpisodeId: episodeIdText,
      });
      clearFavoriteOverlay(favoriteScopeKey);
      toast.error(t('再试一次'));
    } finally {
      setFavoritePendingKey((current) =>
        current === favoriteScopeKey ? undefined : current,
      );
    }
  };

  /** 短剧 Tab：整剧收藏 / 取消，与播放栏单集收藏独立 */
  const toggleDramaFavorite = async () => {
    if (!guardBlockedInteraction('favorite')) {
      return;
    }

    if (!dramaIdText || isShortVideo || isDramaFavoritePending) {
      return;
    }

    const baselineFavorited = dramaFavoritedByMeResolved;
    const baselineCount = dramaFavoriteCountResolved;
    const desired = !baselineFavorited;
    const optimisticCount =
      baselineCount === undefined
        ? undefined
        : Math.max(0, baselineCount + (desired ? 1 : -1));

    setDramaFavoriteOverlay({
      favoritedByMe: desired,
      favoriteCount: optimisticCount,
    });
    setIsDramaFavoritePending(true);
    syncPlayDramaDetailFavoritedByMe(queryClient, dramaIdText, desired);
    syncPlayDramaDetailFavoriteCount(queryClient, dramaIdText, optimisticCount);

    try {
      await dramaFavoriteMutation.mutateAsync();

      void queryClient
        .fetchQuery({
          queryKey: getPlayDramaDetailQueryKey(dramaIdText),
          queryFn: ({ signal }) => getPlayDramaDetail(dramaIdText, { signal }),
          staleTime: 0,
          gcTime: ENGAGEMENT_GC_TIME_MS,
        })
        .then((dramaResponse) => {
          const detail =
            unwrapOrvalPayload<DramaStatisticsResponse>(dramaResponse) ??
            undefined;
          const serverFavorited =
            readPlayDramaFavoritedByMe(detail?.dramaInfo) ?? desired;
          const serverCount =
            readPlayDramaFavoriteCount(detail?.dramaInfo) ?? optimisticCount;

          if (serverFavorited !== desired) {
            syncPlayDramaDetailFavoritedByMe(queryClient, dramaIdText, desired);
            syncPlayDramaDetailFavoriteCount(
              queryClient,
              dramaIdText,
              optimisticCount,
            );
            return;
          }

          syncPlayDramaDetailFavoritedByMe(
            queryClient,
            dramaIdText,
            serverFavorited,
          );
          syncPlayDramaDetailFavoriteCount(
            queryClient,
            dramaIdText,
            serverCount,
          );
          setDramaFavoriteOverlay(undefined);
          invalidateProfileFavoritesQueries(queryClient);
        })
        .catch(() => {
          // 校正失败保留乐观态
        });
    } catch {
      setDramaFavoriteOverlay(undefined);
      syncPlayDramaDetailFavoritedByMe(
        queryClient,
        dramaIdText,
        baselineFavorited,
      );
      syncPlayDramaDetailFavoriteCount(queryClient, dramaIdText, baselineCount);
      toast.error(t('再试一次'));
    } finally {
      setIsDramaFavoritePending(false);
    }
  };

  // 兼容旧调用点：不再因播放触发 detail
  const markPlaying = () => {};
  const markPaused = () => {};

  const favoriteOverlay = favoriteScopeKey
    ? favoriteOverlays[favoriteScopeKey]
    : undefined;
  const likeOverlay = episodeIdText ? likeOverlays[episodeIdText] : undefined;

  return {
    episodePlay: engagement
      ? {
          ...engagement,
          likedByMe: likeOverlay?.likedByMe ?? engagement.likedByMe,
          likeCount: likeOverlay?.likeCount ?? engagement.likeCount,
          favoritedByMe:
            favoriteOverlay?.favoritedByMe ?? engagement.favoritedByMe,
          favoriteCount,
        }
      : engagement,
    likedByMe,
    favoritedByMe,
    favoriteCount,
    dramaFavoritedByMe: dramaFavoritedByMeResolved,
    dramaFavoriteCount: dramaFavoriteCountResolved,
    isLikePending:
      Boolean(episodeIdText) &&
      (likePendingEpisodeId === episodeIdText || likeMutation.isPending),
    isFavoritePending:
      Boolean(favoriteScopeKey) &&
      (favoritePendingKey === favoriteScopeKey || favoriteMutation.isPending),
    isDramaFavoritePending:
      isDramaFavoritePending || dramaFavoriteMutation.isPending,
    markPlaying,
    markPaused,
    refresh: () => fetchAuthority(true),
    resolveLikeState,
    toggleLike,
    toggleFavorite,
    toggleDramaFavorite,
  };
}
