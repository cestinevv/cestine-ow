import { useNavigate } from '@tanstack/react-router';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import { Button } from '@/components/ui/button';
import { PlayCommentDialog } from '@/features/play/components/PlayCommentDialog';
import {
  PlayMediaErrorOverlay,
  PlayMediaLoadingOverlay,
  PlayMediaTranscodingOverlay,
} from '@/features/play/components/PlayMediaFeedback';
import { PlayWatchEpisodeBar } from '@/features/play/components/PlayWatchControlsBar';
import { PlayWatchEpisodeSheet } from '@/features/play/components/PlayWatchEpisodeSheet';
import {
  PlayWatchInteractionRail,
  PlayWatchMetaPanel,
} from '@/features/play/components/PlayWatchOverlayPanels';
import { PlayWatchProgressSlider } from '@/features/play/components/PlayWatchProgressSlider';
import { PlayWatchVideoPlayer } from '@/features/play/components/PlayWatchVideoPlayer';
import {
  readStoredPlayContinuousPlay,
  storePlayContinuousPlay,
} from '@/features/play/constants/playContinuousPlay';
import { usePlayAdjacentMediaPreload } from '@/features/play/hooks/usePlayAdjacentMediaPreload';
import { usePlayEpisodeEngagement } from '@/features/play/hooks/usePlayEpisodeEngagement';
import { usePlayEpisodeMedia } from '@/features/play/hooks/usePlayEpisodeMedia';
import { usePlayEpisodeMetricsBridge } from '@/features/play/hooks/usePlayEpisodeMetricsBridge';
import { usePlayNavigateInput } from '@/features/play/hooks/usePlayNavigateInput';
import { usePlayRequireLogin } from '@/features/play/hooks/usePlayRequireLogin';
import {
  isGestureBlockedTarget,
  type PlayWatchEpisodeSlideDirection,
  playWatchStopGestureBubble,
  usePlayWatchEpisodeGesture,
} from '@/features/play/hooks/usePlayWatchEpisodeGesture';
import { usePlayWatchHistoryReporter } from '@/features/play/hooks/usePlayWatchHistoryReporter';
import {
  reportCompletePlayShortVideo,
  reportPlayShortVideo,
} from '@/features/play/playDramaApi';
import {
  readPlayDramaProgressEntry,
  writePlayDramaProgressEntry,
} from '@/features/play/playDramaProgressStore';
import {
  resolvePendingEpisodeTargetId,
  shouldGateExplicitEpisodePlayback,
} from '@/features/play/playEpisodeTargetPolicy';
import {
  getEpisodeApiIdForRequests,
  getPlayDramaInfoCreatorUserId,
  mapFeedItemToDramaInfo,
  mapFeedItemToDramaPlayResponse,
  mergeDramaInfoFromPlayCreator,
  parsePlayDramaId,
  readPlayDramaFavoriteCount,
  readPlayDramaFavoritedByMe,
  resolvePlayDetailRoles,
} from '@/features/play/playFormat';
import {
  clearFullSeriesPlaybackHandoff,
  isFullSeriesPlaybackHandoffMatch,
  readFullSeriesPlaybackHandoff,
  writeFullSeriesPlaybackHandoff,
} from '@/features/play/playFullSeriesPlaybackHandoff';
import {
  clearPlayImmersiveReturn,
  exitPlayImmersiveToReturn,
  isPlayDramaImmersivePath,
  isPlayDramaWatchPath,
  rememberPlayImmersiveReturnIfNeeded,
} from '@/features/play/playImmersiveReturn';
import { usePlayPlaylistStore } from '@/features/play/playPlaylistStore';
import {
  normalizePlaybackTime,
  normalizeRecommendPlaybackTime,
  type PlaybackEntryReason,
  resolveCompletedDramaEntry,
  resolveContentKeyPlaybackEntryReason,
  resolveExplicitAutoplayEntryKey,
  resolveInitialDramaPlayback,
  shouldAutoplayForEntryReason,
  shouldForegroundAutoResume,
} from '@/features/play/playProgressPolicy';
import {
  getFeedItemContentType,
  getFeedItemMediaAccessUrl,
} from '@/features/play/playRecommendFeed';
import {
  type RecommendPlaybackSession,
  readPlayRecommendSession,
  updatePlayRecommendSession,
} from '@/features/play/playRecommendSessionStore';
import { buildPlayShareText } from '@/features/play/playShare';
import {
  isHlsUrl,
  resolveFeedPlaySource,
  resolveInitialPlaySource,
} from '@/features/play/playSourceResolver';
import {
  exitDocumentFullscreen,
  findPlayWatchPlayerRoot,
  findPlayWatchVideoElement,
} from '@/features/play/playViewportFullscreen';
import { resolvePlayEpisodeSelectionSearch } from '@/features/play/playWatchNavigation';
import {
  isWorkListPlaylistSource,
  PlayFeedContentType,
  PlayImmersiveSideTab,
  type RecommendPlaybackScope,
} from '@/features/play/types/playImmersive';
import { useProfileBlockInteractionGuard } from '@/features/profile/useProfileBlockInteractionGuard';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { cn, readSnowflakeId } from '@/utils';

/** 首页推荐 H5：上下滑切换 Feed 条目（非本剧上下集） */
export type PlayWatchFeedMode = {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onNotInterested?: () => void;
};

type PlayWatchViewProps = {
  dramaId: string;
  feedItem?: FeedItemResponse;
  initialEpisode?: number;
  initialEpisodeId?: string;
  targetCommentId?: string;
  initialCommentOpen?: boolean;
  /** 推荐 Feed 模式：滑切换条、直出 mediaAccessUrl、隐藏返回 */
  feedMode?: PlayWatchFeedMode;
  /** 覆盖默认 h-dvh（嵌入底栏时用 calc 高度） */
  rootClassName?: string;
  /** 路由显式 autoplay=1：仅覆盖这次入口的初始恢复 */
  explicitAutoplay?: boolean;
  recommendSessionScope?: RecommendPlaybackScope;
  /** 短视频不走 drama media hook 时，由父层告知转码中 */
  isMediaTranscodingPending?: boolean;
};

const WATCH_TAP_MAX_DISPLACEMENT_PX = 28;
const WATCH_TAP_MAX_DURATION_MS = 300;
const WATCH_AUTO_NEXT_DELAY_MS = 1200;
const PLAY_PROGRESS_FLUSH_INTERVAL_MS = 2000;

function reportShortVideoPlayForMetrics(episodeId: string, watchMs?: number) {
  return reportPlayShortVideo(episodeId, { watchMs });
}

function reportShortVideoCompleteForMetrics(episodeId: string) {
  return reportCompletePlayShortVideo(episodeId);
}

type WatchTouchTapState = {
  id: number;
  x: number;
  y: number;
  time: number;
};

function buildRecommendActiveKey(args: {
  contentType?: string;
  dramaId?: string;
  episodeId?: string;
}): RecommendPlaybackSession['activeKey'] | undefined {
  const episodeId = readSnowflakeId(args.episodeId);
  if (!episodeId) {
    return undefined;
  }

  const contentType =
    args.contentType === PlayFeedContentType.ShortVideo
      ? PlayFeedContentType.ShortVideo
      : PlayFeedContentType.DramaEpisode;
  const dramaId = readSnowflakeId(args.dramaId);

  return {
    contentType,
    ...(dramaId ? { dramaId } : {}),
    episodeId,
  };
}

function isSameRecommendActiveKey(
  left?: RecommendPlaybackSession['activeKey'],
  right?: RecommendPlaybackSession['activeKey'],
): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.contentType === right.contentType &&
    left.dramaId === right.dramaId &&
    left.episodeId === right.episodeId
  );
}

export function PlayWatchView({
  dramaId,
  feedItem,
  initialEpisode,
  initialEpisodeId,
  targetCommentId,
  initialCommentOpen = false,
  feedMode,
  rootClassName,
  explicitAutoplay = false,
  recommendSessionScope,
  isMediaTranscodingPending = false,
}: PlayWatchViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobileViewport = useMobileViewport();
  const { isLogin, requireLogin } = usePlayRequireLogin();
  const playlistSource = usePlayPlaylistStore((state) => state.source);
  const fromWorkListPlaylist = isWorkListPlaylistSource(playlistSource);

  const dramaIdText = parsePlayDramaId(dramaId);
  const feedContentType = getFeedItemContentType(feedItem);
  const isShortVideo = feedContentType === PlayFeedContentType.ShortVideo;
  const isFeedMode = feedMode !== undefined;
  const shortVideoEpisodeId = readSnowflakeId(feedItem?.episode?.episodeId);
  const contentKeyText = isShortVideo
    ? shortVideoEpisodeId
    : (readSnowflakeId(feedItem?.episode?.episodeId) ?? dramaIdText);
  const routeTargetEpisodeId =
    !isFeedMode && !isShortVideo
      ? readSnowflakeId(initialEpisodeId)
      : undefined;
  const routeTargetIdentity =
    dramaIdText && routeTargetEpisodeId
      ? `${dramaIdText}:${routeTargetEpisodeId}`
      : undefined;
  const [initialFullSeriesHandoff] = useState(readFullSeriesPlaybackHandoff);
  const fullSeriesHandoff =
    !isFeedMode &&
    !isShortVideo &&
    isFullSeriesPlaybackHandoffMatch(initialFullSeriesHandoff, {
      dramaId: dramaIdText,
      episodeId: routeTargetEpisodeId,
      episodeNo: initialEpisode,
    })
      ? initialFullSeriesHandoff
      : undefined;
  const explicitAutoplayEntryKey = contentKeyText
    ? `${contentKeyText}:${routeTargetEpisodeId ?? initialEpisode ?? 'default'}`
    : undefined;
  const recommendActiveKey = useMemo(
    () =>
      buildRecommendActiveKey({
        contentType: feedContentType,
        dramaId: dramaIdText,
        episodeId: shortVideoEpisodeId,
      }),
    [dramaIdText, feedContentType, shortVideoEpisodeId],
  );
  const recommendRestoreSession = useMemo(
    () =>
      isFeedMode && recommendActiveKey && recommendSessionScope
        ? readPlayRecommendSession(recommendSessionScope)
        : undefined,
    [isFeedMode, recommendActiveKey, recommendSessionScope],
  );
  const shouldRestoreRecommendPlayback = isSameRecommendActiveKey(
    recommendRestoreSession?.activeKey,
    recommendActiveKey,
  );
  const recommendRestorePaused = shouldRestoreRecommendPlayback
    ? recommendRestoreSession?.paused
    : undefined;
  const dramaRestoreState = useMemo(
    () =>
      !isFeedMode && !isShortVideo && dramaIdText
        ? resolveInitialDramaPlayback({
            explicitEpisodeId: initialEpisodeId,
            explicitEpisodeNo: initialEpisode,
            savedEntry: readPlayDramaProgressEntry(dramaIdText),
          })
        : undefined,
    [dramaIdText, initialEpisode, initialEpisodeId, isFeedMode, isShortVideo],
  );
  const resolvedInitialEpisode = fullSeriesHandoff
    ? fullSeriesHandoff.episodeNo
    : shouldRestoreRecommendPlayback
      ? (initialEpisode ?? feedItem?.episode?.episodeNo ?? 1)
      : (dramaRestoreState?.episodeNo ?? initialEpisode ?? 1);
  const resolvedInitialSeekTime = fullSeriesHandoff
    ? fullSeriesHandoff.currentTime
    : shouldRestoreRecommendPlayback
      ? normalizeRecommendPlaybackTime(
          recommendRestoreSession?.currentTime ?? 0,
        )
      : (dramaRestoreState?.currentTime ?? 0);
  const initialPlaybackEntryReason: PlaybackEntryReason = fullSeriesHandoff
    ? fullSeriesHandoff.paused
      ? 'history-restore'
      : 'explicit-target'
    : resolveContentKeyPlaybackEntryReason({
        shouldRestoreRecommendPlayback,
        restoredFromHistory: dramaRestoreState?.restoredFromHistory,
        hasExplicitEpisodeId: routeTargetEpisodeId !== undefined,
        hasExplicitEpisodeNo: initialEpisode !== undefined,
        fromWorkListPlaylist,
      });
  const [playbackEntryReason, setPlaybackEntryReason] =
    useState<PlaybackEntryReason>(initialPlaybackEntryReason);
  const [latchedExplicitAutoplayEntryKey, setLatchedExplicitAutoplayEntryKey] =
    useState(() => (explicitAutoplay ? explicitAutoplayEntryKey : undefined));
  const applyExplicitAutoplay =
    explicitAutoplay ||
    (explicitAutoplayEntryKey !== undefined &&
      latchedExplicitAutoplayEntryKey === explicitAutoplayEntryKey);
  const [consumedTargetIdentity, setConsumedTargetIdentity] = useState<
    string | undefined
  >();

  const [currentEpisode, setCurrentEpisode] = useState(resolvedInitialEpisode);
  const [episodeSeekTime, setEpisodeSeekTime] = useState(
    resolvedInitialSeekTime,
  );
  const [userPaused, setUserPaused] = useState(() =>
    fullSeriesHandoff
      ? fullSeriesHandoff.paused
      : !shouldAutoplayForEntryReason(initialPlaybackEntryReason, {
          explicitAutoplay,
          recommendPaused: recommendRestorePaused,
        }),
  );
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [hasActivatedPlayback, setHasActivatedPlayback] = useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isEpisodeSheetOpen, setIsEpisodeSheetOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [commentDialogSideTab, setCommentDialogSideTab] =
    useState<PlayImmersiveSideTab>(PlayImmersiveSideTab.Comment);
  const [isMoreSettingsOpen, setIsMoreSettingsOpen] = useState(false);
  const [replaySignal, setReplaySignal] = useState(0);
  const [isCleanScreen, setIsCleanScreen] = useState(false);
  const [continuousPlay, setContinuousPlay] = useState(
    readStoredPlayContinuousPlay,
  );
  const [isEpisodeSwitching, setIsEpisodeSwitching] = useState(false);
  const [isAwaitingPlayback, setIsAwaitingPlayback] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [pendingAutoNextEpisode, setPendingAutoNextEpisode] = useState<
    number | null
  >(null);

  const currentTimeRef = useRef(resolvedInitialSeekTime);
  const currentDurationRef = useRef<number | undefined>(undefined);
  const completedProgressIdentityRef = useRef<string | undefined>(undefined);
  const replayUnlockPendingRef = useRef(false);
  const lastProgressFlushAtRef = useRef(0);
  const isCommentDialogOpenRef = useRef(isCommentDialogOpen);
  const rootRef = useRef<HTMLElement | null>(null);
  const videoToggleRef = useRef<(() => void) | null>(null);
  const likeEffectRef = useRef<(() => void) | null>(null);
  const watchTouchTapRef = useRef<WatchTouchTapState | null>(null);
  const initialCommentOpenedRef = useRef(false);
  const appliedTargetIdentityRef = useRef<string | undefined>(undefined);
  isCommentDialogOpenRef.current = isCommentDialogOpen;

  const pendingExplicitEpisodeId = resolvePendingEpisodeTargetId({
    routeTargetEpisodeId,
    routeTargetIdentity,
    consumedTargetIdentity,
  });

  const {
    dramaDetail,
    isDramaPending,
    isDramaError,
    episodePlay: mediaEpisodeSnapshot,
    episodeApiId: mediaEpisodeApiId,
    isEpisodeDetailEnabled: isEpisodeDetailQueryEnabled,
    isEpisodeDetailError,
    isEpisodeTranscodingPending: mediaEpisodeTranscodingPending,
    isEpisodePlaybackDetailPending,
    playbackUrl: mediaHeroPlaybackUrl,
    fallbackMp4Url: mediaFallbackMp4Url,
    prefetchEpisodeDetail,
    refetchEpisodeDetail,
    reportEpisodePlay,
    reportEpisodeComplete,
    episodeList,
    episodeTotal: mediaEpisodeTotal,
    resolvedTargetEpisodeNo,
    targetEpisodeNotFound,
    targetEpisodeStatus,
  } = usePlayEpisodeMedia({
    dramaId,
    currentEpisode,
    enabled: !isShortVideo && !isFeedMode,
    targetEpisodeId: pendingExplicitEpisodeId,
  });
  // 短视频不启用 drama media hook，转码态由 ShortVideoView 显式传入
  const isEpisodeTranscodingPending =
    isMediaTranscodingPending || mediaEpisodeTranscodingPending;
  const feedPlaySource = resolveFeedPlaySource(
    getFeedItemMediaAccessUrl(feedItem),
  );
  const isOnFeedPlayback =
    feedPlaySource !== undefined &&
    (isShortVideo ||
      isFeedMode ||
      feedItem?.episode?.episodeNo === undefined ||
      currentEpisode === feedItem.episode.episodeNo);
  const feedEpisodeSnapshot = feedItem
    ? mapFeedItemToDramaPlayResponse(feedItem)
    : undefined;
  const feedEpisodeApiId = getEpisodeApiIdForRequests(feedEpisodeSnapshot);
  const feedMediaUrl = getFeedItemMediaAccessUrl(feedItem)?.trim();
  const episodeSnapshot = isOnFeedPlayback
    ? feedEpisodeSnapshot
    : mediaEpisodeSnapshot;
  const resolvedEpisodeApiId = isOnFeedPlayback
    ? (feedEpisodeApiId ?? shortVideoEpisodeId)
    : (mediaEpisodeApiId ??
      (currentEpisode === (initialEpisode ?? resolvedInitialEpisode)
        ? readSnowflakeId(initialEpisodeId)
        : undefined));
  const heroPlaybackUrl = isOnFeedPlayback
    ? feedPlaySource?.url
    : mediaHeroPlaybackUrl;
  const fallbackMp4Url = isOnFeedPlayback
    ? feedMediaUrl && !isHlsUrl(feedMediaUrl)
      ? feedMediaUrl
      : undefined
    : mediaFallbackMp4Url;

  const feedDramaInfo = feedItem ? mapFeedItemToDramaInfo(feedItem) : undefined;
  const dramaFavoriteCount = readPlayDramaFavoriteCount(
    isOnFeedPlayback ? feedDramaInfo : dramaDetail?.dramaInfo,
  );
  const dramaFavoritedByMe = readPlayDramaFavoritedByMe(
    isOnFeedPlayback ? feedDramaInfo : dramaDetail?.dramaInfo,
  );
  const creatorUserId = getPlayDramaInfoCreatorUserId(
    isOnFeedPlayback ? feedDramaInfo : dramaDetail?.dramaInfo,
  );
  const { guardBlockedInteraction } =
    useProfileBlockInteractionGuard(creatorUserId);

  const engagement = usePlayEpisodeEngagement({
    dramaId,
    episodeId: resolvedEpisodeApiId,
    contentType: feedContentType,
    snapshot: episodeSnapshot,
    dramaFavoritedByMe,
    dramaFavoriteCount,
    isLogin,
    creatorUserId,
  });
  const episodePlay = engagement.episodePlay;

  useEffect(() => {
    if (
      !initialCommentOpen ||
      !resolvedEpisodeApiId ||
      initialCommentOpenedRef.current
    ) {
      return;
    }

    initialCommentOpenedRef.current = true;
    void engagement.refresh();
    setIsCommentDialogOpen(true);
  }, [engagement, initialCommentOpen, resolvedEpisodeApiId]);

  usePlayWatchHistoryReporter({ episodeId: resolvedEpisodeApiId, isLogin });
  const nextEpisodeItem = episodeList.find(
    (item) => item.episodeNo === currentEpisode + 1,
  );
  const shouldGateEpisodeIdPlayback = shouldGateExplicitEpisodePlayback({
    status: targetEpisodeStatus,
    currentEpisode,
    resolvedEpisodeNo: resolvedTargetEpisodeNo,
  });
  const nextEpisodeMediaUrl = resolveInitialPlaySource({
    hlsUrl: nextEpisodeItem?.hlsUrl,
    mp4Url: nextEpisodeItem?.videoUrl,
  })?.url;

  usePlayAdjacentMediaPreload(nextEpisodeMediaUrl);

  useEffect(() => {
    if (fullSeriesHandoff) {
      clearFullSeriesPlaybackHandoff(fullSeriesHandoff);
    }
  }, [fullSeriesHandoff]);

  useEffect(() => {
    if (!resolvedTargetEpisodeNo || !routeTargetIdentity) {
      return;
    }

    if (appliedTargetIdentityRef.current === routeTargetIdentity) {
      return;
    }

    appliedTargetIdentityRef.current = routeTargetIdentity;
    setConsumedTargetIdentity(routeTargetIdentity);

    const restore = fullSeriesHandoff
      ? {
          currentTime: fullSeriesHandoff.currentTime,
          restoredFromHistory: fullSeriesHandoff.paused,
        }
      : resolveInitialDramaPlayback({
          explicitEpisodeNo: resolvedTargetEpisodeNo,
          savedEntry: dramaIdText
            ? readPlayDramaProgressEntry(dramaIdText)
            : undefined,
        });
    const nextReason: PlaybackEntryReason = fullSeriesHandoff
      ? fullSeriesHandoff.paused
        ? 'history-restore'
        : 'explicit-target'
      : restore.restoredFromHistory
        ? 'history-restore'
        : 'explicit-target';

    setCurrentEpisode(resolvedTargetEpisodeNo);
    setPlaybackEntryReason(nextReason);
    setEpisodeSeekTime(restore.currentTime);
    currentTimeRef.current = restore.currentTime;
    currentDurationRef.current = undefined;
    setUserPaused(
      fullSeriesHandoff
        ? fullSeriesHandoff.paused
        : !shouldAutoplayForEntryReason(nextReason, {
            explicitAutoplay: applyExplicitAutoplay,
          }),
    );
    setHasActivatedPlayback(false);
    setAutoplayBlocked(false);
  }, [
    applyExplicitAutoplay,
    dramaIdText,
    fullSeriesHandoff,
    resolvedTargetEpisodeNo,
    routeTargetIdentity,
  ]);

  useLayoutEffect(() => {
    if (!routeTargetIdentity) {
      setConsumedTargetIdentity(undefined);
    }
  }, [routeTargetIdentity]);

  useEffect(() => {
    if (!targetEpisodeNotFound || !dramaIdText) {
      return;
    }

    void navigate({
      to: '/play/$dramaId/watch',
      params: { dramaId },
      search: (prev) => ({
        ...prev,
        episodeId: undefined,
        episode: prev.episode,
      }),
      replace: true,
    });
  }, [dramaId, dramaIdText, navigate, targetEpisodeNotFound]);

  const metricsResetKey = `${currentEpisode}:${heroPlaybackUrl ?? ''}`;
  const {
    handlePlayStart,
    handlePause,
    handleTimeUpdate: handleMetricsTimeUpdate,
  } = usePlayEpisodeMetricsBridge({
    isLogin,
    episodeApiId: resolvedEpisodeApiId,
    reportEpisodePlay: isShortVideo
      ? reportShortVideoPlayForMetrics
      : reportEpisodePlay,
    reportEpisodeComplete: isShortVideo
      ? reportShortVideoCompleteForMetrics
      : reportEpisodeComplete,
    resetKey: metricsResetKey,
  });

  const {
    dramaInfo: detailDramaInfo,
    playbackRule,
    totalEpisodes: detailTotalEpisodes,
  } = dramaDetail ?? {};
  const dramaInfo = mergeDramaInfoFromPlayCreator(
    isOnFeedPlayback && feedItem
      ? (feedDramaInfo ?? mapFeedItemToDramaInfo(feedItem))
      : detailDramaInfo,
    episodeSnapshot,
  );
  const roles = resolvePlayDetailRoles(dramaDetail);

  const totalEpisodes = isShortVideo
    ? 1
    : isOnFeedPlayback && feedItem?.drama?.totalEpisodes !== undefined
      ? feedItem.drama.totalEpisodes
      : mediaEpisodeTotal !== undefined && mediaEpisodeTotal > 0
        ? mediaEpisodeTotal
        : (detailTotalEpisodes ?? playbackRule?.totalEpisodes ?? 1);
  const episodeTotal = totalEpisodes;

  const likedByMe = engagement.likedByMe;
  const favoritedByMe = engagement.favoritedByMe;
  const currentProgressIdentity = isFeedMode
    ? recommendActiveKey
      ? `${recommendActiveKey.contentType}:${recommendActiveKey.dramaId ?? ''}:${recommendActiveKey.episodeId}`
      : undefined
    : dramaIdText
      ? `${dramaIdText}:${currentEpisode}`
      : undefined;

  const flushCurrentProgress = useCallback(
    ({
      completed = false,
      currentTime = currentTimeRef.current,
      duration = currentDurationRef.current,
      paused = userPaused,
    }: {
      completed?: boolean;
      currentTime?: number;
      duration?: number;
      paused?: boolean;
    } = {}) => {
      if (
        completedProgressIdentityRef.current &&
        completedProgressIdentityRef.current !== currentProgressIdentity
      ) {
        completedProgressIdentityRef.current = undefined;
      }

      if (
        !completed &&
        completedProgressIdentityRef.current === currentProgressIdentity
      ) {
        return;
      }

      if (isFeedMode) {
        if (!recommendActiveKey || !recommendSessionScope) {
          return;
        }

        updatePlayRecommendSession({
          scope: recommendSessionScope,
          activeKey: recommendActiveKey,
          currentTime: completed
            ? 0
            : normalizeRecommendPlaybackTime(currentTime, duration),
          paused,
        });
        if (completed) {
          completedProgressIdentityRef.current = currentProgressIdentity;
        }
        lastProgressFlushAtRef.current = Date.now();
        return;
      }

      if (!dramaIdText || isShortVideo) {
        return;
      }

      const entry = completed
        ? resolveCompletedDramaEntry({
            episodeNo: currentEpisode,
            totalEpisodes: episodeTotal,
            duration,
          })
        : {
            episodeNo: currentEpisode,
            currentTime: normalizePlaybackTime(currentTime, duration),
            duration,
            updatedAt: Date.now(),
          };

      writePlayDramaProgressEntry(dramaIdText, entry);
      if (completed) {
        completedProgressIdentityRef.current = currentProgressIdentity;
      }
      lastProgressFlushAtRef.current = Date.now();
    },
    [
      currentProgressIdentity,
      currentEpisode,
      dramaIdText,
      episodeTotal,
      isFeedMode,
      isShortVideo,
      recommendActiveKey,
      recommendSessionScope,
      userPaused,
    ],
  );
  const flushCurrentProgressRef = useRef(flushCurrentProgress);
  flushCurrentProgressRef.current = flushCurrentProgress;

  // 切剧时重置播放编排状态（地址 / Cookie 由 usePlayEpisodeMedia 统一清理）
  useLayoutEffect(() => {
    if (!contentKeyText) {
      return;
    }

    setCurrentEpisode(resolvedInitialEpisode);
    setEpisodeSeekTime(resolvedInitialSeekTime);
    currentTimeRef.current = resolvedInitialSeekTime;
    currentDurationRef.current = undefined;
    completedProgressIdentityRef.current = undefined;
    lastProgressFlushAtRef.current = 0;
    appliedTargetIdentityRef.current = undefined;
    const nextReason: PlaybackEntryReason = fullSeriesHandoff
      ? fullSeriesHandoff.paused
        ? 'history-restore'
        : 'explicit-target'
      : resolveContentKeyPlaybackEntryReason({
          shouldRestoreRecommendPlayback,
          restoredFromHistory: dramaRestoreState?.restoredFromHistory,
          hasExplicitEpisodeId: routeTargetEpisodeId !== undefined,
          hasExplicitEpisodeNo: initialEpisode !== undefined,
          fromWorkListPlaylist,
        });
    setPlaybackEntryReason(nextReason);
    setIsEpisodeSwitching(false);
    setIsAwaitingPlayback(false);
    setUserPaused(
      fullSeriesHandoff
        ? fullSeriesHandoff.paused
        : !shouldAutoplayForEntryReason(nextReason, {
            explicitAutoplay: applyExplicitAutoplay,
            recommendPaused: recommendRestorePaused,
          }),
    );
    setAutoplayBlocked(false);
    setHasActivatedPlayback(false);
    setPendingAutoNextEpisode(null);
  }, [
    contentKeyText,
    resolvedInitialEpisode,
    resolvedInitialSeekTime,
    shouldRestoreRecommendPlayback,
    recommendRestorePaused,
    dramaRestoreState?.restoredFromHistory,
    fullSeriesHandoff,
    initialEpisode,
    routeTargetEpisodeId,
    applyExplicitAutoplay,
    fromWorkListPlaylist,
  ]);

  useLayoutEffect(() => {
    setLatchedExplicitAutoplayEntryKey((currentEntryKey) =>
      resolveExplicitAutoplayEntryKey({
        currentEntryKey,
        explicitAutoplay,
        nextEntryKey: explicitAutoplayEntryKey,
      }),
    );
  }, [explicitAutoplay, explicitAutoplayEntryKey]);

  useEffect(() => {
    if (!explicitAutoplay || isFeedMode) {
      return;
    }

    void navigate({
      to: '/play/$dramaId/watch',
      params: { dramaId },
      search: (prev) => ({
        ...prev,
        autoplay: undefined,
      }),
      replace: true,
    });
  }, [dramaId, explicitAutoplay, isFeedMode, navigate]);

  // H5 播放页：记住进入前 history（个人作品 / 搜索等）；推荐 Feed 自管返回，不记。
  useEffect(() => {
    if (isFeedMode) {
      return;
    }

    rememberPlayImmersiveReturnIfNeeded();
    return () => {
      const pathname = window.location.pathname;

      // 短视频挂在 /play/:id，短剧 H5 在 /watch；同会话内切条勿清入口
      if (
        !isPlayDramaWatchPath(pathname) &&
        !isPlayDramaImmersivePath(pathname)
      ) {
        clearPlayImmersiveReturn();
      }
    };
  }, [isFeedMode]);

  useEffect(() => {
    if (replaySignal <= 0) {
      return;
    }

    replayUnlockPendingRef.current = true;
  }, [replaySignal]);

  // 新片源就绪：结束切集态、恢复自动播放，同时清除播放器错误状态
  useEffect(() => {
    if (!heroPlaybackUrl) {
      return;
    }

    setIsEpisodeSwitching(false);
    setPlayerError(false);
    setPendingAutoNextEpisode(null);
  }, [heroPlaybackUrl]);

  useEffect(() => {
    if (!isEpisodeTranscodingPending && !playerError) {
      return;
    }

    if (isEpisodeTranscodingPending) {
      setPlayerError(false);
    }

    setIsAwaitingPlayback(false);
    setIsEpisodeSwitching(false);
  }, [isEpisodeTranscodingPending, playerError]);

  useEffect(() => {
    if (!targetCommentId) {
      return;
    }

    setIsCommentDialogOpen(true);
  }, [targetCommentId]);

  // 仅跟踪待切集数；切集函数每渲染重建，不入 deps 以免重置定时器
  // biome-ignore lint/correctness/useExhaustiveDependencies: changeEpisodeWithSlide 故意省略
  useEffect(() => {
    if (pendingAutoNextEpisode === null) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setPendingAutoNextEpisode(null);
      changeEpisodeWithSlide(pendingAutoNextEpisode, 'up', 'auto-next');
    }, WATCH_AUTO_NEXT_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [pendingAutoNextEpisode]);

  // 真机全屏播放：锁定页面滚动，避免上下滑带动外层盒子
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
    };

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.top = '0';
    body.style.left = '0';

    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      body.style.position = previous.bodyPosition;
      body.style.width = previous.bodyWidth;
      body.style.height = previous.bodyHeight;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushCurrentProgressRef.current();
      }
    };

    const handlePageHide = () => {
      flushCurrentProgressRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      flushCurrentProgressRef.current();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  useEffect(() => {
    if (!isCleanScreen || !isMobileViewport) {
      return;
    }

    const video = findPlayWatchVideoElement();
    if (!video) {
      return;
    }

    const handleWebkitEndFullscreen = () => {
      setIsCleanScreen(false);
    };

    video.addEventListener('webkitendfullscreen', handleWebkitEndFullscreen);
    return () => {
      video.removeEventListener(
        'webkitendfullscreen',
        handleWebkitEndFullscreen,
      );
    };
  }, [isCleanScreen, isMobileViewport]);

  const beginEpisodeTransition = (episode: number) => {
    setIsEpisodeSwitching(true);
    setIsAwaitingPlayback(true);
    setUserPaused(false);
    setAutoplayBlocked(false);
    prefetchEpisodeDetail(episode);
  };

  const commitEpisodeChange = (
    episode: number,
    entryReason: PlaybackEntryReason = 'user-episode-change',
  ) => {
    flushCurrentProgress();

    if (!isFeedMode && !isShortVideo) {
      void navigate({
        to: '/play/$dramaId/watch',
        params: { dramaId },
        search: (previousSearch) =>
          resolvePlayEpisodeSelectionSearch(previousSearch, episode),
        replace: true,
      });
    }

    setPlaybackEntryReason(entryReason);
    setCurrentEpisode(episode);
    currentTimeRef.current = 0;
    currentDurationRef.current = undefined;
    setEpisodeSeekTime(0);
  };

  const { slideRef, runSlide } = usePlayWatchEpisodeGesture({
    // 触控垂直滑切；清屏 / 选集抽屉打开时关闭
    enabled: !isEpisodeSheetOpen && !isMoreSettingsOpen && !isCleanScreen,
    canSwipeUp: isFeedMode
      ? feedMode.canNext
      : !isShortVideo && currentEpisode < episodeTotal,
    canSwipeDown: isFeedMode
      ? feedMode.canPrev
      : !isShortVideo && currentEpisode > 1,
    onCommit: (direction) => {
      if (isFeedMode) {
        if (direction === 'up' && !feedMode.canNext) {
          return null;
        }

        if (direction === 'down' && !feedMode.canPrev) {
          return null;
        }

        return () => {
          flushCurrentProgress();

          if (direction === 'up') {
            feedMode.onNext();
            return;
          }

          feedMode.onPrev();
        };
      }

      const episode =
        direction === 'up' ? currentEpisode + 1 : currentEpisode - 1;

      if (direction === 'up' && currentEpisode >= episodeTotal) {
        return null;
      }

      if (direction === 'down' && currentEpisode <= 1) {
        return null;
      }

      return () => {
        beginEpisodeTransition(episode);
        commitEpisodeChange(episode);
      };
    },
  });

  const changeEpisodeWithSlide = (
    episode: number,
    direction?: PlayWatchEpisodeSlideDirection,
    entryReason: PlaybackEntryReason = 'user-episode-change',
  ) => {
    if (episode === currentEpisode) {
      return;
    }

    beginEpisodeTransition(episode);

    const slideDirection =
      direction ??
      (episode > currentEpisode ? ('up' as const) : ('down' as const));

    if (isMobileViewport) {
      runSlide(slideDirection, () => {
        commitEpisodeChange(episode, entryReason);
      });
      return;
    }

    commitEpisodeChange(episode, entryReason);
  };

  const canNavigatePrev = isFeedMode
    ? feedMode.canPrev
    : !isShortVideo && currentEpisode > 1;
  const canNavigateNext = isFeedMode
    ? feedMode.canNext
    : !isShortVideo && currentEpisode < episodeTotal;

  const handleNavigatePrev = () => {
    if (isFeedMode) {
      if (!feedMode.canPrev) {
        return;
      }

      flushCurrentProgress();
      feedMode.onPrev();
      return;
    }

    if (currentEpisode <= 1) {
      return;
    }

    changeEpisodeWithSlide(currentEpisode - 1, 'down');
  };

  const handleNavigateNext = () => {
    if (isFeedMode) {
      if (!feedMode.canNext) {
        return;
      }

      flushCurrentProgress();
      feedMode.onNext();
      return;
    }

    if (currentEpisode >= episodeTotal) {
      return;
    }

    changeEpisodeWithSlide(currentEpisode + 1, 'up');
  };

  // 滚轮 + 键盘上下箭头切条（触摸滑动见 usePlayWatchEpisodeGesture）
  usePlayNavigateInput({
    enabled: !isEpisodeSheetOpen && !isCleanScreen && !isCommentDialogOpen,
    canPrev: canNavigatePrev,
    canNext: canNavigateNext,
    onPrev: handleNavigatePrev,
    onNext: handleNavigateNext,
    targetRef: rootRef,
  });

  const handleEpisodeChange = (episode: number) => {
    changeEpisodeWithSlide(episode);
  };

  const handleBack = () => {
    flushCurrentProgress();
    exitPlayImmersiveToReturn(() => {
      void navigate({ to: '/play' });
    });
  };

  const handleEpisodeBarClick = () => {
    setIsEpisodeSheetOpen((prev) => !prev);
  };

  const handleToggleCleanScreen = () => {
    setIsCleanScreen((prev) => !prev);
  };

  const handleContinuousPlayChange = (checked: boolean) => {
    setContinuousPlay(checked);
    storePlayContinuousPlay(checked);
  };

  const handleOpenMoreSettings = () => {
    const slideNode = slideRef.current;
    if (slideNode) {
      slideNode.style.transition = 'none';
      slideNode.style.transform = 'translateY(0)';
    }

    setIsMoreSettingsOpen(true);
  };

  const handleTogglePcFullscreen = () => {
    if (document.fullscreenElement) {
      exitDocumentFullscreen();
      return;
    }

    const playerRoot = findPlayWatchPlayerRoot(findPlayWatchVideoElement());
    if (playerRoot) {
      void playerRoot.requestFullscreen().catch(() => {});
    }
  };

  const handleToggleScreenMode = isMobileViewport
    ? handleToggleCleanScreen
    : handleTogglePcFullscreen;

  const handleToggleLike = () => {
    if (!requireLogin()) {
      return;
    }

    if (!resolvedEpisodeApiId) {
      toast.error(t('再试一次'));
      return;
    }

    if (!likedByMe && !engagement.isLikePending) {
      likeEffectRef.current?.();
    }

    void engagement.toggleLike();
  };

  const handleDoubleTapLike = () => {
    if (!requireLogin()) {
      return false;
    }

    if (!resolvedEpisodeApiId) {
      toast.error(t('再试一次'));
      return false;
    }

    if (!likedByMe && !engagement.isLikePending) {
      void engagement.toggleLike();
    }

    return true;
  };

  const handleToggleFavorite = () => {
    if (!requireLogin()) {
      return;
    }

    void engagement.toggleFavorite();
  };

  const handleToggleDramaFavorite = () => {
    if (!requireLogin()) {
      return;
    }

    void engagement.toggleDramaFavorite();
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const shareText = buildPlayShareText({
        origin: window.location.origin,
        contentType: feedContentType,
        dramaId: dramaIdText,
        episodeId: resolvedEpisodeApiId,
        episodeNo: currentEpisode,
        dramaTitle: dramaInfo?.title,
        description:
          episodePlay?.description?.trim() ||
          feedItem?.episode?.description?.trim() ||
          dramaInfo?.desc?.trim(),
        t,
      });
      if (!shareText) {
        toast.error(t('再试一次'));
        return;
      }

      await navigator.clipboard.writeText(shareText);
      toast.success(t('链接已复制'));
    } catch {
      toast.error(t('再试一次'));
    }
  };

  const handleOpenComment = () => {
    if (!guardBlockedInteraction('comment')) {
      return;
    }

    if (!resolvedEpisodeApiId) {
      toast.error(t('再试一次'));
      return;
    }

    void engagement.refresh();
    setCommentDialogSideTab(PlayImmersiveSideTab.Comment);
    setIsCommentDialogOpen(true);
  };

  const handleCommentDialogOpenChange = (open: boolean) => {
    if (open) {
      void engagement.refresh();
    } else {
      setCommentDialogSideTab(PlayImmersiveSideTab.Comment);
    }
    setIsCommentDialogOpen(open);
  };

  const handleEpisodePlaybackEnded = () => {
    engagement.markPaused();

    // 推荐 Feed：播完切下一条；无更多则循环本条
    if (isFeedMode) {
      flushCurrentProgress({ completed: true });

      if (isCommentDialogOpenRef.current) {
        setReplaySignal((prev) => prev + 1);
        return;
      }

      if (!continuousPlay) {
        setReplaySignal((prev) => prev + 1);
        return;
      }

      if (feedMode.canNext) {
        runSlide('up', feedMode.onNext);
        return;
      }

      setReplaySignal((prev) => prev + 1);
      return;
    }

    // 短视频播完停止，不重播、不切下一条
    if (isShortVideo) {
      flushCurrentProgress({ completed: true });
      replayUnlockPendingRef.current = true;
      setUserPaused(true);
      return;
    }

    flushCurrentProgress({ completed: true });

    // 评论区打开：本集循环重播，不切下一集；视频在面板后继续播
    if (isCommentDialogOpenRef.current) {
      setReplaySignal((prev) => prev + 1);
      return;
    }

    if (!continuousPlay) {
      setReplaySignal((prev) => prev + 1);
      return;
    }

    const nextEpisode = currentEpisode + 1;
    if (nextEpisode > episodeTotal) {
      // 最后一集自然播完：不切集，切到用户暂停态，展示原来的中央播放按钮。
      // 标记待解锁，用户点播放后走 onPlaying 清完播锁，避免重看进度写不进去。
      replayUnlockPendingRef.current = true;
      setUserPaused(true);
      return;
    }

    setPendingAutoNextEpisode(nextEpisode);
  };

  const handleEpisodePlaybackEndedRef = useRef(handleEpisodePlaybackEnded);
  handleEpisodePlaybackEndedRef.current = handleEpisodePlaybackEnded;

  const handleEpisodePlaybackEndedStable = useCallback(() => {
    handleEpisodePlaybackEndedRef.current();
  }, []);

  const handlePlayerError = useCallback(() => {
    engagement.markPaused();
    setPlayerError(true);
  }, [engagement]);

  const handleRegisterDirectToggle = useCallback(
    (toggle: (() => void) | null) => {
      videoToggleRef.current = toggle;
    },
    [],
  );

  const handleRegisterLikeEffect = useCallback((show: (() => void) | null) => {
    likeEffectRef.current = show;
  }, []);

  const handleAutoplayBlocked = useCallback(() => {
    if (isEpisodeSwitching) {
      return;
    }

    setAutoplayBlocked(true);
    setIsAwaitingPlayback(false);
  }, [isEpisodeSwitching]);

  const handlePlaying = useCallback(() => {
    if (replayUnlockPendingRef.current) {
      replayUnlockPendingRef.current = false;
      if (completedProgressIdentityRef.current === currentProgressIdentity) {
        completedProgressIdentityRef.current = undefined;
      }
    }

    handlePlayStart();
    engagement.markPlaying();
    setHasActivatedPlayback(true);
    setIsAwaitingPlayback(false);
    setUserPaused(false);
    setAutoplayBlocked(false);
  }, [currentProgressIdentity, engagement, handlePlayStart]);

  const handleUserPause = useCallback(() => {
    handlePause();
    engagement.markPaused();
    setUserPaused(true);
    setAutoplayBlocked(false);
    flushCurrentProgress({ paused: true });
  }, [engagement, flushCurrentProgress, handlePause]);

  const handleUserPlay = useCallback(() => {
    handlePlayStart();
    engagement.markPlaying();
    setHasActivatedPlayback(true);
    setUserPaused(false);
    setAutoplayBlocked(false);
    setIsAwaitingPlayback(false);
    flushCurrentProgress({ paused: false });
  }, [engagement, flushCurrentProgress, handlePlayStart]);

  const handleTimeUpdate = (time: number, duration?: number) => {
    currentTimeRef.current = time;
    currentDurationRef.current = duration;
    handleMetricsTimeUpdate(time, duration);

    if (
      Date.now() - lastProgressFlushAtRef.current >=
      PLAY_PROGRESS_FLUSH_INTERVAL_MS
    ) {
      flushCurrentProgress({ currentTime: time, duration });
    }
  };

  useEffect(() => {
    if (!isMobileViewport || isEpisodeSheetOpen || isMoreSettingsOpen) {
      watchTouchTapRef.current = null;
      return;
    }

    const isInsideWatchRoot = (target: EventTarget | null) => {
      const root = rootRef.current;
      return target instanceof Node && root?.contains(target);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!isInsideWatchRoot(event.target)) {
        watchTouchTapRef.current = null;
        return;
      }

      if (isGestureBlockedTarget(event.target) || event.touches.length !== 1) {
        watchTouchTapRef.current = null;
        return;
      }

      const touch = event.touches[0];
      watchTouchTapRef.current = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const state = watchTouchTapRef.current;
      if (!state) {
        return;
      }

      const touch = Array.from(event.changedTouches).find(
        (item) => item.identifier === state.id,
      );
      if (!touch) {
        return;
      }

      watchTouchTapRef.current = null;

      const endTarget = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!isInsideWatchRoot(endTarget) || isGestureBlockedTarget(endTarget)) {
        return;
      }

      const dx = Math.abs(touch.clientX - state.x);
      const dy = Math.abs(touch.clientY - state.y);
      const dt = Date.now() - state.time;

      if (
        dx > WATCH_TAP_MAX_DISPLACEMENT_PX ||
        dy > WATCH_TAP_MAX_DISPLACEMENT_PX ||
        dt > WATCH_TAP_MAX_DURATION_MS
      ) {
        return;
      }

      videoToggleRef.current?.();
    };

    const handleTouchCancel = () => {
      watchTouchTapRef.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, {
      capture: true,
      passive: true,
    });
    document.addEventListener('touchend', handleTouchEnd, {
      capture: true,
      passive: true,
    });
    document.addEventListener('touchcancel', handleTouchCancel, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, {
        capture: true,
      });
      document.removeEventListener('touchend', handleTouchEnd, {
        capture: true,
      });
      document.removeEventListener('touchcancel', handleTouchCancel, {
        capture: true,
      });
    };
  }, [isEpisodeSheetOpen, isMobileViewport, isMoreSettingsOpen]);

  const coverImage =
    dramaInfo?.coverImg?.trim() ||
    feedItem?.episode?.coverUrl?.trim() ||
    feedItem?.drama?.coverUrl?.trim();
  // 播放浮层简介：优先分集 description，缺省回退整剧 desc
  const synopsisText =
    episodePlay?.description?.trim() ||
    feedItem?.episode?.description?.trim() ||
    dramaInfo?.desc?.trim() ||
    '';
  const showPlaybackBlockingOverlay =
    !hasActivatedPlayback || isEpisodeTranscodingPending;
  const isLoading =
    showPlaybackBlockingOverlay &&
    !isEpisodeTranscodingPending &&
    ((shouldGateEpisodeIdPlayback && targetEpisodeStatus !== 'error') ||
      (!isOnFeedPlayback &&
        !isShortVideo &&
        (isDramaPending ||
          isEpisodePlaybackDetailPending ||
          (isEpisodeDetailQueryEnabled &&
            !heroPlaybackUrl &&
            !isEpisodeSwitching &&
            !isEpisodeDetailError))));

  if (
    contentKeyText === undefined ||
    (!isOnFeedPlayback && !isShortVideo && isDramaError)
  ) {
    return null;
  }

  // 观看完整短剧：进入移动端二级播放页
  const handleWatchFullSeries = () => {
    if (!dramaIdText) {
      return;
    }

    const paused = userPaused || autoplayBlocked;
    const currentTime = normalizePlaybackTime(
      currentTimeRef.current,
      currentDurationRef.current,
    );
    flushCurrentProgress({
      currentTime,
      duration: currentDurationRef.current,
      paused,
    });
    writeFullSeriesPlaybackHandoff({
      dramaId: dramaIdText,
      episodeId: resolvedEpisodeApiId,
      episodeNo: currentEpisode,
      currentTime,
      paused,
    });

    void navigate({
      to: '/play/$dramaId/watch',
      params: { dramaId: dramaIdText },
      search: { episode: currentEpisode, episodeId: resolvedEpisodeApiId },
    });
  };

  // 标题点击：打开评论弹窗并默认选中「短剧」Tab
  const handleOpenDramaTab = () => {
    void engagement.refresh();
    setCommentDialogSideTab(PlayImmersiveSideTab.Drama);
    setIsCommentDialogOpen(true);
  };

  const isMobileCleanScreen = isMobileViewport && isCleanScreen;
  const isMobileCommentCanvas = isMobileViewport && isCommentDialogOpen;
  const progressVariant = isMobileCleanScreen ? 'cleanScreen' : 'default';
  const isEpisodeTransitioning = isEpisodeSwitching || isAwaitingPlayback;
  const showCenterPlayButton =
    (userPaused || autoplayBlocked) &&
    !isSynopsisExpanded &&
    !isEpisodeTransitioning;

  return (
    <article
      ref={rootRef}
      className={cn(
        'relative w-full overscroll-none bg-black',
        'overflow-hidden',
        rootClassName ?? 'h-dvh',
      )}
    >
      <div
        ref={slideRef}
        className={cn(
          'relative size-full touch-none will-change-transform',
          'transition-[height] duration-200 ease-out',
        )}
        style={
          isMobileCommentCanvas
            ? { height: 'calc(100dvh - min(570px, 68dvh))' }
            : undefined
        }
      >
        <PlayWatchVideoPlayer
          mediaUrl={shouldGateEpisodeIdPlayback ? undefined : heroPlaybackUrl}
          fallbackMediaUrl={fallbackMp4Url}
          isEpisodeSwitching={isEpisodeSwitching}
          initialTime={episodeSeekTime}
          autoplayOnMount={shouldAutoplayForEntryReason(playbackEntryReason, {
            explicitAutoplay: applyExplicitAutoplay,
            recommendPaused: recommendRestorePaused,
          })}
          autoplayMutedFirst={isFeedMode}
          tapDisabled={isEpisodeSheetOpen || isMoreSettingsOpen}
          showDesktopTapLayer
          posterImage={
            isEpisodeTranscodingPending ||
            (!isEpisodeSwitching &&
              (shouldGateEpisodeIdPlayback || !heroPlaybackUrl))
              ? coverImage
              : undefined
          }
          posterObjectFit={
            isEpisodeTranscodingPending ||
            (!heroPlaybackUrl && !isEpisodeSwitching)
              ? 'cover'
              : undefined
          }
          showCenterPlayButton={showCenterPlayButton && !isMobileCommentCanvas}
          allowAutoplayBlockedPrompt={!isEpisodeSwitching}
          onAutoplayBlocked={handleAutoplayBlocked}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEpisodePlaybackEndedStable}
          replaySignal={replaySignal}
          onPlaying={handlePlaying}
          onUserPause={handleUserPause}
          onUserPlay={handleUserPlay}
          onDoubleTapLike={handleDoubleTapLike}
          onLongPress={isMobileViewport ? handleOpenMoreSettings : undefined}
          onPlayerError={handlePlayerError}
          onRegisterDirectToggle={handleRegisterDirectToggle}
          onRegisterLikeEffect={handleRegisterLikeEffect}
          shouldAutoResumeOnForeground={shouldForegroundAutoResume({
            hasActivatedPlayback,
            userPaused,
          })}
          onSystemPaused={() => {
            setUserPaused(true);
          }}
          onForegroundRecoverFailed={() => {
            refetchEpisodeDetail();
          }}
        >
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 z-35',
              'flex flex-col',
            )}
          >
            <div
              data-play-watch-no-swipe
              onPointerDown={playWatchStopGestureBubble}
              onTouchStart={playWatchStopGestureBubble}
              className={cn(
                // 左文案 + 右互动栏：meta 不得 w-full 占满，否则会把右侧栏挤离右缘
                'pointer-events-none flex items-end justify-between gap-3 pl-4',
                isFeedMode ? 'mb-2 pr-1' : 'mb-6 pr-2.5',
                (isMobileCleanScreen || isMobileCommentCanvas) && 'invisible',
              )}
            >
              <PlayWatchMetaPanel
                dramaInfo={dramaInfo}
                currentEpisode={currentEpisode}
                totalEpisodes={episodeTotal}
                synopsisText={synopsisText}
                isExpanded={isSynopsisExpanded}
                showSeriesCtas={
                  isFeedMode &&
                  !isShortVideo &&
                  episodeTotal !== undefined &&
                  episodeTotal > 1
                }
                showEpisodeLabel={!isShortVideo && !isFeedMode}
                titleAsCreatorProfile={isShortVideo}
                onToggleExpanded={() => {
                  setIsSynopsisExpanded((prev) => !prev);
                }}
                onTitleClick={isShortVideo ? undefined : handleOpenDramaTab}
                onWatchFullSeries={
                  isFeedMode ? handleWatchFullSeries : undefined
                }
                className="min-w-0 w-auto max-w-none flex-1"
              />
              <PlayWatchInteractionRail
                key={contentKeyText}
                dramaInfo={dramaInfo}
                episodePlay={episodePlay}
                favoriteCount={engagement.favoriteCount ?? 0}
                likedByMe={likedByMe}
                favoritedByMe={favoritedByMe}
                isLikePending={engagement.isLikePending}
                isFavoritePending={engagement.isFavoritePending}
                onToggleLike={handleToggleLike}
                onOpenComment={handleOpenComment}
                onToggleFavorite={handleToggleFavorite}
                onShare={() => {
                  void handleShare();
                }}
                onNotInterested={feedMode?.onNotInterested}
                onWorkReportDone={isFeedMode ? feedMode.onNext : undefined}
                showMoreEntry={!isMobileViewport}
                moreSettingsOpen={isMoreSettingsOpen}
                onMoreSettingsOpenChange={setIsMoreSettingsOpen}
                isCleanScreen={isCleanScreen}
                onToggleCleanScreen={handleToggleCleanScreen}
                continuousPlay={continuousPlay}
                onContinuousPlayChange={handleContinuousPlayChange}
                className={isFeedMode ? 'pb-2 pr-2' : undefined}
              />
            </div>
            <div
              data-play-watch-no-swipe
              onPointerDown={playWatchStopGestureBubble}
              onTouchStart={playWatchStopGestureBubble}
              className={cn(
                'pointer-events-auto flex flex-col gap-1.5 px-4',
                // 推荐 Feed：仅细进度条，避免大块黑底把互动栏顶到画面中部
                isFeedMode
                  ? 'pb-1'
                  : 'bg-black pb-[env(safe-area-inset-bottom)]',
                isMobileCommentCanvas && 'invisible',
              )}
            >
              <PlayWatchProgressSlider variant={progressVariant} />
              {!isShortVideo && !isFeedMode ? (
                <PlayWatchEpisodeBar
                  totalEpisodes={episodeTotal}
                  onEpisodeBarClick={handleEpisodeBarClick}
                  onToggleFullscreen={handleToggleScreenMode}
                  isMobileViewport={isMobileViewport}
                  isCleanScreen={isMobileCleanScreen}
                />
              ) : null}
            </div>
          </div>
        </PlayWatchVideoPlayer>

        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 z-20 h-48',
            'bg-linear-to-b from-black/70 to-transparent',
          )}
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 z-20 h-96',
            'bg-linear-to-t  to-transparent',
          )}
        />

        {isFeedMode ? null : (
          <header
            data-play-watch-no-swipe
            onPointerDown={playWatchStopGestureBubble}
            onTouchStart={playWatchStopGestureBubble}
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 z-30',
              'flex items-center gap-2.5 px-4 py-2.5',
              'pt-[max(0.625rem,env(safe-area-inset-top))]',
              isMobileCommentCanvas && 'invisible',
            )}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              onPointerDown={playWatchStopGestureBubble}
              onTouchStart={playWatchStopGestureBubble}
              className={cn(
                'pointer-events-auto size-10 rounded-full p-0',
                'text-white hover:bg-white/10 hover:text-white',
              )}
            >
              <IconChevronLeft aria-hidden className="size-6" />
              <span className="sr-only">{t('返回')}</span>
            </Button>
            <p
              className={cn(
                'text-sm font-bold leading-5 text-white',
                'text-shadow-[0_1px_8px_rgba(0,0,0,0.08)]',
              )}
            >
              {isShortVideo
                ? t('短视频')
                : t('第 {{n}} 集', { n: currentEpisode })}
            </p>
          </header>
        )}

        {isLoading ? <PlayMediaLoadingOverlay dim label={t('加载中')} /> : null}

        {isEpisodeTranscodingPending && showPlaybackBlockingOverlay ? (
          <PlayMediaTranscodingOverlay />
        ) : null}

        {isEpisodeDetailError &&
        (targetEpisodeStatus === 'error' ||
          (!shouldGateEpisodeIdPlayback && !heroPlaybackUrl)) ? (
          <PlayMediaErrorOverlay onRetry={refetchEpisodeDetail} />
        ) : null}

        {playerError && !isLoading && !isEpisodeTranscodingPending ? (
          <PlayMediaErrorOverlay
            message={t('视频播放出错，请重试')}
            onRetry={() => {
              setPlayerError(false);
              refetchEpisodeDetail();
            }}
          />
        ) : null}

        {isEpisodeTransitioning && !isLoading && showPlaybackBlockingOverlay ? (
          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-25 bg-black/70',
            )}
          />
        ) : null}
      </div>

      {!isShortVideo && !isFeedMode ? (
        <PlayWatchEpisodeSheet
          open={isEpisodeSheetOpen}
          onOpenChange={setIsEpisodeSheetOpen}
          totalEpisodes={totalEpisodes}
          selectedEpisode={currentEpisode}
          onSelectEpisode={handleEpisodeChange}
        />
      ) : null}
      <PlayCommentDialog
        open={isCommentDialogOpen}
        dramaId={dramaId}
        currentEpisode={currentEpisode}
        episodeApiId={resolvedEpisodeApiId ?? ''}
        contentType={feedContentType}
        commentCount={episodePlay?.commentCount}
        creatorUserId={creatorUserId}
        targetCommentId={targetCommentId}
        dramaInfo={dramaInfo}
        dramaFavoritedByMe={engagement.dramaFavoritedByMe}
        isDramaFavoritePending={engagement.isDramaFavoritePending}
        roles={roles}
        totalEpisodes={totalEpisodes}
        episodes={episodeList}
        onToggleDramaFavorite={handleToggleDramaFavorite}
        onSelectEpisode={handleEpisodeChange}
        onOpenChange={handleCommentDialogOpenChange}
        initialSideTab={commentDialogSideTab}
      />
    </article>
  );
}
