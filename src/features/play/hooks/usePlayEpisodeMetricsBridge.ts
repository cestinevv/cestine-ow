import { useEffect, useRef } from 'react';

import {
  createPlayEpisodeMetricsTracker,
  type PlayEpisodeMetricsReportSignals,
  type PlayEpisodeMetricsTracker,
} from '@/features/play/playEpisodeMetricsTracker';

type UsePlayEpisodeMetricsBridgeArgs = {
  isLogin: boolean;
  episodeApiId?: string;
  reportEpisodePlay: (episodeId: string, watchMs?: number) => Promise<unknown>;
  reportEpisodeComplete: (episodeId: string) => Promise<unknown>;
  resetKey: string;
};

const EMPTY_SIGNALS: PlayEpisodeMetricsReportSignals = {
  reportPlay: false,
  reportComplete: false,
};

export function usePlayEpisodeMetricsBridge({
  isLogin,
  episodeApiId,
  reportEpisodePlay,
  reportEpisodeComplete,
  resetKey,
}: UsePlayEpisodeMetricsBridgeArgs) {
  const trackerRef = useRef<PlayEpisodeMetricsTracker | null>(null);
  const reportedPlayRef = useRef(false);
  const reportedCompleteRef = useRef(false);

  if (!trackerRef.current) {
    trackerRef.current = createPlayEpisodeMetricsTracker();
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey 变化时重置 tracker 与上报标记
  useEffect(() => {
    trackerRef.current?.reset();
    reportedPlayRef.current = false;
    reportedCompleteRef.current = false;
  }, [resetKey]);

  const applyReportSignals = (signals: PlayEpisodeMetricsReportSignals) => {
    if (!isLogin || !episodeApiId) {
      return;
    }

    if (signals.reportPlay && !reportedPlayRef.current) {
      reportedPlayRef.current = true;
      const watchMs = trackerRef.current?.getWatchMs();
      void reportEpisodePlay(episodeApiId, watchMs).catch(() => {
        reportedPlayRef.current = false;
      });
    }

    if (signals.reportComplete && !reportedCompleteRef.current) {
      reportedCompleteRef.current = true;
      void reportEpisodeComplete(episodeApiId).catch(() => {
        reportedCompleteRef.current = false;
      });
    }
  };

  const handlePlayStart = () => {
    trackerRef.current?.onPlayStart();
  };

  const handlePause = () => {
    trackerRef.current?.onPause();
  };

  const handleTimeUpdate = (currentTime: number, duration?: number) => {
    const signals =
      trackerRef.current?.onTimeUpdate(currentTime, duration) ?? EMPTY_SIGNALS;
    applyReportSignals(signals);
  };

  const handleMetricsSignals = (signals: PlayEpisodeMetricsReportSignals) => {
    applyReportSignals(signals);
  };

  return {
    tracker: trackerRef.current,
    handlePlayStart,
    handlePause,
    handleTimeUpdate,
    handleMetricsSignals,
  };
}
