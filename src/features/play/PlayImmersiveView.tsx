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

import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { PlayImmersiveDesktopControls } from '@/features/play/components/PlayImmersiveDesktopControls';
import { PlayImmersiveDramaTopBar } from '@/features/play/components/PlayImmersiveDramaTopBar';
import {
  getPlayImmersiveIpMetaGapClass,
  PlayImmersiveIpPanel,
} from '@/features/play/components/PlayImmersiveIpPanel';
import { PlayImmersiveNavButtons } from '@/features/play/components/PlayImmersiveNavButtons';
import { PlayImmersivePlayerPool } from '@/features/play/components/PlayImmersivePlayerPool';
import { PlayImmersiveSidePanel } from '@/features/play/components/PlayImmersiveSidePanel';
import {
  PlayMediaErrorOverlay,
  PlayMediaLoadingOverlay,
  PlayMediaTranscodingOverlay,
} from '@/features/play/components/PlayMediaFeedback';
import {
  PlayWatchInteractionRail,
  PlayWatchMetaPanel,
} from '@/features/play/components/PlayWatchOverlayPanels';
import { PlayWatchVideoPlayer } from '@/features/play/components/PlayWatchVideoPlayer';
import {
  readStoredPlayContinuousPlay,
  storePlayContinuousPlay,
} from '@/features/play/constants/playContinuousPlay';
import { usePlayAdjacentMediaPreload } from '@/features/play/hooks/usePlayAdjacentMediaPreload';
import { usePlayEpisodeEngagement } from '@/features/play/hooks/usePlayEpisodeEngagement';
import { usePlayEpisodeMedia } from '@/features/play/hooks/usePlayEpisodeMedia';
import { usePlayEpisodeMetricsBridge } from '@/features/play/hooks/usePlayEpisodeMetricsBridge';
import {
  mapFeedActorsToIpActors,
  usePlayImmersiveIpActors,
} from '@/features/play/hooks/usePlayImmersiveIpActors';
import { usePlayNavigateInput } from '@/features/play/hooks/usePlayNavigateInput';
import { usePlayRequireLogin } from '@/features/play/hooks/usePlayRequireLogin';
import {
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
  mergePlayDramaCreator,
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
import { getFeedItemMediaAccessUrl } from '@/features/play/playRecommendFeed';
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
import { exitDocumentFullscreen } from '@/features/play/playViewportFullscreen';
import { resolvePlayEpisodeSelectionSearch } from '@/features/play/playWatchNavigation';
import {
  PlayFeedContentType,
  PlayImmersiveLayoutVariant,
  PlayImmersiveMode,
  PlayImmersiveSideTab,
  type PlayImmersiveViewProps,
} from '@/features/play/types/playImmersive';
import { useProfileBlockInteractionGuard } from '@/features/profile/useProfileBlockInteractionGuard';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { cn, readSnowflakeId, SHOW_DEV_ONLY_UI } from '@/utils';

const AUTO_NEXT_DELAY_MS = 1200;
const PLAY_PROGRESS_FLUSH_INTERVAL_MS = 2000;

function reportShortVideoPlayForMetrics(episodeId: string, watchMs?: number) {
  return reportPlayShortVideo(episodeId, { watchMs });
}

function reportShortVideoCompleteForMetrics(episodeId: string) {
  return reportCompletePlayShortVideo(episodeId);
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => {
    finished: Promise<void>;
  };
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

/**
 * 桌面沉浸播放壳：推荐 / 剧场二级 / 历史 / 个人中心共用。
 * Feed：上下键翻父层列表。Drama：上下键翻本剧上下集。
 * 搜索 / 个人作品 / 创作管理队列传入多条时，上下键翻作品。
 */
export function PlayImmersiveView({
  mode,
  layoutVariant,
  items,
  activeIndex,
  onActiveIndexChange,
  hasMore = false,
  onLoadMore,
  loop = false,
  targetCommentId,
  initialSideTab,
  onNotInterested,
  explicitAutoplay = false,
  recommendSessionScope,
  isMediaTranscodingPending = false,
}: PlayImmersiveViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLogin, requireLogin } = usePlayRequireLogin();
  const isMobileViewport = useMobileViewport();

  const activeItem = items[activeIndex];
  const isShortVideo =
    activeItem?.contentType === PlayFeedContentType.ShortVideo;
  const dramaId = isShortVideo ? '' : (activeItem?.dramaId ?? '');
  const explicitEpisodeNo = activeItem?.episodeNo;
  const initialEpisode = explicitEpisodeNo ?? 1;
  const feedItem = activeItem?.feed;
  const dramaIdText = parsePlayDramaId(dramaId);
  const shortVideoEpisodeId = readSnowflakeId(activeItem?.episodeId);
  const contentKeyText = isShortVideo ? shortVideoEpisodeId : dramaIdText;
  const isDramaMode = mode === PlayImmersiveMode.Drama;
  const isFeedMode = mode === PlayImmersiveMode.Feed;
  const shouldUseWebPlayerPool = !isMobileViewport && isFeedMode;
  const isFullscreenLayout =
    layoutVariant === PlayImmersiveLayoutVariant.Fullscreen;

  // 推荐 Feed 翻列表；短剧二级页默认翻集；列表队列（多条 items）才翻作品
  const isListPaging = isFeedMode || (isDramaMode && items.length > 1);
  const isDramaPlaylistPaging = isDramaMode && !isFeedMode && items.length > 1;

  const itemEpisodeKey = `${contentKeyText ?? ''}:${initialEpisode}`;
  const routeTargetEpisodeId =
    isDramaMode && !isShortVideo
      ? readSnowflakeId(activeItem?.episodeId)
      : undefined;
  const routeTargetIdentity =
    dramaIdText && routeTargetEpisodeId
      ? `${dramaIdText}:${routeTargetEpisodeId}`
      : undefined;
  const [initialFullSeriesHandoff] = useState(readFullSeriesPlaybackHandoff);
  const fullSeriesHandoff =
    isDramaMode &&
    !isShortVideo &&
    isFullSeriesPlaybackHandoffMatch(initialFullSeriesHandoff, {
      dramaId: dramaIdText,
      episodeId: routeTargetEpisodeId,
      episodeNo: explicitEpisodeNo,
    })
      ? initialFullSeriesHandoff
      : undefined;
  const explicitAutoplayEntryKey = contentKeyText
    ? `${itemEpisodeKey}:${routeTargetEpisodeId ?? 'no-target'}`
    : undefined;
  const recommendActiveKey = useMemo(
    () =>
      buildRecommendActiveKey({
        contentType: activeItem?.contentType,
        dramaId: dramaIdText,
        episodeId: activeItem?.episodeId,
      }),
    [activeItem?.contentType, activeItem?.episodeId, dramaIdText],
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
      isDramaMode && !isShortVideo && dramaIdText
        ? resolveInitialDramaPlayback({
            explicitEpisodeId: activeItem?.episodeId,
            explicitEpisodeNo: explicitEpisodeNo,
            savedEntry: readPlayDramaProgressEntry(dramaIdText),
          })
        : undefined,
    [
      activeItem?.episodeId,
      dramaIdText,
      explicitEpisodeNo,
      isDramaMode,
      isShortVideo,
    ],
  );
  const resolvedInitialEpisode =
    fullSeriesHandoff?.episodeNo ??
    dramaRestoreState?.episodeNo ??
    initialEpisode ??
    1;
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
        hasExplicitEpisodeNo: explicitEpisodeNo !== undefined,
        isDramaPlaylistPaging,
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
  const [episodeOverride, setEpisodeOverride] = useState<{
    key: string;
    episode: number;
  }>();

  // 切条后立刻用当前项集数，避免沿用上一条的 currentEpisode 误开详情请求
  const currentEpisode =
    episodeOverride?.key === itemEpisodeKey
      ? episodeOverride.episode
      : resolvedInitialEpisode;
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
  const [replaySignal, setReplaySignal] = useState(0);
  const [isCleanScreen, setIsCleanScreen] = useState(false);
  const [isEpisodeSwitching, setIsEpisodeSwitching] = useState(false);
  const [isAwaitingPlayback, setIsAwaitingPlayback] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [pendingAutoNextEpisode, setPendingAutoNextEpisode] = useState<
    number | null
  >(null);
  const defaultSideTab: PlayImmersiveSideTab =
    initialSideTab ??
    (isDramaMode ? PlayImmersiveSideTab.Drama : PlayImmersiveSideTab.Comment);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(
    isDramaMode || initialSideTab !== undefined,
  );
  const [sideTab, setSideTab] = useState<PlayImmersiveSideTab>(defaultSideTab);
  const [continuousPlay, setContinuousPlay] = useState(
    readStoredPlayContinuousPlay,
  );
  const [isWebFullscreen, setIsWebFullscreen] = useState(false);
  const [isSystemFullscreen, setIsSystemFullscreen] = useState(false);
  const [isLeavingForSearch, setIsLeavingForSearch] = useState(false);

  const currentTimeRef = useRef(resolvedInitialSeekTime);
  const currentDurationRef = useRef<number | undefined>(undefined);
  const completedProgressIdentityRef = useRef<string | undefined>(undefined);
  const replayUnlockPendingRef = useRef(false);
  const lastProgressFlushAtRef = useRef(0);
  const handleNavPrevRef = useRef(() => {});
  const handleNavNextRef = useRef(() => {});
  const commitNavPrevRef = useRef(() => {});
  const commitNavNextRef = useRef(() => {});
  const immersiveRootRef = useRef<HTMLElement | null>(null);
  const likeEffectRef = useRef<(() => void) | null>(null);
  const sidePanelBeforeWebFsRef = useRef(false);
  const pendingSystemFullscreenRef = useRef(false);
  const isSystemFullscreenRef = useRef(false);
  const ignoreWebFullscreenEscapeRef = useRef(false);
  const appliedTargetIdentityRef = useRef<string | undefined>(undefined);

  const feedPlaySource = resolveFeedPlaySource(
    getFeedItemMediaAccessUrl(feedItem),
  );
  const isOnFeedEpisode =
    (isFeedMode || isShortVideo) &&
    feedPlaySource !== undefined &&
    (feedItem?.episode?.episodeNo === undefined ||
      currentEpisode === feedItem.episode.episodeNo);

  const pendingExplicitEpisodeId = resolvePendingEpisodeTargetId({
    routeTargetEpisodeId,
    routeTargetIdentity,
    consumedTargetIdentity,
  });

  // 推荐翻页只用 feed 直出；打开侧栏或切到非 feed 集时才拉详情 / 分集
  // 短视频不入 drama 表，禁止用路由占位 dramaId（实际是 episodeId）去拉短剧分集
  const needsDramaMedia =
    !isShortVideo && (!isOnFeedEpisode || isSidePanelOpen);

  const {
    dramaDetail,
    isDramaPending,
    isDramaError,
    episodePlay: mediaEpisodePlay,
    episodeApiId: mediaEpisodeApiId,
    isEpisodeDetailEnabled,
    isEpisodeDetailError,
    isEpisodeTranscodingPending: mediaEpisodeTranscodingPending,
    isEpisodePlaybackDetailPending,
    playbackUrl: mediaPlaybackUrl,
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
    enabled: needsDramaMedia,
    targetEpisodeId: pendingExplicitEpisodeId,
  });
  // 短视频不启用 drama media hook，转码态由 ShortVideoView 显式传入
  const isEpisodeTranscodingPending =
    isMediaTranscodingPending || mediaEpisodeTranscodingPending;

  const feedDramaInfo = feedItem ? mapFeedItemToDramaInfo(feedItem) : undefined;
  const feedEpisodePlay = feedItem
    ? mapFeedItemToDramaPlayResponse(feedItem)
    : undefined;
  const feedEpisodeApiId = getEpisodeApiIdForRequests(feedEpisodePlay);
  const feedIpActors = mapFeedActorsToIpActors(
    feedItem?.drama?.actorCollections,
  );
  const feedMediaUrl = getFeedItemMediaAccessUrl(feedItem)?.trim();
  const heroPlaybackUrl = isOnFeedEpisode
    ? feedPlaySource?.url
    : mediaPlaybackUrl;
  const fallbackMp4Url = isOnFeedEpisode
    ? feedMediaUrl && !isHlsUrl(feedMediaUrl)
      ? feedMediaUrl
      : undefined
    : mediaFallbackMp4Url;
  const episodeSnapshot = isOnFeedEpisode ? feedEpisodePlay : mediaEpisodePlay;
  // 整剧收藏数/态：仅短剧 Tab 书签；播放栏用单集 favoriteCount
  // 作者：详情 / Feed 优先；单集 play 的扁平 creator* 作补齐
  const dramaInfo = mergeDramaInfoFromPlayCreator(
    mergePlayDramaCreator(dramaDetail?.dramaInfo, feedDramaInfo),
    episodeSnapshot,
  );
  const creatorUserId = getPlayDramaInfoCreatorUserId(dramaInfo);
  const { guardBlockedInteraction } =
    useProfileBlockInteractionGuard(creatorUserId);
  const dramaFavoriteCount = readPlayDramaFavoriteCount(dramaInfo);
  const dramaFavoritedByMe = readPlayDramaFavoritedByMe(dramaInfo);
  const episodeApiId =
    (isOnFeedEpisode ? feedEpisodeApiId : mediaEpisodeApiId) ??
    (currentEpisode === resolvedInitialEpisode
      ? readSnowflakeId(activeItem?.episodeId)
      : undefined);

  const engagement = usePlayEpisodeEngagement({
    dramaId,
    episodeId: episodeApiId,
    contentType: activeItem?.contentType,
    snapshot: episodeSnapshot,
    dramaFavoritedByMe,
    dramaFavoriteCount,
    isLogin,
    creatorUserId,
  });
  const episodePlay = engagement.episodePlay;
  usePlayWatchHistoryReporter({ episodeId: episodeApiId, isLogin });
  const nextFeedMediaUrl = resolveFeedPlaySource(
    getFeedItemMediaAccessUrl(items[activeIndex + 1]?.feed),
  )?.url;
  const nextEpisodeItem = isListPaging
    ? undefined
    : episodeList.find((item) => item.episodeNo === currentEpisode + 1);
  const shouldGateEpisodeIdPlayback = shouldGateExplicitEpisodePlayback({
    status: targetEpisodeStatus,
    currentEpisode,
    resolvedEpisodeNo: resolvedTargetEpisodeNo,
  });
  const nextEpisodeMediaUrl = resolveInitialPlaySource({
    hlsUrl: nextEpisodeItem?.hlsUrl,
    mp4Url: nextEpisodeItem?.videoUrl,
  })?.url;
  // pool 模式下 prev/next slot 已经用 player 实例预加载，跳过旧的 fetch 预加载
  usePlayAdjacentMediaPreload(
    shouldUseWebPlayerPool
      ? undefined
      : isFeedMode
        ? nextFeedMediaUrl
        : nextEpisodeMediaUrl,
  );

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

    setEpisodeOverride({
      key: itemEpisodeKey,
      episode: resolvedTargetEpisodeNo,
    });
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
    itemEpisodeKey,
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
      to: '/play/$dramaId',
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
    episodeApiId,
    reportEpisodePlay: isShortVideo
      ? reportShortVideoPlayForMetrics
      : reportEpisodePlay,
    reportEpisodeComplete: isShortVideo
      ? reportShortVideoCompleteForMetrics
      : reportEpisodeComplete,
    resetKey: metricsResetKey,
  });

  const { playbackRule, totalEpisodes: detailTotalEpisodes } =
    dramaDetail ?? {};
  // 短剧详情优先 roles；兼容过渡期扁平 actorCollections。短视频侧栏无角色 Tab，IP 走 feed.actors
  const roles = resolvePlayDetailRoles(dramaDetail);
  const roleIpActors = usePlayImmersiveIpActors(
    feedIpActors.length > 0 ? undefined : roles,
  );
  const ipActors = feedIpActors.length > 0 ? feedIpActors : roleIpActors;

  const totalEpisodes =
    (isOnFeedEpisode ? feedItem?.drama?.totalEpisodes : undefined) ??
    mediaEpisodeTotal ??
    detailTotalEpisodes ??
    playbackRule?.totalEpisodes ??
    feedItem?.drama?.totalEpisodes;
  const likedByMe = engagement.likedByMe;
  const favoritedByMe = engagement.favoritedByMe;
  // 播放浮层简介：优先分集 description，缺省回退整剧 desc
  const synopsisText =
    episodePlay?.description?.trim() ||
    feedItem?.episode?.description?.trim() ||
    dramaInfo?.desc?.trim() ||
    '';
  const coverImage =
    dramaInfo?.coverImg?.trim() ||
    feedItem?.episode?.coverUrl?.trim() ||
    feedItem?.drama?.coverUrl?.trim();
  const currentProgressIdentity = isFeedMode
    ? recommendActiveKey
      ? `${recommendActiveKey.contentType}:${recommendActiveKey.dramaId ?? ''}:${recommendActiveKey.episodeId}`
      : undefined
    : dramaIdText
      ? `${dramaIdText}:${currentEpisode}`
      : undefined;
  const restoredEpisodeOverrideEpisode =
    resolvedInitialEpisode !== initialEpisode
      ? resolvedInitialEpisode
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
            totalEpisodes,
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
      isFeedMode,
      isShortVideo,
      recommendActiveKey,
      recommendSessionScope,
      totalEpisodes,
      userPaused,
    ],
  );
  const flushCurrentProgressRef = useRef(flushCurrentProgress);
  flushCurrentProgressRef.current = flushCurrentProgress;

  // 切 Feed / 切集只重置播放态；侧栏开合与 Tab 保持，避免评论/角色看一半被关掉
  // biome-ignore lint/correctness/useExhaustiveDependencies: initialEpisode 表示同剧切集边界
  useLayoutEffect(() => {
    if (!contentKeyText) {
      return;
    }

    setEpisodeOverride(
      restoredEpisodeOverrideEpisode === undefined
        ? undefined
        : { key: itemEpisodeKey, episode: restoredEpisodeOverrideEpisode },
    );
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
          hasExplicitEpisodeNo: explicitEpisodeNo !== undefined,
          isDramaPlaylistPaging,
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
    setIsSynopsisExpanded(false);
    setIsCleanScreen(false);
  }, [
    contentKeyText,
    initialEpisode,
    resolvedInitialSeekTime,
    itemEpisodeKey,
    restoredEpisodeOverrideEpisode,
    shouldRestoreRecommendPlayback,
    recommendRestorePaused,
    dramaRestoreState?.restoredFromHistory,
    explicitEpisodeNo,
    fullSeriesHandoff,
    routeTargetEpisodeId,
    applyExplicitAutoplay,
    isDramaPlaylistPaging,
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
    if (!explicitAutoplay || !isDramaMode) {
      return;
    }

    void navigate({
      to: '/play/$dramaId',
      params: { dramaId },
      search: (prev) => ({
        ...prev,
        autoplay: undefined,
      }),
      replace: true,
    });
  }, [dramaId, explicitAutoplay, isDramaMode, navigate]);

  useEffect(() => {
    if (replaySignal <= 0) {
      return;
    }

    replayUnlockPendingRef.current = true;
  }, [replaySignal]);

  // 仅入口模式切换时重置侧栏默认态（推荐关 / 短剧开「短剧」Tab）
  useLayoutEffect(() => {
    setIsSidePanelOpen(isDramaMode || initialSideTab !== undefined);
    setSideTab(
      initialSideTab ??
        (isDramaMode
          ? PlayImmersiveSideTab.Drama
          : PlayImmersiveSideTab.Comment),
    );
  }, [initialSideTab, isDramaMode]);

  useLayoutEffect(() => {
    if (!targetCommentId) {
      return;
    }

    setSideTab(PlayImmersiveSideTab.Comment);
    setIsSidePanelOpen(true);
  }, [targetCommentId]);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅跟踪待切集数
  useEffect(() => {
    if (pendingAutoNextEpisode === null) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setPendingAutoNextEpisode(null);
      changeEpisode(pendingAutoNextEpisode, 'auto-next');
    }, AUTO_NEXT_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [pendingAutoNextEpisode]);

  // 全屏短剧页：首次进入时记下入口 history，关闭时一次退回，不跟播放器内切剧
  useEffect(() => {
    if (!isFullscreenLayout || !isDramaMode) {
      return;
    }

    rememberPlayImmersiveReturnIfNeeded();
    return () => {
      if (!isPlayDramaImmersivePath(window.location.pathname)) {
        clearPlayImmersiveReturn();
      }
    };
  }, [isDramaMode, isFullscreenLayout]);

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

  // 距列表末尾 3 条时预取下一页，保证传入的列表能继续翻页
  useEffect(() => {
    if (
      !onLoadMore ||
      !hasMore ||
      items.length === 0 ||
      activeIndex < items.length - 3
    ) {
      return;
    }

    onLoadMore();
  }, [activeIndex, hasMore, items.length, onLoadMore]);

  useEffect(() => {
    const syncSystemFullscreen = () => {
      const next = Boolean(document.fullscreenElement);
      if (isSystemFullscreenRef.current && !next) {
        ignoreWebFullscreenEscapeRef.current = true;
        window.setTimeout(() => {
          ignoreWebFullscreenEscapeRef.current = false;
        }, 50);

        // 退出系统全屏时一并退出网页全屏，直接回到进入前的页面
        setIsWebFullscreen(false);
        setIsSidePanelOpen(sidePanelBeforeWebFsRef.current);
      }

      isSystemFullscreenRef.current = next;
      setIsSystemFullscreen(next);
    };

    syncSystemFullscreen();
    document.addEventListener('fullscreenchange', syncSystemFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncSystemFullscreen);
    };
  }, []);

  useEffect(() => {
    if (!isWebFullscreen) {
      return;
    }

    const handleEscapeWebFullscreen = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (document.fullscreenElement) {
        return;
      }

      if (ignoreWebFullscreenEscapeRef.current) {
        ignoreWebFullscreenEscapeRef.current = false;
        return;
      }

      event.preventDefault();
      setIsWebFullscreen(false);
      setIsSidePanelOpen(sidePanelBeforeWebFsRef.current);
    };

    window.addEventListener('keydown', handleEscapeWebFullscreen, true);
    return () => {
      window.removeEventListener('keydown', handleEscapeWebFullscreen, true);
    };
  }, [isWebFullscreen]);

  useLayoutEffect(() => {
    if (!pendingSystemFullscreenRef.current || !isWebFullscreen) {
      return;
    }

    pendingSystemFullscreenRef.current = false;
    const node = immersiveRootRef.current;
    if (node) {
      void node.requestFullscreen().catch(() => {});
      return;
    }

    void document.documentElement.requestFullscreen().catch(() => {});
  }, [isWebFullscreen]);

  const canNavPrev = isListPaging ? activeIndex > 0 : currentEpisode > 1;
  const canNavNext = isListPaging
    ? activeIndex < items.length - 1 || hasMore || (loop && items.length > 1)
    : totalEpisodes !== undefined && currentEpisode < totalEpisodes;

  const { slideRef, runSlide } = usePlayWatchEpisodeGesture({
    // 桌面 / 触控屏：垂直拖拽切条；清屏时关闭避免误触
    enabled: !isCleanScreen,
    canSwipeUp: canNavNext,
    canSwipeDown: canNavPrev,
    onCommit: (direction) => {
      if (direction === 'up') {
        return () => {
          commitNavNextRef.current();
        };
      }

      return () => {
        commitNavPrevRef.current();
      };
    },
  });

  const beginEpisodeTransition = (episode: number) => {
    setIsEpisodeSwitching(true);
    setIsAwaitingPlayback(true);
    setUserPaused(false);
    setAutoplayBlocked(false);
    prefetchEpisodeDetail(episode);
  };

  const changeEpisode = (
    episode: number,
    entryReason: PlaybackEntryReason = 'user-episode-change',
  ) => {
    if (
      episode < 1 ||
      episode === currentEpisode ||
      (totalEpisodes !== undefined && episode > totalEpisodes)
    ) {
      return;
    }

    if (isDramaMode && !isShortVideo) {
      void navigate({
        to: '/play/$dramaId',
        params: { dramaId },
        search: (previousSearch) =>
          resolvePlayEpisodeSelectionSearch(previousSearch, episode),
        replace: true,
      });
    }

    flushCurrentProgress();
    beginEpisodeTransition(episode);
    setPlaybackEntryReason(entryReason);
    setEpisodeOverride({ key: itemEpisodeKey, episode });
    currentTimeRef.current = 0;
    currentDurationRef.current = undefined;
    setEpisodeSeekTime(0);
  };

  // 翻页时播放器区域做抖音式上下滑；下一条向上滑出，上一条向下滑出
  const navigateWithSlide = (
    direction: PlayWatchEpisodeSlideDirection,
    commit: () => void,
  ) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit();
      return;
    }

    runSlide(direction, commit);
  };

  const commitFeedIndexChange = (nextIndex: number) => {
    setUserPaused(false);
    setAutoplayBlocked(false);
    setPlaybackEntryReason('user-episode-change');
    onActiveIndexChange(nextIndex);
  };

  const commitNavPrev = () => {
    if (isListPaging) {
      if (activeIndex <= 0) {
        return;
      }

      flushCurrentProgress();
      commitFeedIndexChange(activeIndex - 1);
      return;
    }

    const prevEpisode = currentEpisode - 1;
    if (prevEpisode < 1) {
      return;
    }

    changeEpisode(prevEpisode);
  };

  const commitNavNext = () => {
    if (isListPaging) {
      if (activeIndex < items.length - 1) {
        flushCurrentProgress();
        commitFeedIndexChange(activeIndex + 1);
        return;
      }

      // 已到当前页末条：先拉下一页，再把目标下标交给父层
      if (hasMore) {
        flushCurrentProgress();
        onLoadMore?.();
        commitFeedIndexChange(activeIndex + 1);
        return;
      }

      if (loop && items.length > 1) {
        flushCurrentProgress();
        commitFeedIndexChange(0);
      }
      return;
    }

    const nextEpisode = currentEpisode + 1;
    if (totalEpisodes !== undefined && nextEpisode > totalEpisodes) {
      return;
    }

    changeEpisode(nextEpisode);
  };

  commitNavPrevRef.current = commitNavPrev;
  commitNavNextRef.current = commitNavNext;

  const handleNavPrev = () => {
    if (!canNavPrev) {
      return;
    }

    navigateWithSlide('down', commitNavPrev);
  };

  const handleNavNext = () => {
    if (!canNavNext) {
      return;
    }

    navigateWithSlide('up', commitNavNext);
  };

  // 供键盘 / 滚轮读取最新翻页函数
  handleNavPrevRef.current = handleNavPrev;
  handleNavNextRef.current = handleNavNext;

  // 滚轮 + 键盘上下箭头切条（触摸由 usePlayWatchEpisodeGesture 负责）
  usePlayNavigateInput({
    enabled: !isCleanScreen,
    canPrev: canNavPrev,
    canNext: canNavNext,
    onPrev: handleNavPrev,
    onNext: handleNavNext,
    targetRef: immersiveRootRef,
  });

  const isPageFilled = isFullscreenLayout || isWebFullscreen;

  // 关闭：一次回到进入播放器前的页面（剧场 / 推荐 / 搜索），不沿切剧历史逐步回退
  const handleBack = () => {
    flushCurrentProgress();
    exitPlayImmersiveToReturn(() => {
      void navigate({ to: '/play', replace: true });
    });
  };

  const handleToggleLike = () => {
    if (!requireLogin()) {
      return;
    }

    if (!episodeApiId) {
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

    if (!episodeApiId) {
      toast.error(t('再试一次'));
      return false;
    }

    if (!likedByMe && !engagement.isLikePending) {
      void engagement.toggleLike();
    }

    return true;
  };

  const handleRegisterLikeEffect = useCallback((show: (() => void) | null) => {
    likeEffectRef.current = show;
  }, []);

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

  // 单集列表只读点赞数：合并播放栏 overlay，点赞后即时刷新数字
  const resolveEpisodeLikeCount = (
    targetEpisodeId: string | undefined,
    listLikeCount?: number,
  ) =>
    engagement.resolveLikeState(targetEpisodeId, {
      likeCount: listLikeCount,
    }).likeCount;

  const handleShare = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const shareText = buildPlayShareText({
        origin: window.location.origin,
        contentType: activeItem?.contentType,
        dramaId: dramaIdText,
        episodeId: episodeApiId,
        episodeNo: currentEpisode,
        dramaTitle: dramaInfo?.title,
        description: synopsisText,
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

  // 评论按钮打开右侧面板并默认评论 Tab
  const handleOpenComment = () => {
    if (!guardBlockedInteraction('comment')) {
      return;
    }

    void engagement.refresh();
    setSideTab(PlayImmersiveSideTab.Comment);
    setIsSidePanelOpen(true);
  };

  const handleSideTabChange = (tab: PlayImmersiveSideTab) => {
    if (tab === PlayImmersiveSideTab.Comment) {
      void engagement.refresh();
    }
    setSideTab(tab);
  };

  // 标题点击：推荐页打开短剧 Tab；二级页同样打开选集
  const handleOpenDramaTab = () => {
    setSideTab(PlayImmersiveSideTab.Drama);
    setIsSidePanelOpen(true);
  };

  // 左侧 IP 头像组打开角色 Tab
  const handleOpenCharacterTab = () => {
    if (!SHOW_DEV_ONLY_UI) {
      return;
    }

    setSideTab(PlayImmersiveSideTab.Character);
    setIsSidePanelOpen(true);
  };

  useEffect(() => {
    if (SHOW_DEV_ONLY_UI || sideTab !== PlayImmersiveSideTab.Character) {
      return;
    }

    setSideTab(PlayImmersiveSideTab.Drama);
  }, [sideTab]);

  // 观看完整短剧 · 全 N 集：进入短剧二级页，上下键改走本剧集数
  const handleWatchFullSeries = () => {
    if (!dramaIdText) {
      handleOpenDramaTab();
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
      episodeId: episodeApiId,
      episodeNo: currentEpisode,
      currentTime,
      paused,
    });
    usePlayPlaylistStore.getState().clearPlaylist();
    const navigateToFullscreen = () =>
      navigate({
        to: '/play/$dramaId',
        params: { dramaId: dramaIdText },
        search: { episode: currentEpisode, episodeId: episodeApiId },
      });
    const transitionDocument = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (!transitionDocument.startViewTransition || reduceMotion) {
      void navigateToFullscreen();
      return;
    }

    const transition =
      transitionDocument.startViewTransition(navigateToFullscreen);
    void transition.finished.catch(() => {});
  };

  // 清屏只隐藏视频上的信息层，保留翻页按钮与侧栏，避免播放器被拉宽
  const handleCleanScreenChange = (checked: boolean) => {
    setIsCleanScreen(checked);
  };

  // 连播开关写入 localStorage，刷新后保持上次选择
  const handleContinuousPlayChange = (checked: boolean) => {
    setContinuousPlay(checked);
    storePlayContinuousPlay(checked);
  };

  const enterWebFullscreen = () => {
    if (isWebFullscreen) {
      return;
    }

    sidePanelBeforeWebFsRef.current = isSidePanelOpen;
    setIsSidePanelOpen(false);
    setIsWebFullscreen(true);
  };

  const exitWebFullscreen = () => {
    if (document.fullscreenElement) {
      exitDocumentFullscreen();
    }

    setIsWebFullscreen(false);
    setIsSidePanelOpen(sidePanelBeforeWebFsRef.current);
  };

  const requestSystemFullscreen = () => {
    const node = immersiveRootRef.current;
    if (node) {
      void node.requestFullscreen().catch(() => {});
      return;
    }

    void document.documentElement.requestFullscreen().catch(() => {});
  };

  // 网页全屏：铺满浏览器内容区，不走系统 Fullscreen API
  const handleWebFullscreen = () => {
    if (isWebFullscreen) {
      exitWebFullscreen();
      return;
    }

    enterWebFullscreen();
  };

  // 系统全屏：浏览器原生全屏；未网页全屏时先铺满播放器再进入
  const handleSystemFullscreen = () => {
    if (document.fullscreenElement) {
      exitDocumentFullscreen();
      return;
    }

    if (!isWebFullscreen) {
      pendingSystemFullscreenRef.current = true;
      enterWebFullscreen();
      return;
    }

    requestSystemFullscreen();
  };

  const handleEpisodePlaybackEnded = () => {
    engagement.markPaused();

    if (mode === PlayImmersiveMode.Feed || isListPaging || !isShortVideo) {
      flushCurrentProgress({ completed: true });
    }

    // 普通详情右栏打开时保持当前条；列表队列 loop 时仍连续播放
    if (isSidePanelOpen && !loop) {
      setReplaySignal((prev) => prev + 1);
      return;
    }

    // 关闭连播：业务层重播当前条；列表循环连播不受该开关影响
    if (!continuousPlay && !loop) {
      setReplaySignal((prev) => prev + 1);
      return;
    }

    if (mode === PlayImmersiveMode.Feed || isListPaging) {
      if (activeIndex < items.length - 1) {
        navigateWithSlide('up', () => {
          commitFeedIndexChange(activeIndex + 1);
        });
        return;
      }

      if (hasMore) {
        navigateWithSlide('up', () => {
          onLoadMore?.();
          commitFeedIndexChange(activeIndex + 1);
        });
        return;
      }

      if (loop && items.length > 1) {
        navigateWithSlide('up', () => {
          commitFeedIndexChange(0);
        });
        return;
      }

      setReplaySignal((prev) => prev + 1);
      return;
    }

    // 短视频单条（含个人中心仅 1 条）：播完停止，禁止误走剧集「下一集」
    if (isShortVideo) {
      flushCurrentProgress({ completed: true });
      replayUnlockPendingRef.current = true;
      setUserPaused(true);
      return;
    }

    const nextEpisode = currentEpisode + 1;
    if (totalEpisodes !== undefined && nextEpisode > totalEpisodes) {
      setReplaySignal((prev) => prev + 1);
      return;
    }

    setPendingAutoNextEpisode(nextEpisode);
  };

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

  const showPlaybackBlockingOverlay =
    !hasActivatedPlayback || isEpisodeTranscodingPending;
  const isLoading =
    showPlaybackBlockingOverlay &&
    !isEpisodeTranscodingPending &&
    (shouldGateEpisodeIdPlayback && targetEpisodeStatus !== 'error'
      ? true
      : isOnFeedEpisode
        ? false
        : isDramaPending ||
          isEpisodePlaybackDetailPending ||
          (isEpisodeDetailEnabled &&
            !heroPlaybackUrl &&
            !isEpisodeSwitching &&
            !isEpisodeDetailError));

  const isEpisodeTransitioning = isEpisodeSwitching || isAwaitingPlayback;
  const showCenterPlayButton =
    (userPaused || autoplayBlocked) &&
    !isSynopsisExpanded &&
    !isEpisodeTransitioning;

  const handleUserPause = () => {
    handlePause();
    engagement.markPaused();
    setUserPaused(true);
    setAutoplayBlocked(false);
    flushCurrentProgress({ paused: true });
  };

  const handleUserPlay = () => {
    handlePlayStart();
    engagement.markPlaying();
    setHasActivatedPlayback(true);
    setUserPaused(false);
    setAutoplayBlocked(false);
    setIsAwaitingPlayback(false);
    flushCurrentProgress({ paused: false });
  };

  const handleSearchStart = () => {
    setIsLeavingForSearch(true);
  };

  const handleSearchError = () => {
    setIsLeavingForSearch(false);
  };

  if (isLeavingForSearch) {
    return null;
  }

  if (contentKeyText === undefined || (isDramaError && !isOnFeedEpisode)) {
    return (
      <AppLoadingContainer
        data={[]}
        isLoading={false}
        isError
        minHeight={480}
        emptyDescription={t('暂无短剧')}
      >
        {null}
      </AppLoadingContainer>
    );
  }

  return (
    <section
      ref={immersiveRootRef}
      className={cn(
        'flex min-h-0 w-full overflow-hidden',
        isPageFilled
          ? 'h-dvh items-stretch'
          : 'h-[calc(100dvh-3.5rem)] items-center py-3 pl-3 md:pl-4',
        isWebFullscreen && 'fixed inset-0 z-50',
        'bg-background',
      )}
    >
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 overflow-hidden',
          !isPageFilled && 'self-stretch rounded-xl',
        )}
      >
        <div
          className={cn(
            'play-immersive-video-frame relative flex min-h-0 min-w-0 flex-1 overflow-hidden',
            // 桌面保底：侧栏拉开时播放器不小于约 9:16 可用区
            'md:min-h-[480px] md:min-w-[360px]',
            'bg-black',
          )}
        >
          <div
            ref={slideRef}
            className="relative size-full will-change-transform"
          >
            {shouldUseWebPlayerPool ? (
              <PlayImmersivePlayerPool
                items={items}
                activeIndex={activeIndex}
                currentMediaUrl={heroPlaybackUrl}
                currentFallbackMp4Url={fallbackMp4Url}
                currentCoverImage={coverImage}
                currentInitialTime={episodeSeekTime}
                isEpisodeSwitching={isEpisodeSwitching}
                shouldGatePlayback={shouldGateEpisodeIdPlayback}
                activePlayerProps={{
                  isEpisodeSwitching,
                  initialTime: episodeSeekTime,
                  autoplayOnMount: shouldAutoplayForEntryReason(
                    playbackEntryReason,
                    {
                      explicitAutoplay: applyExplicitAutoplay,
                      recommendPaused: recommendRestorePaused,
                    },
                  ),
                  showDesktopTapLayer: true,
                  centerPlayVariant: 'immersive',
                  showLoadingBeforePlay: true,
                  showCenterPlayButton,
                  allowAutoplayBlockedPrompt: !isEpisodeSwitching,
                  onAutoplayBlocked: () => {
                    if (isEpisodeSwitching) {
                      return;
                    }
                    setAutoplayBlocked(true);
                    setIsAwaitingPlayback(false);
                  },
                  onTimeUpdate: handleTimeUpdate,
                  onEnded: handleEpisodePlaybackEnded,
                  replaySignal,
                  onPlaying: () => {
                    if (replayUnlockPendingRef.current) {
                      replayUnlockPendingRef.current = false;
                      if (
                        completedProgressIdentityRef.current ===
                        currentProgressIdentity
                      ) {
                        completedProgressIdentityRef.current = undefined;
                      }
                    }
                    handlePlayStart();
                    engagement.markPlaying();
                    setHasActivatedPlayback(true);
                    setIsAwaitingPlayback(false);
                    setUserPaused(false);
                    setAutoplayBlocked(false);
                  },
                  onUserPause: handleUserPause,
                  onUserPlay: handleUserPlay,
                  onDoubleTapLike: handleDoubleTapLike,
                  onRegisterLikeEffect: handleRegisterLikeEffect,
                  shouldAutoResumeOnForeground: shouldForegroundAutoResume({
                    hasActivatedPlayback,
                    userPaused,
                  }),
                  onSystemPaused: () => {
                    setUserPaused(true);
                  },
                  onForegroundRecoverFailed: () => {
                    refetchEpisodeDetail();
                  },
                  onPlayerError: () => {
                    engagement.markPaused();
                    setPlayerError(true);
                  },
                }}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 z-35',
                    'flex flex-col justify-end overflow-visible',
                  )}
                >
                  <div
                    className={cn(
                      'pointer-events-none flex min-h-0 flex-1 items-end justify-between pl-4',
                    )}
                  >
                    {!isCleanScreen ? (
                      <div
                        data-play-watch-no-swipe
                        onPointerDown={playWatchStopGestureBubble}
                        onTouchStart={playWatchStopGestureBubble}
                        className={cn(
                          'flex min-w-0 flex-1 flex-col items-start pb-3',
                          getPlayImmersiveIpMetaGapClass(ipActors.length),
                        )}
                      >
                        <PlayImmersiveIpPanel
                          actors={ipActors}
                          onOpenCharacterTab={handleOpenCharacterTab}
                        />
                        <PlayWatchMetaPanel
                          dramaInfo={dramaInfo}
                          currentEpisode={currentEpisode}
                          totalEpisodes={totalEpisodes}
                          synopsisText={synopsisText}
                          isExpanded={isSynopsisExpanded}
                          showSeriesCtas={
                            !isDramaMode &&
                            !isShortVideo &&
                            totalEpisodes !== undefined &&
                            totalEpisodes > 1
                          }
                          showEpisodeLabel={!isShortVideo}
                          titleAsCreatorProfile={isShortVideo}
                          onToggleExpanded={() => {
                            setIsSynopsisExpanded((prev) => !prev);
                          }}
                          onTitleClick={
                            isShortVideo ? undefined : handleOpenDramaTab
                          }
                          onWatchFullSeries={handleWatchFullSeries}
                        />
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1" />
                    )}
                    <div
                      className={cn(
                        'flex h-full flex-col items-end justify-end',
                      )}
                    >
                      <div aria-hidden className="h-45.25 shrink" />
                      {isPageFilled ? (
                        <PlayImmersiveNavButtons
                          layoutVariant={PlayImmersiveLayoutVariant.Fullscreen}
                          canGoPrev={canNavPrev}
                          canGoNext={canNavNext}
                          onPrev={handleNavPrev}
                          onNext={handleNavNext}
                          className="pointer-events-auto mr-5.5 hidden shrink-0 md:flex"
                        />
                      ) : null}
                      <div className="min-h-0 flex-1" />
                      {!isCleanScreen ? (
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
                          onNotInterested={onNotInterested}
                          onWorkReportDone={
                            isListPaging ? handleNavNext : undefined
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                  <PlayImmersiveDesktopControls
                    continuousPlay={continuousPlay}
                    onContinuousPlayChange={handleContinuousPlayChange}
                    isCleanScreen={isCleanScreen}
                    onCleanScreenChange={handleCleanScreenChange}
                    isWebFullscreen={isWebFullscreen}
                    onWebFullscreen={handleWebFullscreen}
                    isSystemFullscreen={isSystemFullscreen}
                    onSystemFullscreen={handleSystemFullscreen}
                    onUserPause={handleUserPause}
                    onUserPlay={handleUserPlay}
                  />
                </div>
              </PlayImmersivePlayerPool>
            ) : (
              <PlayWatchVideoPlayer
                key={`${contentKeyText}:${activeIndex}:${currentEpisode}`}
                mediaUrl={
                  shouldGateEpisodeIdPlayback ? undefined : heroPlaybackUrl
                }
                fallbackMediaUrl={fallbackMp4Url}
                isEpisodeSwitching={isEpisodeSwitching}
                initialTime={episodeSeekTime}
                autoplayOnMount={shouldAutoplayForEntryReason(
                  playbackEntryReason,
                  {
                    explicitAutoplay: applyExplicitAutoplay,
                    recommendPaused: recommendRestorePaused,
                  },
                )}
                showDesktopTapLayer
                centerPlayVariant="immersive"
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
                showCenterPlayButton={showCenterPlayButton}
                allowAutoplayBlockedPrompt={!isEpisodeSwitching}
                onAutoplayBlocked={() => {
                  if (isEpisodeSwitching) {
                    return;
                  }

                  setAutoplayBlocked(true);
                  setIsAwaitingPlayback(false);
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEpisodePlaybackEnded}
                replaySignal={replaySignal}
                onPlaying={() => {
                  if (replayUnlockPendingRef.current) {
                    replayUnlockPendingRef.current = false;
                    if (
                      completedProgressIdentityRef.current ===
                      currentProgressIdentity
                    ) {
                      completedProgressIdentityRef.current = undefined;
                    }
                  }

                  handlePlayStart();
                  engagement.markPlaying();
                  setHasActivatedPlayback(true);
                  setIsAwaitingPlayback(false);
                  setUserPaused(false);
                  setAutoplayBlocked(false);
                }}
                onUserPause={handleUserPause}
                onUserPlay={handleUserPlay}
                onDoubleTapLike={handleDoubleTapLike}
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
                onPlayerError={() => {
                  engagement.markPaused();
                  setPlayerError(true);
                }}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 z-35',
                    'flex flex-col justify-end overflow-visible',
                  )}
                >
                  <div
                    className={cn(
                      'pointer-events-none flex min-h-0 flex-1 items-end justify-between pl-4',
                    )}
                  >
                    {!isCleanScreen ? (
                      <div
                        data-play-watch-no-swipe
                        onPointerDown={playWatchStopGestureBubble}
                        onTouchStart={playWatchStopGestureBubble}
                        className={cn(
                          'flex min-w-0 flex-1 flex-col items-start pb-3',
                          getPlayImmersiveIpMetaGapClass(ipActors.length),
                        )}
                      >
                        <PlayImmersiveIpPanel
                          actors={ipActors}
                          onOpenCharacterTab={handleOpenCharacterTab}
                        />
                        <PlayWatchMetaPanel
                          dramaInfo={dramaInfo}
                          currentEpisode={currentEpisode}
                          totalEpisodes={totalEpisodes}
                          synopsisText={synopsisText}
                          isExpanded={isSynopsisExpanded}
                          showSeriesCtas={
                            !isDramaMode &&
                            !isShortVideo &&
                            totalEpisodes !== undefined &&
                            totalEpisodes > 1
                          }
                          showEpisodeLabel={!isShortVideo}
                          titleAsCreatorProfile={isShortVideo}
                          onToggleExpanded={() => {
                            setIsSynopsisExpanded((prev) => !prev);
                          }}
                          onTitleClick={
                            isShortVideo ? undefined : handleOpenDramaTab
                          }
                          onWatchFullSeries={handleWatchFullSeries}
                        />
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1" />
                    )}
                    <div
                      className={cn(
                        'flex h-full flex-col items-end justify-end',
                      )}
                    >
                      <div aria-hidden className="h-45.25 shrink" />
                      {isPageFilled ? (
                        <PlayImmersiveNavButtons
                          layoutVariant={PlayImmersiveLayoutVariant.Fullscreen}
                          canGoPrev={canNavPrev}
                          canGoNext={canNavNext}
                          onPrev={handleNavPrev}
                          onNext={handleNavNext}
                          className="pointer-events-auto mr-5.5 hidden shrink-0 md:flex"
                        />
                      ) : null}
                      <div className="min-h-0 flex-1" />
                      {!isCleanScreen ? (
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
                          onNotInterested={onNotInterested}
                          onWorkReportDone={
                            isListPaging ? handleNavNext : undefined
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                  <PlayImmersiveDesktopControls
                    continuousPlay={continuousPlay}
                    onContinuousPlayChange={handleContinuousPlayChange}
                    isCleanScreen={isCleanScreen}
                    onCleanScreenChange={handleCleanScreenChange}
                    isWebFullscreen={isWebFullscreen}
                    onWebFullscreen={handleWebFullscreen}
                    isSystemFullscreen={isSystemFullscreen}
                    onSystemFullscreen={handleSystemFullscreen}
                    onUserPause={handleUserPause}
                    onUserPlay={handleUserPlay}
                  />
                </div>
              </PlayWatchVideoPlayer>
            )}

            {isDramaMode && !isCleanScreen ? (
              <PlayImmersiveDramaTopBar
                onClose={handleBack}
                onSearchStart={handleSearchStart}
                onSearchError={handleSearchError}
              />
            ) : null}

            {isLoading ? (
              <PlayMediaLoadingOverlay dim label={t('加载中')} />
            ) : null}

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

            {isEpisodeTransitioning &&
            !isLoading &&
            showPlaybackBlockingOverlay ? (
              <div className="pointer-events-none absolute inset-0 z-25 bg-black/70" />
            ) : null}
          </div>
        </div>

        {isSidePanelOpen ? (
          <PlayImmersiveSidePanel
            layoutVariant={layoutVariant}
            tab={sideTab}
            onTabChange={handleSideTabChange}
            onClose={() => {
              setIsSidePanelOpen(false);
            }}
            dramaId={dramaId}
            isShortVideo={isShortVideo}
            dramaInfo={dramaInfo}
            roles={roles}
            totalEpisodes={totalEpisodes ?? 1}
            episodes={episodeList}
            currentEpisode={currentEpisode}
            episodeApiId={episodeApiId}
            commentCount={episodePlay?.commentCount}
            creatorUserId={creatorUserId}
            targetCommentId={targetCommentId}
            onSelectEpisode={changeEpisode}
            resolveEpisodeLikeCount={resolveEpisodeLikeCount}
            dramaFavoritedByMe={engagement.dramaFavoritedByMe}
            isDramaFavoritePending={engagement.isDramaFavoritePending}
            onToggleDramaFavorite={handleToggleDramaFavorite}
            onNotInterested={onNotInterested}
            className={cn(
              'hidden shrink-0 border-l border-border md:flex',
              isFullscreenLayout
                ? 'play-fullscreen-side-panel w-[343px]'
                : 'w-[clamp(343px,25vw,660px)]',
            )}
          />
        ) : null}
      </div>

      {!isPageFilled ? (
        <PlayImmersiveNavButtons
          layoutVariant={layoutVariant}
          canGoPrev={canNavPrev}
          canGoNext={canNavNext}
          onPrev={handleNavPrev}
          onNext={handleNavNext}
          className="hidden shrink-0 self-center px-4 md:flex"
        />
      ) : null}
    </section>
  );
}
