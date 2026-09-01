import {
  Gesture,
  MediaPlayer,
  type MediaPlayerInstance,
  MediaProvider,
  TimeSlider,
  useMediaPlayer,
  useMediaRemote,
  useMediaState,
  VolumeSlider,
} from '@vidstack/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import IconPlayerCleanScreen from '@/assets/svg/IconPlayerCleanScreen';
import IconPlayerCleanScreenExit from '@/assets/svg/IconPlayerCleanScreenExit';
import IconPlayerFullscreen from '@/assets/svg/IconPlayerFullscreen';
import IconPlayerPause from '@/assets/svg/IconPlayerPause';
import IconPlayerPlay from '@/assets/svg/IconPlayerPlay';
import IconPlayerSkipBack from '@/assets/svg/IconPlayerSkipBack';
import IconPlayerSkipForward from '@/assets/svg/IconPlayerSkipForward';
import IconPlayerVolume2 from '@/assets/svg/IconPlayerVolume2';
import IconPlayerVolumeOff from '@/assets/svg/IconPlayerVolumeOff';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  PlayBrowserUnsupportedOverlay,
  PlayMediaErrorOverlay,
  PlayMediaLoadingOverlay,
  PlayMediaTranscodingOverlay,
} from '@/features/play/components/PlayMediaFeedback';
import {
  PlayMediaAudioSync,
  PlayMediaPauseOnEpisodeSwitch,
} from '@/features/play/components/PlayMediaSyncs';
import { PlayVideoTapToToggle } from '@/features/play/components/PlayVideoTapToToggle';
import type {
  PlayEpisodeMetricsReportSignals,
  PlayEpisodeMetricsTracker,
} from '@/features/play/playEpisodeMetricsTracker';
import { PLAY_MEDIA_PLAYER_PROPS } from '@/features/play/playMediaPlayer';
import { MOBILE_MAX_WIDTH_MEDIA_QUERY } from '@/hooks/useAppBreakpoints';
import { usePlayMediaAudioStore } from '@/stores/playMediaAudioStore';
import { cn } from '@/utils';

export type PlayVideoOverlayProps = {
  isPlayerOpen: boolean;
  onPlayerOpenChange: (open: boolean) => void;
  mediaUrl?: string;
  fallbackMediaUrl?: string;
  isFetchingUrl: boolean;
  /** 集详情拉取失败：无法得到播放地址时展示错误兜底 */
  isEpisodeDetailError?: boolean;
  /** 视频后台转码中：展示解码等待兜底 */
  isEpisodeTranscodingPending?: boolean;
  /** 转码等待时铺底封面，避免纯黑 */
  coverImage?: string;
  /** 错误兜底「重试」回调 */
  onRetryEpisodeDetail?: () => void;
  dramaTitle?: string;
  currentEpisode: number;
  episodeTotal: number;
  onEpisodeChange: (episode: number) => void;
  metricsTracker?: PlayEpisodeMetricsTracker | null;
  onMetricsSignals?: (signals: PlayEpisodeMetricsReportSignals) => void;
  layout?: 'default' | 'embedded';
};

// 暂停态用持续展示的「中央三角播放按钮」表达，不走短暂 OSD；
// OSD 仅承载 seek / 音量 / 静音 等需要瞬时反馈的动作。
type OsdItem =
  | { kind: 'seek'; delta: number }
  | { kind: 'volume'; value: number }
  | { kind: 'mute' }
  | { kind: 'unmute' };

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainSeconds = total % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
}

function prefersMobileViewportFullscreen() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia(MOBILE_MAX_WIDTH_MEDIA_QUERY).matches ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

type PlayVideoOverlayChromeProps = PlayVideoOverlayProps & {
  isViewportFullscreen: boolean;
  onViewportFullscreenChange: (open: boolean) => void;
  isSwitchingEpisode: boolean;
};

/** 打开 UI 或切换播放地址时 play；关闭时 pause；HLS 未就绪时等 canPlay 后再补一次 */
function PlayVideoPlaybackSync({
  isPlayerOpen,
  mediaSrc,
}: {
  isPlayerOpen: boolean;
  mediaSrc: string;
}) {
  const remote = useMediaRemote();
  const prevOpenRef = useRef<boolean | null>(null);
  const prevMediaSrcRef = useRef('');
  const pendingAutoplayRef = useRef(false);
  const canPlay = useMediaState('canPlay');
  const paused = useMediaState('paused');

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = isPlayerOpen;

    if (isPlayerOpen) {
      // 含首次挂载时 isPlayerOpen 已为 true（播放地址晚于 open 到达）
      if (wasOpen === false || wasOpen === null) {
        pendingAutoplayRef.current = true;
        remote.play();
      }
      return;
    }

    pendingAutoplayRef.current = false;
    if (wasOpen === true) {
      remote.pause();
    }
  }, [isPlayerOpen, remote]);

  useEffect(() => {
    if (!isPlayerOpen || !mediaSrc) {
      return;
    }

    const previousSrc = prevMediaSrcRef.current;
    if (previousSrc === mediaSrc) {
      return;
    }

    prevMediaSrcRef.current = mediaSrc;
    if (!previousSrc) {
      return;
    }

    pendingAutoplayRef.current = true;
    remote.seek(0);
    remote.play();
  }, [isPlayerOpen, mediaSrc, remote]);

  useEffect(() => {
    if (!pendingAutoplayRef.current || !isPlayerOpen) {
      return;
    }

    if (!canPlay) {
      return;
    }

    if (paused) {
      remote.play();
      return;
    }

    pendingAutoplayRef.current = false;
  }, [canPlay, isPlayerOpen, paused, remote]);

  return null;
}

/** 切集导致原生全屏短暂退出时，在新片源就绪后恢复桌面全屏 */
function PlayVideoFullscreenRestore({
  isViewportFullscreen,
  isEmbeddedLayout,
  activeMediaSrc,
  isSwitchingEpisode,
}: {
  isViewportFullscreen: boolean;
  isEmbeddedLayout: boolean;
  activeMediaSrc: string;
  isSwitchingEpisode: boolean;
}) {
  const player = useMediaPlayer();
  const canPlay = useMediaState('canPlay');
  const shouldRestoreRef = useRef(false);

  useEffect(() => {
    if (isSwitchingEpisode && isViewportFullscreen) {
      shouldRestoreRef.current = true;
    }
  }, [isSwitchingEpisode, isViewportFullscreen]);

  useEffect(() => {
    if (!shouldRestoreRef.current || !canPlay || !activeMediaSrc) {
      return;
    }

    if (!isEmbeddedLayout || prefersMobileViewportFullscreen()) {
      shouldRestoreRef.current = false;
      return;
    }

    const playerRoot = player?.el;
    if (!playerRoot || document.fullscreenElement) {
      shouldRestoreRef.current = false;
      return;
    }

    if (isViewportFullscreen && playerRoot instanceof HTMLElement) {
      void playerRoot.requestFullscreen().catch(() => {});
    }
    shouldRestoreRef.current = false;
  }, [activeMediaSrc, canPlay, isEmbeddedLayout, isViewportFullscreen, player]);

  return null;
}

function PlayVideoMetricsSync({
  tracker,
  onMetricsSignals,
}: {
  tracker: PlayEpisodeMetricsTracker;
  onMetricsSignals?: (signals: PlayEpisodeMetricsReportSignals) => void;
}) {
  const currentTime = useMediaState('currentTime');
  const duration = useMediaState('duration');
  const paused = useMediaState('paused');
  const wasPausedRef = useRef(true);

  useEffect(() => {
    if (wasPausedRef.current && !paused) {
      tracker.onPlayStart();
    }
    if (!wasPausedRef.current && paused) {
      tracker.onPause();
    }
    wasPausedRef.current = paused;
  }, [paused, tracker]);

  useEffect(() => {
    const signals = tracker.onTimeUpdate(currentTime, duration);
    onMetricsSignals?.(signals);
  }, [currentTime, duration, onMetricsSignals, tracker]);

  return null;
}

export function PlayVideoOverlay(props: PlayVideoOverlayProps) {
  const {
    isPlayerOpen,
    onPlayerOpenChange,
    mediaUrl,
    fallbackMediaUrl,
    isFetchingUrl,
    isEpisodeDetailError,
    isEpisodeTranscodingPending = false,
    coverImage,
    onRetryEpisodeDetail,
    layout = 'embedded',
  } = props;
  const { t } = useTranslation();
  const [isViewportFullscreen, setIsViewportFullscreen] = useState(false);
  const [fallbackMediaUrlActive, setFallbackMediaUrlActive] = useState(false);
  // HLS 降级 MP4 后仍失败，提示用户换 Chrome
  const [isPlaybackFatalError, setIsPlaybackFatalError] = useState(false);
  const isEmbeddedLayout = layout === 'embedded';
  const lastPlayerSrcRef = useRef('');
  const isEpisodeTransitionRef = useRef(false);
  const { metricsTracker, onMetricsSignals } = props;
  const mediaMuted = usePlayMediaAudioStore((state) => state.muted);
  const mediaVolume = usePlayMediaAudioStore((state) => state.volume);

  useEffect(() => {
    if (!isPlayerOpen) {
      setIsViewportFullscreen(false);
      lastPlayerSrcRef.current = '';
      setFallbackMediaUrlActive(false);
      setIsPlaybackFatalError(false);
    }
  }, [isPlayerOpen]);

  useEffect(() => {
    if (!mediaUrl) {
      return;
    }
    setFallbackMediaUrlActive(false);
    setIsPlaybackFatalError(false);
  }, [mediaUrl]);

  useEffect(() => {
    if (!isViewportFullscreen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isViewportFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        if (isEpisodeTransitionRef.current) {
          return;
        }
        setIsViewportFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const playerSrc =
    (fallbackMediaUrlActive ? fallbackMediaUrl?.trim() : undefined) ||
    mediaUrl?.trim() ||
    '';

  if (playerSrc) {
    lastPlayerSrcRef.current = playerSrc;
  }

  const isSwitchingEpisode =
    isPlayerOpen &&
    isFetchingUrl &&
    !playerSrc &&
    lastPlayerSrcRef.current.length > 0;

  isEpisodeTransitionRef.current = isSwitchingEpisode;

  const resolvedPlayerSrc =
    playerSrc ||
    (isPlayerOpen && isSwitchingEpisode ? lastPlayerSrcRef.current : '');

  if (!resolvedPlayerSrc) {
    if (!isPlayerOpen) {
      return null;
    }

    if (isEpisodeTranscodingPending) {
      const coverUrl = coverImage?.trim();

      return (
        <div className={cn('absolute inset-0 z-10 size-full bg-black')}>
          {coverUrl ? (
            <img
              alt=""
              src={coverUrl}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <PlayMediaTranscodingOverlay />
        </div>
      );
    }

    if (isFetchingUrl) {
      return (
        <div
          className={cn(
            'absolute inset-0 z-10 size-full',
            'flex items-center justify-center bg-black',
          )}
        >
          <PlayMediaLoadingOverlay label={t('播放地址加载中')} />
        </div>
      );
    }

    if (isEpisodeDetailError) {
      return (
        <div className={cn('absolute inset-0 z-10 size-full bg-black')}>
          <PlayMediaErrorOverlay onRetry={onRetryEpisodeDetail} />
        </div>
      );
    }

    return null;
  }

  const isExpandedViewport = isViewportFullscreen && isEmbeddedLayout;
  const normalizedFallbackMediaUrl = fallbackMediaUrl?.trim();
  const canFallbackToMp4 =
    normalizedFallbackMediaUrl &&
    resolvedPlayerSrc !== normalizedFallbackMediaUrl;

  if (isPlaybackFatalError) {
    return (
      <div className="absolute inset-0 z-10 size-full bg-black">
        <PlayBrowserUnsupportedOverlay />
      </div>
    );
  }

  return (
    <MediaPlayer
      {...PLAY_MEDIA_PLAYER_PROPS}
      src={resolvedPlayerSrc}
      muted={mediaMuted}
      volume={mediaVolume}
      keyTarget={isPlayerOpen ? 'document' : 'player'}
      keyShortcuts={
        isPlayerOpen
          ? {
              togglePaused: 'k Space',
              toggleMuted: 'm',
              toggleFullscreen: 'f',
              seekBackward: 'ArrowLeft',
              seekForward: 'ArrowRight',
              volumeUp: 'ArrowUp',
              volumeDown: 'ArrowDown',
            }
          : undefined
      }
      className={cn(
        // Layout & Positioning
        'absolute inset-0 z-10 size-full',
        !isPlayerOpen && 'pointer-events-none invisible',
        isExpandedViewport &&
          'fixed inset-0 z-[200] h-svh max-h-svh w-full max-w-full',
        // Visual
        'bg-black',
        // 覆盖 vidstack 通过 [data-media-player] 注入的 inline-flex 与默认 16:9 比例
        'data-media-player:flex! data-media-player:size-full data-media-player:aspect-auto!',
      )}
      onEnded={() => {
        if (!isPlayerOpen) {
          return;
        }

        const next = props.currentEpisode + 1;
        if (next > props.episodeTotal) {
          return;
        }
        props.onEpisodeChange(next);
      }}
      onError={() => {
        if (canFallbackToMp4) {
          setFallbackMediaUrlActive(true);
          return;
        }
        setIsPlaybackFatalError(true);
      }}
    >
      <MediaProvider
        className={cn(
          // Layout & Positioning
          'absolute inset-0 z-0',
          '[&>video]:absolute [&>video]:inset-0 [&>video]:size-full',
          isEmbeddedLayout && !isExpandedViewport
            ? '[&>video]:object-contain'
            : '[&>video]:object-cover',
        )}
      />
      <PlayVideoPlaybackSync
        isPlayerOpen={isPlayerOpen}
        mediaSrc={resolvedPlayerSrc}
      />
      <PlayMediaAudioSync />
      {metricsTracker ? (
        <PlayVideoMetricsSync
          tracker={metricsTracker}
          onMetricsSignals={onMetricsSignals}
        />
      ) : null}
      <PlayMediaPauseOnEpisodeSwitch isSwitchingEpisode={isSwitchingEpisode} />
      <PlayVideoFullscreenRestore
        isViewportFullscreen={isViewportFullscreen}
        isEmbeddedLayout={isEmbeddedLayout}
        activeMediaSrc={playerSrc}
        isSwitchingEpisode={isSwitchingEpisode}
      />
      {isSwitchingEpisode ? (
        <PlayMediaLoadingOverlay label={t('播放地址加载中')} />
      ) : null}
      {isPlayerOpen ? (
        <PlayVideoOverlayChrome
          {...props}
          onPlayerOpenChange={onPlayerOpenChange}
          isViewportFullscreen={isViewportFullscreen}
          onViewportFullscreenChange={setIsViewportFullscreen}
          isSwitchingEpisode={isSwitchingEpisode}
        />
      ) : null}
    </MediaPlayer>
  );
}

function PlayVideoOverlayChrome(props: PlayVideoOverlayChromeProps) {
  const {
    onPlayerOpenChange,
    isFetchingUrl,
    mediaUrl,
    dramaTitle,
    currentEpisode,
    episodeTotal,
    onEpisodeChange,
    layout = 'default',
    isViewportFullscreen,
    onViewportFullscreenChange,
    isSwitchingEpisode,
  } = props;

  const { t } = useTranslation();
  const remote = useMediaRemote();
  const player = useMediaPlayer();
  const setMediaMuted = usePlayMediaAudioStore((state) => state.setMuted);
  const setMediaVolume = usePlayMediaAudioStore((state) => state.setVolume);

  // Vidstack 状态订阅（按 key 选取，自动响应）
  const paused = useMediaState('paused');
  const muted = useMediaState('muted');
  const volume = useMediaState('volume');
  const currentTime = useMediaState('currentTime');
  const duration = useMediaState('duration');
  const canPlay = useMediaState('canPlay');
  const waiting = useMediaState('waiting');

  const [isEpisodePanelOpen, setIsEpisodePanelOpen] = useState(false);
  const [isVolumePanelVisible, setIsVolumePanelVisible] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const [osd, setOsd] = useState<OsdItem | null>(null);

  const episodePanelWrapperRef = useRef<HTMLElement | null>(null);
  const episodeToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const volumeAreaRef = useRef<HTMLFieldSetElement | null>(null);
  const osdTimerRef = useRef<number | null>(null);

  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(MOBILE_MAX_WIDTH_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MAX_WIDTH_MEDIA_QUERY);
    const syncMobileLayout = () => {
      setIsMobileLayout(mediaQuery.matches);
    };

    syncMobileLayout();
    mediaQuery.addEventListener('change', syncMobileLayout);
    return () => {
      mediaQuery.removeEventListener('change', syncMobileLayout);
    };
  }, []);

  // 开始播放后自动收起选集面板，避免遮挡画面。
  useEffect(() => {
    if (paused) {
      return;
    }
    setIsEpisodePanelOpen(false);
  }, [paused]);

  // iOS 原生视频全屏退出时同步 UI 状态。
  useEffect(() => {
    const video = player?.el?.querySelector('video');
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    const handleWebkitEndFullscreen = () => {
      if (isSwitchingEpisode) {
        return;
      }
      onViewportFullscreenChange(false);
    };

    video.addEventListener('webkitendfullscreen', handleWebkitEndFullscreen);
    return () => {
      video.removeEventListener(
        'webkitendfullscreen',
        handleWebkitEndFullscreen,
      );
    };
  }, [isSwitchingEpisode, onViewportFullscreenChange, player]);

  useEffect(() => {
    if (!isVolumeDragging) {
      return;
    }
    const endVolumeDrag = (event: PointerEvent) => {
      setIsVolumeDragging(false);
      const volumeArea = volumeAreaRef.current;
      if (!volumeArea) {
        return;
      }
      const hitTarget = document.elementFromPoint(event.clientX, event.clientY);
      if (!hitTarget || !volumeArea.contains(hitTarget)) {
        setIsVolumePanelVisible(false);
      }
    };
    window.addEventListener('pointerup', endVolumeDrag);
    window.addEventListener('pointercancel', endVolumeDrag);
    return () => {
      window.removeEventListener('pointerup', endVolumeDrag);
      window.removeEventListener('pointercancel', endVolumeDrag);
    };
  }, [isVolumeDragging]);

  // 弹出 OSD（屏幕中央反馈）并按 700ms 自动消失。
  // 用 ref 持有，保持引用稳定，便于 useEffect 不必把它写进依赖。
  const showOsdRef = useRef((next: OsdItem) => {
    if (osdTimerRef.current !== null) {
      window.clearTimeout(osdTimerRef.current);
    }
    setOsd(next);
    osdTimerRef.current = window.setTimeout(() => {
      setOsd(null);
      osdTimerRef.current = null;
    }, 700);
  });

  const isEmbeddedLayout = layout === 'embedded';
  const isExpandedViewport = isViewportFullscreen && isEmbeddedLayout;

  const togglePlayerFullscreen = useCallback(() => {
    if (isEmbeddedLayout) {
      if (isViewportFullscreen || document.fullscreenElement) {
        onViewportFullscreenChange(false);
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        }
        return;
      }

      const playerRoot = player?.el;

      if (prefersMobileViewportFullscreen()) {
        onViewportFullscreenChange(true);
        return;
      }

      if (playerRoot instanceof HTMLElement) {
        void playerRoot.requestFullscreen().catch(() => {
          onViewportFullscreenChange(true);
        });
        return;
      }

      onViewportFullscreenChange(true);
      return;
    }

    remote.toggleFullscreen('prefer-media');
  }, [
    isEmbeddedLayout,
    isViewportFullscreen,
    onViewportFullscreenChange,
    player,
    remote,
  ]);

  // 键盘快捷键统一在 window 捕获阶段处理：
  // - 直接调用 remote 触发动作 + stopPropagation 阻止 vidstack 重复处理
  //   （vidstack 的 keyShortcuts 在 document 级有「最近激活的播放器」前置条件，
  //    刚 mount 还没被 click 激活时不会响应——所以接管掉，避免「第一次 Space 没暂停」）
  // - seek / volume / mute 用瞬时 OSD 反馈
  // - play/pause 不走 OSD，由 paused 状态驱动的中央播放按钮持续展示
  useEffect(() => {
    if (!player) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        target?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT'
      ) {
        return;
      }

      // 从 player 实例直接读取最新状态，避免依赖项里加 currentTime / duration
      // 导致 effect 在每次时间更新时反复重建监听
      const isPaused = player.paused;
      const isMuted = player.muted;
      const currentVolume = player.volume;
      const playedTime = player.currentTime;
      const totalDuration = player.state.duration;

      if (event.code === 'Space' || event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        event.stopPropagation();
        if (isPaused) {
          remote.play();
        } else {
          remote.pause();
        }
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        remote.seek(Math.max(0, playedTime - 5));
        showOsdRef.current({ kind: 'seek', delta: -5 });
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        const ceiling =
          Number.isFinite(totalDuration) && totalDuration > 0
            ? totalDuration
            : playedTime + 5;
        remote.seek(Math.min(ceiling, playedTime + 5));
        showOsdRef.current({ kind: 'seek', delta: 5 });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        const nextVolume = Math.min(1, (isMuted ? 0 : currentVolume) + 0.05);
        setMediaVolume(nextVolume);
        setMediaMuted(false);
        remote.changeVolume(nextVolume);
        remote.unmute();
        showOsdRef.current({ kind: 'volume', value: nextVolume });
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        const nextVolume = Math.max(0, (isMuted ? 0 : currentVolume) - 0.05);
        setMediaVolume(nextVolume);
        remote.changeVolume(nextVolume);
        showOsdRef.current({ kind: 'volume', value: nextVolume });
        return;
      }

      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        event.stopPropagation();
        const nextMuted = !isMuted;
        setMediaMuted(nextMuted);
        if (nextMuted) {
          remote.mute();
          showOsdRef.current({ kind: 'mute' });
        } else {
          remote.unmute();
          showOsdRef.current({ kind: 'unmute' });
        }
        return;
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        event.stopPropagation();
        togglePlayerFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (osdTimerRef.current !== null) {
        window.clearTimeout(osdTimerRef.current);
        osdTimerRef.current = null;
      }
    };
  }, [player, remote, setMediaMuted, setMediaVolume, togglePlayerFullscreen]);

  // 切到选集面板上方点击空白处时收起面板（自实现的「外点关闭」，兼容触摸）。
  const handleOverlayPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (isMobileLayout) {
      return;
    }
    if (!isEpisodePanelOpen) {
      return;
    }
    const targetNode = event.target;
    if (!(targetNode instanceof Node)) {
      return;
    }
    if (episodePanelWrapperRef.current?.contains(targetNode)) {
      return;
    }
    if (episodeToggleButtonRef.current?.contains(targetNode)) {
      return;
    }
    setIsEpisodePanelOpen(false);
  };

  const handleEpisodeOptionClick = (episode: number) => () => {
    setIsEpisodePanelOpen(false);
    onEpisodeChange(episode);
  };

  // 关闭播放器浮层并返回上一层页面内容。
  const handleClosePlayer = () => {
    onViewportFullscreenChange(false);
    onPlayerOpenChange(false);
  };

  // 切到上一集，首集时不再继续回退。
  const handlePreviousEpisode = () => {
    if (currentEpisode <= 1) {
      return;
    }
    onEpisodeChange(currentEpisode - 1);
  };

  const handleNextEpisode = () => {
    if (currentEpisode >= episodeTotal) {
      return;
    }
    onEpisodeChange(currentEpisode + 1);
  };

  // 展开或收起选集面板。
  const handleToggleEpisodePanel = () => {
    setIsEpisodePanelOpen((prev) => !prev);
  };

  const showVolumePanel = isVolumePanelVisible || isVolumeDragging;

  // 鼠标移入音量区域时展示音量滑杆。
  const handleVolumePanelMouseEnter = () => {
    setIsVolumePanelVisible(true);
  };

  // 鼠标移出音量区域时隐藏音量滑杆（仅桌面 hover）。
  const handleVolumePanelMouseLeave = () => {
    if (isVolumeDragging) {
      return;
    }
    setIsVolumePanelVisible(false);
  };

  const handleVolumeSliderPointerDown = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
    setIsVolumePanelVisible(true);
    setIsVolumeDragging(true);
  };

  // 切换静音（H5 / 桌面：点击喇叭；H5 不展示竖向滑条，音量走系统键）。
  const handleToggleMute = () => {
    const nextMuted = !usePlayMediaAudioStore.getState().muted;
    setMediaMuted(nextMuted);

    if (nextMuted) {
      remote.mute();
    } else {
      remote.unmute();
    }
  };

  // 切换播放/暂停（footer 按钮）。
  const handleTogglePlay = () => {
    if (paused) {
      remote.play();
      return;
    }
    remote.pause();
  };

  // 切换全屏（footer 按钮）。
  const handleToggleFullscreen = () => {
    togglePlayerFullscreen();
  };

  const episodeSelectorGroups = Array.from(
    { length: Math.ceil(Math.max(episodeTotal, 1) / 10) },
    (_, index) => {
      const start = index * 10 + 1;
      const end = Math.min(start + 9, episodeTotal);
      return {
        start,
        end,
      };
    },
  );

  const renderEpisodePanelContent = (variant: 'player' | 'sheet') => {
    const isSheet = variant === 'sheet';

    return (
      <div
        className={cn(
          'flex flex-col gap-4',
          isSheet
            ? 'max-h-[min(70dvh,480px)] overflow-y-auto px-4 pt-4 pb-4'
            : [
                'max-h-[min(40svh,240px)] overflow-y-auto pr-1',
                'md:max-h-[420px]',
                'md:[scrollbar-width:thin] md:[scrollbar-color:rgba(255,255,255,0.35)_transparent]',
                'md:[&::-webkit-scrollbar]:w-1',
                'md:[&::-webkit-scrollbar-thumb]:rounded-full md:[&::-webkit-scrollbar-thumb]:bg-white/35',
                'md:[&::-webkit-scrollbar-track]:bg-transparent',
              ],
        )}
      >
        {!isSheet ? (
          <p className="text-lg font-bold leading-[26px] tracking-[-0.04px] text-white">
            {t('选集')}
          </p>
        ) : null}
        {episodeSelectorGroups.map((group) => (
          <section
            key={`${group.start}-${group.end}`}
            className="flex flex-col gap-2"
          >
            <p
              className={cn(
                'text-xs font-normal leading-4 tracking-[0.04px]',
                isSheet ? 'text-muted-foreground' : 'text-white/80',
              )}
            >
              {t('第 {{start}} -{{end}} 集', {
                start: group.start,
                end: group.end,
              })}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from(
                { length: group.end - group.start + 1 },
                (_, index) => group.start + index,
              ).map((episode) => {
                const isSelected = currentEpisode === episode;
                return (
                  <Button
                    key={episode}
                    type="button"
                    variant={isSheet ? 'outline' : 'ghost'}
                    onClick={handleEpisodeOptionClick(episode)}
                    className={cn(
                      // Layout & Positioning
                      'relative inline-flex items-center justify-center',
                      // Sizing & Spacing
                      isSheet
                        ? 'h-14 w-full rounded p-0'
                        : 'size-[54px] rounded p-0',
                      // Visuals & Typography
                      'text-sm font-bold leading-5',
                      isSheet
                        ? cn(
                            isSelected
                              ? 'bg-play-episode-selected-surface text-foreground'
                              : 'border-0 bg-muted text-foreground',
                            'shadow-none hover:bg-play-episode-selected-surface hover:text-foreground',
                          )
                        : cn(
                            'text-white',
                            isSelected
                              ? 'bg-play-episode-selected-surface'
                              : 'bg-play-episode-cell-surface',
                            'hover:bg-play-episode-selected-surface hover:text-white',
                          ),
                    )}
                  >
                    {episode}
                  </Button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const hasMediaUrl = Boolean(mediaUrl?.trim());

  // 阶段一：等待接口返回播放地址
  const showUrlLoadingHint = isFetchingUrl || !hasMediaUrl;

  // 阶段二：地址已到，媒体尚未 canPlay（首帧 / 首段未就绪）
  const showVideoPreparingHint = !showUrlLoadingHint && hasMediaUrl && !canPlay;

  // 阶段三：已可播且进度已推进后的 rebuffer（避免首帧 canPlay 后 waiting 仍盖住画面）
  const showBufferingHint =
    !showUrlLoadingHint &&
    !showVideoPreparingHint &&
    hasMediaUrl &&
    canPlay &&
    waiting &&
    currentTime > 0;

  // 兼容旧变量名，避免热更新残留引用导致 ReferenceError
  const showFetchingHint = showUrlLoadingHint || showVideoPreparingHint;

  const isPlayerMediaLoading = showFetchingHint || showBufferingHint;

  return (
    <>
      <div
        className="absolute inset-0 z-10 flex flex-col"
        onMouseDownCapture={handleOverlayPointerDown}
      >
        <header
          className={cn(
            'absolute left-0 top-0 z-30 flex w-full items-center gap-2 p-3 md:gap-2.5 md:p-5',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClosePlayer}
            className={cn(
              'size-5 rounded-full p-0 md:size-6',
              'text-white hover:bg-white/10 hover:text-white',
            )}
            aria-label={t('返回')}
          >
            <IconChevronLeft className="size-5 text-white md:size-6" />
          </Button>
          <p
            className={cn(
              'flex min-w-0 flex-1 items-center text-sm font-bold leading-5 tracking-[-0.04px] text-white',
              'md:text-lg md:leading-[26px]',
              '[text-shadow:0_0_2px_rgba(0,0,0,0.3)]',
            )}
            title={`${dramaTitle ? t(dramaTitle) : '1011'}（${t('第 {{n}} 集', { n: currentEpisode })}）`}
          >
            <span className="min-w-0 truncate">
              {dramaTitle ? t(dramaTitle) : '1011'}
            </span>
            <span className="shrink-0 whitespace-nowrap">
              （{t('第 {{n}} 集', { n: currentEpisode })}）
            </span>
          </p>
        </header>

        <div
          className={cn(
            'relative flex flex-1 items-center justify-center',
            isEpisodePanelOpen ? 'overflow-visible' : 'overflow-hidden',
          )}
        >
          <div
            className={cn(
              // Layout & Positioning
              'relative flex items-center justify-center overflow-hidden',
              // Sizing & Spacing
              isEmbeddedLayout && !isExpandedViewport
                ? 'size-full'
                : 'aspect-9/16 h-full max-h-svh w-auto max-w-full',
              isExpandedViewport && 'size-full max-h-full max-w-full',
            )}
          >
            {/* 单击切换播放/暂停；双击切换全屏、左右 -10s/+10s */}
            {!(paused && canPlay && !isPlayerMediaLoading) ? (
              <PlayVideoTapToToggle />
            ) : null}
            {!isEmbeddedLayout ? (
              <Gesture
                className="absolute inset-0 z-10"
                event="dblpointerup"
                action="toggle:fullscreen"
              />
            ) : null}
            <Gesture
              className="absolute inset-y-0 left-0 z-20 w-1/4"
              event="dblpointerup"
              action="seek:-10"
            />
            <Gesture
              className="absolute inset-y-0 right-0 z-20 w-1/4"
              event="dblpointerup"
              action="seek:10"
            />

            {showUrlLoadingHint ? (
              <PlayMediaLoadingOverlay label={t('播放地址加载中')} />
            ) : null}

            {showVideoPreparingHint ? (
              <PlayMediaLoadingOverlay label={t('视频加载中')} />
            ) : null}

            {showBufferingHint ? <PlayMediaLoadingOverlay /> : null}

            {osd ? <OsdLayer osd={osd} /> : null}

            {/* 暂停态中央播放按钮：仅当媒体已可播放且当前处于暂停时显示 */}
            {paused && canPlay && !isPlayerMediaLoading ? (
              <button
                type="button"
                onClick={() => {
                  remote.play();
                }}
                aria-label={t('播放')}
                className={cn(
                  // Layout & Positioning
                  'absolute inset-0 z-30 flex items-center justify-center',
                  // State
                  'animate-in fade-in duration-200',
                )}
              >
                <span
                  className={cn(
                    'flex size-12 items-center justify-center md:size-[88px]',
                    'rounded-full border border-white bg-white/45 backdrop-blur-md',
                    'transition-transform hover:scale-110',
                  )}
                >
                  <IconPlayerPlay className="ml-1 size-5 text-white md:size-9" />
                </span>
              </button>
            ) : null}
          </div>

          {isEpisodePanelOpen ? (
            <aside
              ref={episodePanelWrapperRef}
              className={cn(
                // Layout & Positioning
                'absolute z-40 hidden md:block',
                'md:bottom-[74px] md:right-4',
                // Sizing & Spacing
                'w-[334px] rounded-2xl py-4 pl-4 pr-1',
                // Visual
                'bg-play-episode-panel-surface',
              )}
            >
              {renderEpisodePanelContent('player')}
            </aside>
          ) : null}
        </div>

        <footer
          className={cn(
            // Layout & Positioning
            'absolute bottom-0 left-0 z-30 w-full overflow-visible',
            // Sizing & Spacing
            'flex flex-col gap-3 p-3 md:gap-5 md:p-5',
            // Visual
            'bg-linear-to-b from-black/0 via-black/65 to-black',
          )}
        >
          <div className="flex flex-col gap-1 md:gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold leading-4 text-white">
                {formatTime(currentTime)}
              </span>
              <span className="text-xs font-semibold leading-4 text-white">
                {formatTime(duration)}
              </span>
            </div>

            <TimeSlider.Root
              aria-label={t('播放进度')}
              className={cn(
                // Layout & Positioning
                'relative flex w-full items-center',
                // Sizing & Spacing
                'h-3 touch-none select-none md:h-4',
                // State
                'group/timeslider',
              )}
            >
              <TimeSlider.Track className="relative h-1 w-full overflow-hidden rounded-full bg-play-progress-track">
                <TimeSlider.Progress
                  className="absolute inset-y-0 left-0 z-0 rounded-full bg-white/55"
                  style={{ width: 'var(--slider-progress)' }}
                />
                <TimeSlider.TrackFill
                  className="absolute inset-y-0 left-0 z-10 rounded-full bg-play-progress-fill"
                  style={{ width: 'var(--slider-fill)' }}
                />
              </TimeSlider.Track>
              <TimeSlider.Thumb
                className={cn(
                  // Layout & Positioning
                  'absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2',
                  // Sizing & Spacing
                  'size-3 rounded-full',
                  // Visual
                  'bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]',
                  // State
                  'transition-transform',
                  'group-hover/timeslider:scale-125 group-data-dragging/timeslider:scale-125',
                )}
                style={{ left: 'var(--slider-fill)' }}
              />
              <TimeSlider.Preview
                className={cn(
                  'pointer-events-none flex justify-center opacity-0',
                  'data-visible:opacity-100 transition-opacity',
                )}
              >
                <TimeSlider.Value
                  type="pointer"
                  format="time"
                  className={cn(
                    'rounded-md bg-black/80 px-2 py-1',
                    'text-xs font-medium leading-4 text-white',
                  )}
                />
              </TimeSlider.Preview>
            </TimeSlider.Root>
          </div>

          <div className="flex w-full items-center justify-between overflow-visible">
            <div className="flex h-5 items-center gap-4 overflow-visible md:h-6 md:gap-5">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleTogglePlay}
                className={cn(
                  'size-5 shrink-0 rounded-full p-0 md:size-6',
                  'text-white hover:bg-white/10 hover:text-white',
                )}
                aria-label={paused ? t('播放') : t('暂停')}
              >
                {paused ? (
                  <IconPlayerPlay className="size-5 text-white md:size-6" />
                ) : (
                  <IconPlayerPause className="size-5 text-white md:size-6" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handlePreviousEpisode}
                className={cn(
                  'size-5 shrink-0 rounded-full p-0 md:size-6',
                  'text-white hover:bg-white/10 hover:text-white',
                )}
                aria-label={t('上一集')}
              >
                <IconPlayerSkipBack className="size-5 text-white md:size-6" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleNextEpisode}
                className={cn(
                  'size-5 shrink-0 rounded-full p-0 md:size-6',
                  'text-white hover:bg-white/10 hover:text-white',
                )}
                aria-label={t('下一集')}
              >
                <IconPlayerSkipForward className="size-5 text-white md:size-6" />
              </Button>
            </div>
            <div className="flex h-5 items-center gap-4 overflow-visible md:h-6 md:gap-5">
              <Button
                ref={episodeToggleButtonRef}
                type="button"
                variant="ghost"
                onClick={handleToggleEpisodePanel}
                className={cn(
                  'inline-flex h-5 shrink-0 items-center rounded-none px-0 py-0 md:h-6',
                  'text-xs font-medium leading-4 text-white md:text-sm md:leading-5',
                  'hover:bg-transparent hover:text-white',
                )}
              >
                {t('选集')}
              </Button>
              <fieldset
                ref={volumeAreaRef}
                aria-label={t('音量')}
                className={cn(
                  // Layout & Positioning
                  'relative m-0 flex h-5 min-w-0 shrink-0 items-center border-0 p-0 md:h-6',
                )}
                onMouseEnter={handleVolumePanelMouseEnter}
                onMouseLeave={handleVolumePanelMouseLeave}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {showVolumePanel ? (
                  <div
                    className={cn(
                      // Layout & Positioning
                      'absolute bottom-[calc(100%-4px)] left-1/2 z-50 hidden -translate-x-1/2 md:flex',
                      // Sizing & Spacing
                      'h-[148px] w-10 flex-col items-stretch justify-end',
                      // Visual
                      'pointer-events-auto touch-none',
                    )}
                  >
                    <div
                      className={cn(
                        // Layout & Positioning
                        'flex min-h-0 flex-1 items-center justify-center',
                        // Sizing & Spacing
                        'p-2',
                        // Visual
                        'rounded-xl bg-black/80 backdrop-blur-md',
                      )}
                    >
                      <VolumeSlider.Root
                        orientation="vertical"
                        aria-label={t('音量')}
                        onPointerDown={handleVolumeSliderPointerDown}
                        className={cn(
                          // Layout & Positioning
                          'relative flex h-full w-full touch-none select-none items-center justify-center',
                          // State
                          'group/volumeslider',
                        )}
                      >
                        <VolumeSlider.Track
                          className={cn(
                            // Layout & Positioning
                            'relative mx-auto h-full w-1.5',
                            // Visual
                            'overflow-hidden rounded-full bg-white/30',
                          )}
                        >
                          <VolumeSlider.TrackFill
                            className="absolute inset-x-0 bottom-0 rounded-full bg-white"
                            style={{ height: 'var(--slider-fill)' }}
                          />
                        </VolumeSlider.Track>
                        <VolumeSlider.Thumb
                          className={cn(
                            // Layout & Positioning
                            'absolute left-1/2 z-20 -translate-x-1/2 translate-y-1/2',
                            // Sizing & Spacing
                            'size-3 rounded-full',
                            // Visual
                            'bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]',
                          )}
                          style={{ bottom: 'var(--slider-fill)' }}
                        />
                      </VolumeSlider.Root>
                    </div>
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleToggleMute}
                  className={cn(
                    'relative z-10 size-5 shrink-0 rounded-full p-0 md:size-6',
                    'text-white hover:bg-white/10 hover:text-white',
                  )}
                  aria-label={muted ? t('取消静音') : t('静音')}
                >
                  {muted || volume === 0 ? (
                    <IconPlayerVolumeOff className="size-5 text-white md:size-6" />
                  ) : (
                    <IconPlayerVolume2 className="size-5 text-white md:size-6" />
                  )}
                </Button>
              </fieldset>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleToggleFullscreen}
                className={cn(
                  'size-5 shrink-0 rounded-full p-0 md:size-6',
                  'text-white hover:bg-white/10 hover:text-white',
                )}
                aria-label={
                  isMobileLayout && isEmbeddedLayout
                    ? isViewportFullscreen
                      ? t('退出清屏')
                      : t('清屏')
                    : t('全屏')
                }
              >
                {isMobileLayout && isEmbeddedLayout ? (
                  isViewportFullscreen ? (
                    <IconPlayerCleanScreenExit className="size-5 text-white md:size-6" />
                  ) : (
                    <IconPlayerCleanScreen className="size-5 text-white md:size-6" />
                  )
                ) : (
                  <IconPlayerFullscreen className="size-5 text-white md:size-6" />
                )}
              </Button>
            </div>
          </div>
        </footer>
      </div>

      {isMobileLayout ? (
        <Sheet open={isEpisodePanelOpen} onOpenChange={setIsEpisodePanelOpen}>
          <SheetContent
            side="bottom"
            overlayClassName={cn(
              'z-[210]',
              'bg-black/50 supports-backdrop-filter:backdrop-blur-md',
            )}
            className={cn(
              // Layout & Positioning
              'z-[210] flex max-h-[min(85dvh,560px)] flex-col gap-0',
              // Sizing & Spacing
              'rounded-t-2xl p-0 pb-[max(1rem,env(safe-area-inset-bottom))]',
              // Visual
              'border-t border-border bg-card text-card-foreground',
            )}
          >
            <SheetHeader
              className={cn('shrink-0 border-b border-border px-4 py-3')}
            >
              <SheetTitle
                className={cn(
                  'text-lg font-bold leading-[26px] tracking-[-0.04px]',
                )}
              >
                {t('选集')}
              </SheetTitle>
            </SheetHeader>
            {renderEpisodePanelContent('sheet')}
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}

function OsdLayer({ osd }: { osd: OsdItem }) {
  return (
    <div
      key={`${osd.kind}-${Date.now()}`}
      className={cn(
        // Layout & Positioning
        'pointer-events-none absolute inset-0 z-40 flex items-center justify-center',
        // State
        'animate-in fade-in zoom-in-95 duration-200',
      )}
    >
      <OsdContent osd={osd} />
    </div>
  );
}

function OsdContent({ osd }: { osd: OsdItem }) {
  const { t } = useTranslation();

  if (osd.kind === 'seek') {
    const isForward = osd.delta > 0;
    const text = `${isForward ? '+' : '-'}${Math.abs(osd.delta)}s`;
    return (
      <div
        className={cn(
          'flex items-center gap-2',
          'rounded-full bg-black/55 px-5 py-3 backdrop-blur-sm',
        )}
      >
        {isForward ? (
          <IconPlayerSkipForward className="size-6 text-white" />
        ) : (
          <IconPlayerSkipBack className="size-6 text-white" />
        )}
        <span className="text-base font-semibold leading-6 text-white">
          {text}
        </span>
      </div>
    );
  }

  if (osd.kind === 'volume') {
    const percent = Math.round(osd.value * 100);
    const isMutedNow = osd.value <= 0;
    return (
      <div
        className={cn(
          'flex items-center gap-3',
          'rounded-full bg-black/55 px-5 py-3 backdrop-blur-sm',
        )}
      >
        {isMutedNow ? (
          <IconPlayerVolumeOff className="size-6 text-white" />
        ) : (
          <IconPlayerVolume2 className="size-6 text-white" />
        )}
        <div className="flex items-center gap-2">
          <div className="relative h-1 w-24 overflow-hidden rounded-full bg-white/30">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="min-w-9 text-right text-sm font-semibold leading-5 text-white tabular-nums">
            {percent}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        'rounded-full bg-black/55 px-5 py-3 backdrop-blur-sm',
      )}
    >
      {osd.kind === 'mute' ? (
        <IconPlayerVolumeOff className="size-6 text-white" />
      ) : (
        <IconPlayerVolume2 className="size-6 text-white" />
      )}
      <span className="text-sm font-semibold leading-5 text-white">
        {osd.kind === 'mute' ? t('已静音') : t('已取消静音')}
      </span>
    </div>
  );
}

// 保留 MediaPlayerInstance 类型导出，便于父级未来按需 ref 操作。
export type { MediaPlayerInstance };
