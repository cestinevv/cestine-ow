import {
  MediaPlayer,
  MediaProvider,
  useMediaRemote,
  useMediaState,
} from '@vidstack/react';
import { useTheme } from 'next-themes';
import type {
  MutableRefObject,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconPlayerPlay from '@/assets/svg/IconPlayerPlay';
import IconPlayLarge from '@/assets/svg/IconPlayLarge';
import IconWatchHeartFilled from '@/assets/svg/IconWatchHeartFilled';
import { Button } from '@/components/ui/button';
import {
  PlayBrowserUnsupportedOverlay,
  PlayMediaLoadingOverlay,
} from '@/features/play/components/PlayMediaFeedback';
import {
  PlayMediaAudioSync,
  PlayMediaPauseOnEpisodeSwitch,
} from '@/features/play/components/PlayMediaSyncs';
import { playWatchStopGestureBubble } from '@/features/play/hooks/usePlayWatchEpisodeGesture';
import { configurePlayWatchHlsProvider } from '@/features/play/playHlsCredentials';
import { PLAY_MEDIA_PLAYER_PROPS } from '@/features/play/playMediaPlayer';
import { isRequestedMediaSourceReady } from '@/features/play/playMediaSourcePolicy';
import { canPlayHls, isHlsUrl } from '@/features/play/playSourceResolver';
import { usePlayMediaAudioStore } from '@/stores/playMediaAudioStore';
import { cn } from '@/utils';

type PlayWatchVideoPlayerProps = {
  mediaUrl?: string;
  fallbackMediaUrl?: string;
  /** 切集拉取新地址期间暂停当前画面，不卸载播放器 */
  isEpisodeSwitching?: boolean;
  initialTime?: number;
  /** 普通续播恢复首次进入需暂停，后续切集/换条仍按既有逻辑自动播放 */
  autoplayOnMount?: boolean;
  tapDisabled?: boolean;
  /** 用户主动暂停时才展示中央播放按钮 */
  showCenterPlayButton?: boolean;
  onTimeUpdate?: (currentTime: number, duration?: number) => void;
  onEnded: () => void;
  onPlaying?: () => void;
  onUserPause?: () => void;
  onUserPlay?: () => void;
  /** 递增时从 0 秒重播当前片源 */
  replaySignal?: number;
  /** 仅首进自动播放被拦截时允许触发 onAutoplayBlocked */
  allowAutoplayBlockedPrompt?: boolean;
  onAutoplayBlocked?: () => void;
  /** 桌面端：鼠标点击画面切换播放/暂停 */
  showDesktopTapLayer?: boolean;
  /** Web/H5：双击画面只点赞；返回 false 时不展示特效 */
  onDoubleTapLike?: () => boolean;
  /** H5：长按画面打开更多设置 */
  onLongPress?: () => void;
  /** 暂停中央播放按钮：watch 为 H5 大按钮，immersive 对齐 Figma 54px */
  centerPlayVariant?: 'watch' | 'immersive';
  /**
   * 预加载模式：只挂载播放器拉首帧，不自动播放、不渲染 Sync/overlay/children。
   * 用于 Web feed 播放器池的 prev/next slot。
   */
  preloadOnly?: boolean;
  /** 封面图 URL，播放器内部统一排层 */
  posterImage?: string;
  /** 封面是否已完全隐藏（transitionEnd 后外层设为 true 可卸载封面 DOM） */
  posterHidden?: boolean;
  /** 封面是否正在淡出（外层根据 isFirstFrameReady 决定） */
  posterFadingOut?: boolean;
  /** 封面 object-fit；转码等待态用 cover 铺满，默认 contain 对齐视频 */
  posterObjectFit?: 'contain' | 'cover';
  /** 封面 opacity transition 结束回调 */
  onPosterTransitionEnd?: () => void;
  /** video loadeddata 触发一次，表示首帧数据已就绪，外层用于控制封面淡出 */
  onFirstFrameReady?: () => void;
  /** 单集循环（关闭连播或右栏打开时不翻页） */
  loop?: boolean;
  /** 启用 watch 专用 HLS 配置（含 startFragPrefetch），仅 Web pool slot 传 true */
  enableWatchHlsConfig?: boolean;
  /** 首次起播前显示轻量 loading（用于 Web feed pool current） */
  showLoadingBeforePlay?: boolean;
  /** 自动播放前先静音 play，再恢复 store 目标静音态（Web feed 切换用） */
  autoplayMutedFirst?: boolean;
  /** hls.js / 原生播放器报告 fatal 错误时回调 */
  onPlayerError?: () => void;
  /** 向外层注册一个可直接调用的播放/暂停切换函数 */
  onRegisterDirectToggle?: (toggle: (() => void) | null) => void;
  /** 向外层注册点赞成功特效，供右侧点赞按钮复用 */
  onRegisterLikeEffect?: (show: (() => void) | null) => void;
  /**
   * 回前台时是否自动续播：隐藏前用户未主动暂停且已激活过播放。
   * 不依赖 hidden 时刻的 paused（系统常先 pause 再抛 visibilitychange）。
   */
  shouldAutoResumeOnForeground?: boolean;
  /** 系统暂停或自动续播失败后，通知外层出示中央播放按钮 */
  onSystemPaused?: () => void;
  /** 回前台自动续播失败（签权/解码失效等），由外层强制刷新片源 */
  onForegroundRecoverFailed?: () => void;
  children?: ReactNode;
};

const DOUBLE_TAP_DELAY_MS = 280;
const DOUBLE_TAP_DISTANCE_PX = 48;
const LONG_PRESS_DELAY_MS = 500;
const LONG_PRESS_DISTANCE_PX = 12;
const LIKE_BURST_DURATION_MS = 760;
const LIKE_BURST_ROTATIONS = [-12, 10, -6, 12] as const;

type PlayWatchLikeBurst = {
  id: number;
  x: number;
  y: number;
  rotation: number;
};

function PlayWatchLikeBurstEffect({ burst }: { burst: PlayWatchLikeBurst }) {
  const effectRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = effectRef.current;
    if (!node) {
      return;
    }

    const baseTransform = `translate(-50%, -50%) rotate(${String(burst.rotation)}deg)`;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const animation = node.animate(
      reduceMotion
        ? [
            { opacity: 1, transform: baseTransform },
            { opacity: 1, transform: baseTransform, offset: 0.65 },
            { opacity: 0, transform: baseTransform },
          ]
        : [
            {
              opacity: 0,
              transform: `${baseTransform} scale(0.35)`,
            },
            {
              opacity: 1,
              transform: `${baseTransform} scale(1.18)`,
              offset: 0.24,
            },
            {
              opacity: 1,
              transform: `${baseTransform} scale(0.96)`,
              offset: 0.46,
            },
            {
              opacity: 1,
              transform: `translate(-50%, calc(-50% - 8px)) rotate(${String(burst.rotation)}deg) scale(1)`,
              offset: 0.72,
            },
            {
              opacity: 0,
              transform: `translate(-50%, calc(-50% - 48px)) rotate(${String(burst.rotation)}deg) scale(0.72)`,
            },
          ],
      {
        duration: reduceMotion ? 300 : LIKE_BURST_DURATION_MS,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      },
    );

    return () => {
      animation.cancel();
    };
  }, [burst.rotation]);

  return (
    <span
      ref={effectRef}
      data-play-like-effect
      aria-hidden
      className={cn(
        'pointer-events-none absolute text-watch-like-active opacity-0',
        'drop-shadow-[0_4px_12px_rgb(0_0_0/45%)] will-change-transform',
      )}
      style={{ left: burst.x, top: burst.y }}
    >
      <IconWatchHeartFilled className="size-18 md:size-20" />
    </span>
  );
}

function PlayWatchTimeSync({
  onTimeUpdate,
}: {
  onTimeUpdate?: (currentTime: number, duration?: number) => void;
}) {
  const currentTime = useMediaState('currentTime');
  const duration = useMediaState('duration');

  useEffect(() => {
    onTimeUpdate?.(currentTime, duration);
  }, [currentTime, duration, onTimeUpdate]);

  return null;
}

const AUTOPLAY_BLOCKED_FALLBACK_MS = 2500;
const FOREGROUND_RESUME_VERIFY_MS = 1000;
const PLAYBACK_UNMUTE_DELAY_MS = 250;

/**
 * 移动端浏览器进后台再回前台：尝试续播；失败则通知外层出播放钮并刷新片源。
 * 隐藏瞬间系统可能已 pause，故用外层传入的 shouldAutoResume，而非 hidden 时的 paused。
 */
function PlayWatchForegroundResumeSync({
  mediaUrl,
  shouldAutoResume = false,
  onSystemPaused,
  onForegroundRecoverFailed,
}: {
  mediaUrl?: string;
  shouldAutoResume?: boolean;
  onSystemPaused?: () => void;
  onForegroundRecoverFailed?: () => void;
}) {
  const remote = useMediaRemote();
  const paused = useMediaState('paused');
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const shouldAutoResumeRef = useRef(shouldAutoResume);
  shouldAutoResumeRef.current = shouldAutoResume;
  const shouldResumeAfterHiddenRef = useRef(false);
  const verifyTimerRef = useRef<number | null>(null);

  const onSystemPausedRef = useRef(onSystemPaused);
  onSystemPausedRef.current = onSystemPaused;
  const onForegroundRecoverFailedRef = useRef(onForegroundRecoverFailed);
  onForegroundRecoverFailedRef.current = onForegroundRecoverFailed;

  useEffect(() => {
    if (!mediaUrl) {
      return;
    }

    const clearVerifyTimer = () => {
      if (verifyTimerRef.current !== null) {
        window.clearTimeout(verifyTimerRef.current);
        verifyTimerRef.current = null;
      }
    };

    const handleBecomeVisible = () => {
      clearVerifyTimer();

      if (!shouldResumeAfterHiddenRef.current) {
        if (pausedRef.current) {
          onSystemPausedRef.current?.();
        }
        return;
      }

      if (!pausedRef.current) {
        return;
      }

      void Promise.resolve(remote.play()).then(
        () => {
          // play 已受理但仍暂停：多为自动播放策略，出示播放钮即可，勿清 URL 打断缓冲
          verifyTimerRef.current = window.setTimeout(() => {
            verifyTimerRef.current = null;
            if (pausedRef.current) {
              onSystemPausedRef.current?.();
            }
          }, FOREGROUND_RESUME_VERIFY_MS);
        },
        () => {
          onSystemPausedRef.current?.();
          onForegroundRecoverFailedRef.current?.();
        },
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearVerifyTimer();
        shouldResumeAfterHiddenRef.current = shouldAutoResumeRef.current;
        return;
      }

      if (document.visibilityState === 'visible') {
        handleBecomeVisible();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // bfcache 恢复可能没有先收到 visibility hidden，用当前续播意图补齐
      if (event.persisted) {
        shouldResumeAfterHiddenRef.current = shouldAutoResumeRef.current;
        handleBecomeVisible();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      clearVerifyTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [mediaUrl, remote]);

  return null;
}

/** Web pool 相邻槽：静音播到首帧后 pause，保证切换时有解码帧而非仅 manifest */
function PlayWatchSlotPreloadSync({
  mediaUrl,
  preloadOnly,
  onLoadedDataRef,
}: {
  mediaUrl?: string;
  preloadOnly: boolean;
  onLoadedDataRef: MutableRefObject<(() => void) | null>;
}) {
  const remote = useMediaRemote();
  const canPlay = useMediaState('canPlay');
  const paused = useMediaState('paused');
  const phaseRef = useRef<'idle' | 'decoding' | 'ready'>('idle');
  const prevMediaUrlRef = useRef('');
  const decodeFallbackTimerRef = useRef<number | null>(null);
  const remoteRef = useRef(remote);
  remoteRef.current = remote;

  useEffect(() => {
    if (preloadOnly) {
      return;
    }

    if (decodeFallbackTimerRef.current !== null) {
      window.clearTimeout(decodeFallbackTimerRef.current);
      decodeFallbackTimerRef.current = null;
    }
    phaseRef.current = 'idle';
  }, [preloadOnly]);

  useEffect(() => {
    if (!preloadOnly) {
      onLoadedDataRef.current = null;
      return;
    }

    onLoadedDataRef.current = () => {
      if (phaseRef.current !== 'decoding') {
        return;
      }
      if (decodeFallbackTimerRef.current !== null) {
        window.clearTimeout(decodeFallbackTimerRef.current);
        decodeFallbackTimerRef.current = null;
      }
      phaseRef.current = 'ready';
      remoteRef.current.pause();
    };

    return () => {
      onLoadedDataRef.current = null;
    };
  }, [onLoadedDataRef, preloadOnly]);

  useEffect(() => {
    return () => {
      if (decodeFallbackTimerRef.current !== null) {
        window.clearTimeout(decodeFallbackTimerRef.current);
        decodeFallbackTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const nextUrl = mediaUrl?.trim();
    if (!nextUrl) {
      phaseRef.current = 'idle';
      prevMediaUrlRef.current = '';
      if (decodeFallbackTimerRef.current !== null) {
        window.clearTimeout(decodeFallbackTimerRef.current);
        decodeFallbackTimerRef.current = null;
      }
      return;
    }

    if (prevMediaUrlRef.current === nextUrl) {
      return;
    }

    prevMediaUrlRef.current = nextUrl;
    phaseRef.current = 'idle';
    if (decodeFallbackTimerRef.current !== null) {
      window.clearTimeout(decodeFallbackTimerRef.current);
      decodeFallbackTimerRef.current = null;
    }
  }, [mediaUrl]);

  useEffect(() => {
    if (!preloadOnly || !mediaUrl?.trim()) {
      return;
    }

    if (phaseRef.current !== 'idle' || !canPlay) {
      return;
    }

    phaseRef.current = 'decoding';
    remote.mute();
    void Promise.resolve(remote.play()).catch(() => {
      phaseRef.current = 'idle';
      if (decodeFallbackTimerRef.current !== null) {
        window.clearTimeout(decodeFallbackTimerRef.current);
        decodeFallbackTimerRef.current = null;
      }
    });

    decodeFallbackTimerRef.current = window.setTimeout(() => {
      decodeFallbackTimerRef.current = null;
      if (phaseRef.current !== 'decoding') {
        return;
      }
      phaseRef.current = 'ready';
      remoteRef.current.pause();
    }, 400);
  }, [canPlay, mediaUrl, preloadOnly, remote]);

  useEffect(() => {
    if (!preloadOnly || !mediaUrl?.trim()) {
      return;
    }

    if (phaseRef.current === 'decoding') {
      return;
    }

    if (phaseRef.current === 'ready' && !paused) {
      remote.pause();
    }
  }, [mediaUrl, paused, preloadOnly, remote]);

  return null;
}

function PlayWatchPlaybackSync({
  mediaUrl,
  initialTime,
  autoplayOnMount = true,
  autoplayMutedFirst = false,
  replaySignal = 0,
  allowAutoplayBlockedPrompt = false,
  onAutoplayBlocked,
}: {
  mediaUrl?: string;
  initialTime: number;
  autoplayOnMount?: boolean;
  autoplayMutedFirst?: boolean;
  replaySignal?: number;
  allowAutoplayBlockedPrompt?: boolean;
  onAutoplayBlocked?: () => void;
}) {
  const remote = useMediaRemote();
  const canPlay = useMediaState('canPlay');
  const currentSrc = useMediaState('currentSrc');
  const paused = useMediaState('paused');
  const pendingAutoplayRef = useRef(false);
  const awaitingPauseForAutoplayRef = useRef(false);
  const mutedFirstPlayAttemptedRef = useRef(false);
  const appliedInitialTimeRef = useRef(false);
  const prevMediaUrlRef = useRef('');
  const lastReplaySignalRef = useRef(replaySignal);
  const unmuteTimerRef = useRef<number | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onAutoplayBlockedRef = useRef(onAutoplayBlocked);
  onAutoplayBlockedRef.current = onAutoplayBlocked;

  useEffect(() => {
    return () => {
      if (unmuteTimerRef.current !== null) {
        window.clearTimeout(unmuteTimerRef.current);
        unmuteTimerRef.current = null;
      }
    };
  }, []);

  // 换源：每次 mediaUrl 变化都重新应用 initialTime 与 autoplayOnMount
  useEffect(() => {
    const nextUrl = mediaUrl?.trim();
    if (!nextUrl) {
      return;
    }

    const previousUrl = prevMediaUrlRef.current;
    if (previousUrl === nextUrl) {
      return;
    }

    if (unmuteTimerRef.current !== null) {
      window.clearTimeout(unmuteTimerRef.current);
      unmuteTimerRef.current = null;
    }
    prevMediaUrlRef.current = nextUrl;
    appliedInitialTimeRef.current = initialTime <= 0;
    pendingAutoplayRef.current = autoplayOnMount;
    awaitingPauseForAutoplayRef.current = autoplayOnMount;
    mutedFirstPlayAttemptedRef.current = false;

    // 禁止上一个片源的 playing 状态带入新片源
    remote.pause();
  }, [autoplayOnMount, initialTime, mediaUrl, remote]);

  useEffect(() => {
    if (replaySignal <= 0 || replaySignal === lastReplaySignalRef.current) {
      return;
    }

    lastReplaySignalRef.current = replaySignal;
    pendingAutoplayRef.current = true;
    awaitingPauseForAutoplayRef.current = false;
    remote.seek(0);
    void Promise.resolve(remote.play()).then(
      () => {
        window.setTimeout(() => {
          if (!pendingAutoplayRef.current) {
            return;
          }
          if (!pausedRef.current) {
            pendingAutoplayRef.current = false;
            return;
          }
          if (allowAutoplayBlockedPrompt) {
            onAutoplayBlockedRef.current?.();
          }
        }, 300);
      },
      () => {
        if (allowAutoplayBlockedPrompt) {
          onAutoplayBlockedRef.current?.();
        }
      },
    );
  }, [allowAutoplayBlockedPrompt, remote, replaySignal]);

  const currentSourceUrl =
    typeof currentSrc?.src === 'string' ? currentSrc.src : undefined;
  const isCurrentSourceReady = isRequestedMediaSourceReady({
    requestedUrl: mediaUrl,
    currentSourceUrl,
    canPlay,
  });

  useEffect(() => {
    if (!mediaUrl || appliedInitialTimeRef.current || initialTime <= 0) {
      if (initialTime <= 0) {
        appliedInitialTimeRef.current = true;
      }
      return;
    }

    if (!isCurrentSourceReady) {
      return;
    }

    appliedInitialTimeRef.current = true;
    remote.seek(initialTime);
  }, [initialTime, isCurrentSourceReady, mediaUrl, remote]);

  // 新片源 canPlay 后再播放；autoplayOnMount=false 时 pending 为 false，不会 play
  useEffect(() => {
    if (!mediaUrl || !pendingAutoplayRef.current) {
      return;
    }

    if (!isCurrentSourceReady) {
      return;
    }

    const scheduleMutedFirstUnmute = () => {
      if (unmuteTimerRef.current !== null) {
        window.clearTimeout(unmuteTimerRef.current);
        unmuteTimerRef.current = null;
      }
      const preferredMuted = usePlayMediaAudioStore.getState().muted;
      remote.mute();
      const scheduledMediaUrl = mediaUrl;
      unmuteTimerRef.current = window.setTimeout(() => {
        unmuteTimerRef.current = null;
        if (prevMediaUrlRef.current !== scheduledMediaUrl) {
          return;
        }
        usePlayMediaAudioStore.getState().setMuted(preferredMuted);
        if (preferredMuted) {
          remote.mute();
        } else {
          remote.unmute();
        }
      }, PLAYBACK_UNMUTE_DELAY_MS);
    };

    const notifyAutoplayBlocked = () => {
      if (allowAutoplayBlockedPrompt) {
        onAutoplayBlockedRef.current?.();
      }
    };

    const verifyAutoplayStarted = () => {
      window.setTimeout(() => {
        if (!pendingAutoplayRef.current) {
          return;
        }

        if (!pausedRef.current) {
          pendingAutoplayRef.current = false;
          return;
        }

        notifyAutoplayBlocked();
      }, 300);
    };

    const attemptPendingAutoplay = () => {
      if (autoplayMutedFirst) {
        if (mutedFirstPlayAttemptedRef.current) {
          return;
        }

        mutedFirstPlayAttemptedRef.current = true;
        scheduleMutedFirstUnmute();
        void Promise.resolve(remote.play()).then(
          () => {
            verifyAutoplayStarted();
          },
          () => {
            notifyAutoplayBlocked();
          },
        );
        return;
      }

      void Promise.resolve(remote.play()).then(
        () => {
          verifyAutoplayStarted();
        },
        () => {
          notifyAutoplayBlocked();
        },
      );
    };

    if (!paused) {
      // 换源已发出 pause 但尚未生效：此处 !paused 是旧状态，等 pause 落地后再按新片源起播
      if (awaitingPauseForAutoplayRef.current) {
        remote.pause();
        return;
      }

      if (autoplayMutedFirst) {
        // preload 槽升为 current 且确实已在播：勿再 pause→play 以免状态抖动
        pendingAutoplayRef.current = false;
        if (!mutedFirstPlayAttemptedRef.current) {
          mutedFirstPlayAttemptedRef.current = true;
          scheduleMutedFirstUnmute();
        }
        return;
      }

      pendingAutoplayRef.current = false;
      return;
    }

    awaitingPauseForAutoplayRef.current = false;
    attemptPendingAutoplay();
  }, [
    allowAutoplayBlockedPrompt,
    autoplayMutedFirst,
    isCurrentSourceReady,
    mediaUrl,
    paused,
    remote,
  ]);

  // 首进自动播放长时间仍暂停：提示用户点击播放（切集不走此分支）
  useEffect(() => {
    if (
      !mediaUrl ||
      !allowAutoplayBlockedPrompt ||
      !pendingAutoplayRef.current ||
      !isCurrentSourceReady ||
      !paused
    ) {
      return;
    }

    const timerId = window.setTimeout(() => {
      if (pendingAutoplayRef.current) {
        onAutoplayBlockedRef.current?.();
      }
    }, AUTOPLAY_BLOCKED_FALLBACK_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [allowAutoplayBlockedPrompt, isCurrentSourceReady, mediaUrl, paused]);

  return null;
}

function PlayWatchEndSync({
  mediaUrl,
  isEpisodeSwitching,
  onEnded,
}: {
  mediaUrl?: string;
  isEpisodeSwitching?: boolean;
  onEnded: () => void;
}) {
  const ended = useMediaState('ended');
  const wasEndedRef = useRef(false);
  const prevMediaUrlRef = useRef(mediaUrl);

  useEffect(() => {
    if (prevMediaUrlRef.current === mediaUrl) {
      return;
    }

    prevMediaUrlRef.current = mediaUrl;
    wasEndedRef.current = false;
  }, [mediaUrl]);

  useEffect(() => {
    if (isEpisodeSwitching) {
      return;
    }

    if (ended && !wasEndedRef.current) {
      onEnded();
    }

    wasEndedRef.current = ended;
  }, [ended, isEpisodeSwitching, onEnded]);

  return null;
}

function PlayWatchPlayingChange({ onPlaying }: { onPlaying?: () => void }) {
  const paused = useMediaState('paused');
  const wasPausedRef = useRef(true);

  useEffect(() => {
    if (wasPausedRef.current && !paused) {
      onPlaying?.();
    }

    wasPausedRef.current = paused;
  }, [onPlaying, paused]);

  return null;
}

function PlayWatchStartupLoading({
  mediaUrl,
  enabled = false,
  showPausedOverlay = false,
}: {
  mediaUrl?: string;
  enabled?: boolean;
  /** 中心播放钮展示时隐藏转圈，避免 z-30 盖住 z-25 的 blocked 提示 */
  showPausedOverlay?: boolean;
}) {
  const canPlay = useMediaState('canPlay');
  const paused = useMediaState('paused');
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const prevMediaUrlRef = useRef('');

  useEffect(() => {
    const nextUrl = mediaUrl?.trim();
    if (!nextUrl || prevMediaUrlRef.current === nextUrl) {
      return;
    }
    prevMediaUrlRef.current = nextUrl;
    setHasStartedPlayback(false);
  }, [mediaUrl]);

  useEffect(() => {
    if (!paused && canPlay) {
      setHasStartedPlayback(true);
    }
  }, [canPlay, paused]);

  if (!enabled || !mediaUrl || hasStartedPlayback || showPausedOverlay) {
    return null;
  }

  return <PlayMediaLoadingOverlay />;
}

function PlayWatchDirectToggleRegistrar({
  onRegisterDirectToggle,
  onUserPause,
  onUserPlay,
}: {
  onRegisterDirectToggle?: (toggle: (() => void) | null) => void;
  onUserPause?: () => void;
  onUserPlay?: () => void;
}) {
  const remote = useMediaRemote();
  const paused = useMediaState('paused');
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const onUserPauseRef = useRef(onUserPause);
  onUserPauseRef.current = onUserPause;
  const onUserPlayRef = useRef(onUserPlay);
  onUserPlayRef.current = onUserPlay;

  useEffect(() => {
    if (!onRegisterDirectToggle) {
      return;
    }

    onRegisterDirectToggle(() => {
      if (pausedRef.current) {
        onUserPlayRef.current?.();
        void remote.play();
        return;
      }

      onUserPauseRef.current?.();
      remote.pause();
    });

    return () => {
      onRegisterDirectToggle(null);
    };
  }, [onRegisterDirectToggle, remote]);

  return null;
}

function PlayWatchDesktopTapLayer({
  show = false,
  tapDisabled = false,
  onUserPause,
  onUserPlay,
  onDoubleTapLike,
  onLongPress,
  onRegisterLikeEffect,
}: {
  show?: boolean;
  tapDisabled?: boolean;
  onUserPause?: () => void;
  onUserPlay?: () => void;
  onDoubleTapLike?: () => boolean;
  onLongPress?: () => void;
  onRegisterLikeEffect?: (show: (() => void) | null) => void;
}) {
  const { t } = useTranslation();
  const remote = useMediaRemote();
  const paused = useMediaState('paused');
  const [likeBursts, setLikeBursts] = useState<PlayWatchLikeBurst[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const addLikeBurstRef = useRef<
    (target: HTMLButtonElement, clientX: number, clientY: number) => void
  >(() => {});

  // 记录最近一次 pointerdown 的类型，用于过滤触摸设备产生的合成 click
  const lastPointerTypeRef = useRef<string>('mouse');
  const pointerDownRef = useRef({ x: 0, y: 0 });
  const lastTouchTapRef = useRef<
    { time: number; x: number; y: number } | undefined
  >(undefined);
  const singleClickTimerRef = useRef<number | undefined>(undefined);
  const likeBurstTimersRef = useRef<number[]>([]);
  const likeBurstIdRef = useRef(0);
  const longPressTimerRef = useRef<number | undefined>(undefined);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (singleClickTimerRef.current !== undefined) {
        window.clearTimeout(singleClickTimerRef.current);
      }

      if (longPressTimerRef.current !== undefined) {
        window.clearTimeout(longPressTimerRef.current);
      }

      for (const timerId of likeBurstTimersRef.current) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  useEffect(() => {
    if (!show || tapDisabled || !onRegisterLikeEffect) {
      return;
    }

    onRegisterLikeEffect(() => {
      const target = buttonRef.current;
      if (!target) {
        return;
      }

      const rect = target.getBoundingClientRect();
      addLikeBurstRef.current(
        target,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
    });

    return () => {
      onRegisterLikeEffect(null);
    };
  }, [onRegisterLikeEffect, show, tapDisabled]);

  if (!show || tapDisabled) {
    return null;
  }

  const handlePointerDown = (e: ReactPointerEvent) => {
    lastPointerTypeRef.current = e.pointerType;
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    longPressTriggeredRef.current = false;

    if (e.pointerType === 'mouse' || !onLongPress) {
      return;
    }

    if (longPressTimerRef.current !== undefined) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = undefined;
      longPressTriggeredRef.current = true;
      lastTouchTapRef.current = undefined;
      onLongPress();
    }, LONG_PRESS_DELAY_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current === undefined) {
      return;
    }

    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = undefined;
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const movement = Math.hypot(
      e.clientX - pointerDownRef.current.x,
      e.clientY - pointerDownRef.current.y,
    );
    if (movement > LONG_PRESS_DISTANCE_PX) {
      cancelLongPress();
    }
  };

  const addLikeBurst = (
    target: HTMLButtonElement,
    clientX: number,
    clientY: number,
  ) => {
    const rect = target.getBoundingClientRect();
    const edgeInset = 36;
    const x = Math.min(
      Math.max(clientX - rect.left, edgeInset),
      Math.max(edgeInset, rect.width - edgeInset),
    );
    const y = Math.min(
      Math.max(clientY - rect.top, edgeInset),
      Math.max(edgeInset, rect.height - edgeInset),
    );
    const id = likeBurstIdRef.current + 1;
    likeBurstIdRef.current = id;
    const rotation = LIKE_BURST_ROTATIONS[id % LIKE_BURST_ROTATIONS.length];

    setLikeBursts((current) => [...current.slice(-3), { id, x, y, rotation }]);

    const timerId = window.setTimeout(() => {
      setLikeBursts((current) => current.filter((burst) => burst.id !== id));
      likeBurstTimersRef.current = likeBurstTimersRef.current.filter(
        (currentTimerId) => currentTimerId !== timerId,
      );
    }, LIKE_BURST_DURATION_MS);
    likeBurstTimersRef.current.push(timerId);
  };
  addLikeBurstRef.current = addLikeBurst;

  const triggerLikeBurst = (
    target: HTMLButtonElement,
    clientX: number,
    clientY: number,
  ) => {
    if (onDoubleTapLike?.() !== true) {
      return;
    }

    addLikeBurst(target, clientX, clientY);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    cancelLongPress();
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (e.pointerType === 'mouse') {
      return;
    }

    const movement = Math.hypot(
      e.clientX - pointerDownRef.current.x,
      e.clientY - pointerDownRef.current.y,
    );
    if (movement > DOUBLE_TAP_DISTANCE_PX) {
      lastTouchTapRef.current = undefined;
      return;
    }

    const now = performance.now();
    const lastTap = lastTouchTapRef.current;
    const tapDistance = lastTap
      ? Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y)
      : Number.POSITIVE_INFINITY;

    if (
      lastTap &&
      now - lastTap.time <= DOUBLE_TAP_DELAY_MS &&
      tapDistance <= DOUBLE_TAP_DISTANCE_PX
    ) {
      lastTouchTapRef.current = undefined;
      triggerLikeBurst(e.currentTarget, e.clientX, e.clientY);
      return;
    }

    lastTouchTapRef.current = { time: now, x: e.clientX, y: e.clientY };
  };

  const handlePointerCancel = () => {
    cancelLongPress();
    longPressTriggeredRef.current = false;
    lastTouchTapRef.current = undefined;
  };

  const handleClick = (e: ReactMouseEvent) => {
    // 仅响应鼠标点击；触摸 tap 已由手势库处理，此处过滤避免双触发
    if (lastPointerTypeRef.current !== 'mouse') {
      return;
    }

    // 阻止事件继续冒泡（防止外层 slideRef 重复触发）
    e.stopPropagation();

    if (e.detail > 1) {
      return;
    }

    if (singleClickTimerRef.current !== undefined) {
      window.clearTimeout(singleClickTimerRef.current);
    }
    singleClickTimerRef.current = window.setTimeout(() => {
      if (paused) {
        onUserPlay?.();
        void remote.play();
      } else {
        onUserPause?.();
        remote.pause();
      }
      singleClickTimerRef.current = undefined;
    }, DOUBLE_TAP_DELAY_MS);
  };

  const handleDoubleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (lastPointerTypeRef.current !== 'mouse') {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (singleClickTimerRef.current !== undefined) {
      window.clearTimeout(singleClickTimerRef.current);
      singleClickTimerRef.current = undefined;
    }
    triggerLikeBurst(e.currentTarget, e.clientX, e.clientY);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={paused ? t('播放') : t('暂停')}
      // 避开底部播放条（进度约 16 + 控件行约 44 ≈ 60），避免挡住进度/底栏点击
      className={cn(
        'absolute inset-x-0 top-0 bottom-[60px] z-15 border-0 bg-transparent',
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {likeBursts.map((burst) => (
        <PlayWatchLikeBurstEffect key={burst.id} burst={burst} />
      ))}
    </button>
  );
}

function PlayWatchPausedOverlay({
  show,
  variant = 'watch',
  onUserPlay,
}: {
  show?: boolean;
  variant?: 'watch' | 'immersive';
  onUserPlay?: () => void;
}) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const remote = useMediaRemote();
  const paused = useMediaState('paused');
  const canPlay = useMediaState('canPlay');
  const isDarkTheme = resolvedTheme !== 'light';

  if (!show || !paused || !canPlay) {
    return null;
  }

  const handlePlay = () => {
    onUserPlay?.();
    void remote.play();
  };

  const isImmersive = variant === 'immersive';

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-25 flex items-center justify-center',
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-play-watch-no-swipe
        aria-label={t('播放')}
        onClick={handlePlay}
        onPointerDown={playWatchStopGestureBubble}
        onTouchStart={playWatchStopGestureBubble}
        className={cn(
          'pointer-events-auto flex items-center justify-center p-0',
          isImmersive
            ? // Figma 521:72902 浅色白三角 / 521:72677 暗色红三角；稿面无悬停态
              cn(
                'size-13.5 rounded-full border-0 bg-transparent',
                'text-watch-follow-primary transition-none',
                'hover:bg-transparent hover:text-watch-follow-primary',
                'active:bg-transparent active:text-watch-follow-primary',
              )
            : cn(
                'size-[85px] rounded-full border border-white',
                'bg-white/16 backdrop-blur-[9.5px]',
              ),
        )}
      >
        {isImmersive ? (
          <IconPlayLarge
            className="size-13.5"
            triangleClassName={isDarkTheme ? undefined : 'fill-white'}
          />
        ) : (
          <IconPlayerPlay className="ml-0.5 size-9 text-white" />
        )}
      </Button>
    </div>
  );
}

export function PlayWatchVideoPlayer({
  mediaUrl,
  fallbackMediaUrl,
  isEpisodeSwitching = false,
  initialTime = 0,
  autoplayOnMount = true,
  tapDisabled = false,
  showCenterPlayButton = false,
  onTimeUpdate,
  onEnded,
  onPlaying,
  onUserPause,
  onUserPlay,
  replaySignal,
  allowAutoplayBlockedPrompt = false,
  onAutoplayBlocked,
  showDesktopTapLayer = false,
  onDoubleTapLike,
  onLongPress,
  centerPlayVariant = 'watch',
  preloadOnly = false,
  posterImage,
  posterHidden = false,
  posterFadingOut = false,
  posterObjectFit = 'contain',
  onPosterTransitionEnd,
  onFirstFrameReady,
  loop = false,
  enableWatchHlsConfig = false,
  showLoadingBeforePlay = false,
  autoplayMutedFirst = false,
  onPlayerError,
  onRegisterDirectToggle,
  onRegisterLikeEffect,
  shouldAutoResumeOnForeground = false,
  onSystemPaused,
  onForegroundRecoverFailed,
  children,
}: PlayWatchVideoPlayerProps) {
  const [fallbackMediaUrlActive, setFallbackMediaUrlActive] = useState(false);
  const lastMediaUrlRef = useRef('');
  const firedFirstFrameRef = useRef(false);
  const lastResolvedUrlRef = useRef('');
  const preloadSlotLoadedDataRef = useRef<(() => void) | null>(null);
  const mediaMuted = usePlayMediaAudioStore((state) => state.muted);
  const mediaVolume = usePlayMediaAudioStore((state) => state.volume);

  if (mediaUrl) {
    lastMediaUrlRef.current = mediaUrl;
  }

  useEffect(() => {
    if (!mediaUrl) {
      return;
    }
    setFallbackMediaUrlActive(false);
  }, [mediaUrl]);

  const resolvedMediaUrl =
    (fallbackMediaUrlActive ? fallbackMediaUrl?.trim() : undefined) ||
    mediaUrl ||
    (isEpisodeSwitching && lastMediaUrlRef.current
      ? lastMediaUrlRef.current
      : '');

  // 实际播放源变化时重置首帧标记（含 HLS fallback 到 MP4 的场景）
  if (resolvedMediaUrl && resolvedMediaUrl !== lastResolvedUrlRef.current) {
    lastResolvedUrlRef.current = resolvedMediaUrl;
    firedFirstFrameRef.current = false;
  }

  const hasPlayableSource = Boolean(resolvedMediaUrl?.trim());

  if (!hasPlayableSource && !posterImage && !children) {
    return null;
  }

  const normalizedFallbackMediaUrl = fallbackMediaUrl?.trim();
  const canFallbackToMp4 =
    hasPlayableSource &&
    normalizedFallbackMediaUrl &&
    resolvedMediaUrl !== normalizedFallbackMediaUrl &&
    isHlsUrl(resolvedMediaUrl);

  if (
    hasPlayableSource &&
    isHlsUrl(resolvedMediaUrl) &&
    !canPlayHls() &&
    !canFallbackToMp4
  ) {
    return (
      <div className="absolute inset-0 z-0 bg-black">
        <PlayBrowserUnsupportedOverlay />
      </div>
    );
  }

  return (
    <MediaPlayer
      {...PLAY_MEDIA_PLAYER_PROPS}
      {...(enableWatchHlsConfig
        ? { onProviderChange: configurePlayWatchHlsProvider }
        : {})}
      {...(hasPlayableSource ? { src: resolvedMediaUrl } : {})}
      className={cn(
        'absolute inset-0 z-0 size-full bg-black',
        'data-media-player:flex! data-media-player:size-full data-media-player:aspect-auto!',
      )}
      muted={preloadOnly ? true : mediaMuted}
      volume={preloadOnly ? 0 : mediaVolume}
      loop={loop}
      onError={
        hasPlayableSource
          ? () => {
              if (canFallbackToMp4) {
                setFallbackMediaUrlActive(true);
                return;
              }
              onPlayerError?.();
            }
          : undefined
      }
    >
      {hasPlayableSource ? (
        <MediaProvider
          className={cn(
            'absolute inset-0 size-full',
            '[&>video]:absolute [&>video]:inset-0 [&>video]:size-full [&>video]:object-contain',
          )}
          mediaProps={{
            onLoadedData: () => {
              if (preloadOnly) {
                preloadSlotLoadedDataRef.current?.();
                return;
              }

              if (firedFirstFrameRef.current) {
                return;
              }
              firedFirstFrameRef.current = true;
              onFirstFrameReady?.();
            },
          }}
        />
      ) : null}

      {posterImage && !posterHidden ? (
        <img
          alt=""
          className={cn(
            'absolute inset-0 z-5 size-full pointer-events-none',
            posterObjectFit === 'cover' ? 'object-cover' : 'object-contain',
            'transition-opacity duration-300',
            posterFadingOut ? 'opacity-0' : 'opacity-100',
          )}
          src={posterImage}
          onTransitionEnd={onPosterTransitionEnd}
        />
      ) : null}

      <PlayWatchSlotPreloadSync
        mediaUrl={resolvedMediaUrl}
        preloadOnly={preloadOnly}
        onLoadedDataRef={preloadSlotLoadedDataRef}
      />

      {!preloadOnly ? (
        <>
          <PlayWatchTimeSync onTimeUpdate={onTimeUpdate} />
          <PlayWatchEndSync
            mediaUrl={mediaUrl}
            isEpisodeSwitching={isEpisodeSwitching}
            onEnded={onEnded}
          />
          <PlayMediaPauseOnEpisodeSwitch
            isSwitchingEpisode={isEpisodeSwitching}
          />
          <PlayMediaAudioSync suppressMutedWriteback={autoplayMutedFirst} />
          <PlayWatchPlayingChange onPlaying={onPlaying} />
          <PlayWatchStartupLoading
            mediaUrl={resolvedMediaUrl}
            enabled={showLoadingBeforePlay}
            showPausedOverlay={showCenterPlayButton}
          />
          <PlayWatchDirectToggleRegistrar
            onRegisterDirectToggle={onRegisterDirectToggle}
            onUserPause={onUserPause}
            onUserPlay={onUserPlay}
          />
          <PlayWatchPlaybackSync
            mediaUrl={resolvedMediaUrl}
            initialTime={initialTime}
            autoplayOnMount={autoplayOnMount}
            autoplayMutedFirst={autoplayMutedFirst}
            replaySignal={replaySignal}
            allowAutoplayBlockedPrompt={allowAutoplayBlockedPrompt}
            onAutoplayBlocked={onAutoplayBlocked}
          />
          <PlayWatchForegroundResumeSync
            mediaUrl={mediaUrl}
            shouldAutoResume={shouldAutoResumeOnForeground}
            onSystemPaused={onSystemPaused}
            onForegroundRecoverFailed={onForegroundRecoverFailed}
          />
          <PlayWatchDesktopTapLayer
            show={showDesktopTapLayer}
            tapDisabled={tapDisabled}
            onUserPause={onUserPause}
            onUserPlay={onUserPlay}
            onDoubleTapLike={onDoubleTapLike}
            onLongPress={onLongPress}
            onRegisterLikeEffect={onRegisterLikeEffect}
          />
          <PlayWatchPausedOverlay
            show={showCenterPlayButton}
            variant={centerPlayVariant}
            onUserPlay={onUserPlay}
          />
          {children}
        </>
      ) : null}
    </MediaPlayer>
  );
}
