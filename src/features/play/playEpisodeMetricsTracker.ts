const FORWARD_SEEK_THRESHOLD_SECONDS = 3;
const MAX_DELTA_PER_TICK_SECONDS = 1.5;
const COMPLETE_PROGRESS_THRESHOLD = 0.9;

export type PlayEpisodeMetricsReportSignals = {
  reportPlay: boolean;
  reportComplete: boolean;
};

export type PlayEpisodeMetricsTracker = {
  reset: () => void;
  onPlayStart: () => void;
  onPause: () => void;
  /** 有效观看时长（毫秒），供 play 上报 watchMs */
  getWatchMs: () => number;
  onTimeUpdate: (
    currentTime: number,
    duration?: number,
  ) => PlayEpisodeMetricsReportSignals;
};

export function getPlayThresholdSeconds(duration: number) {
  return Math.max(5, Math.min(10, duration * 0.2));
}

export function getCompleteWatchThresholdSeconds(duration: number) {
  return duration * 0.6;
}

export function createPlayEpisodeMetricsTracker(): PlayEpisodeMetricsTracker {
  let isStarted = false;
  let isPlaying = false;
  let effectiveWatchSeconds = 0;
  let maxProgressRatio = 0;
  let previousTime: number | undefined;
  let duration: number | undefined;

  const getReportSignals = (): PlayEpisodeMetricsReportSignals => {
    if (
      !isStarted ||
      !duration ||
      duration <= 0 ||
      !Number.isFinite(duration)
    ) {
      return { reportPlay: false, reportComplete: false };
    }

    const playThreshold = getPlayThresholdSeconds(duration);
    const completeWatchThreshold = getCompleteWatchThresholdSeconds(duration);

    return {
      reportPlay: effectiveWatchSeconds >= playThreshold,
      reportComplete:
        maxProgressRatio >= COMPLETE_PROGRESS_THRESHOLD &&
        effectiveWatchSeconds >= completeWatchThreshold,
    };
  };

  return {
    reset() {
      isStarted = false;
      isPlaying = false;
      effectiveWatchSeconds = 0;
      maxProgressRatio = 0;
      previousTime = undefined;
      duration = undefined;
    },
    onPlayStart() {
      isStarted = true;
      isPlaying = true;
    },
    onPause() {
      isPlaying = false;
    },
    getWatchMs() {
      return Math.max(0, Math.round(effectiveWatchSeconds * 1000));
    },
    onTimeUpdate(currentTime, nextDuration) {
      if (
        nextDuration !== undefined &&
        Number.isFinite(nextDuration) &&
        nextDuration > 0
      ) {
        duration = nextDuration;
      }

      if (
        !isStarted ||
        !isPlaying ||
        !duration ||
        duration <= 0 ||
        !Number.isFinite(currentTime) ||
        currentTime < 0
      ) {
        return getReportSignals();
      }

      maxProgressRatio = Math.max(maxProgressRatio, currentTime / duration);

      if (previousTime !== undefined) {
        const delta = currentTime - previousTime;

        if (delta > FORWARD_SEEK_THRESHOLD_SECONDS || delta < 0) {
          // 方案 A：大幅向前 seek 或倒退，本段不计入有效时长
          previousTime = currentTime;
          return getReportSignals();
        }

        if (delta > 0 && delta <= MAX_DELTA_PER_TICK_SECONDS) {
          effectiveWatchSeconds += delta;
        }
      }

      previousTime = currentTime;
      return getReportSignals();
    },
  };
}
