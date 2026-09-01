import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { WatchHistoryReportItem } from '@/api/__generated__/story/model/watchHistoryReportItem';
import {
  getListDramas1QueryKey,
  getListRecentQueryKey,
  getListVideosQueryKey,
  report as reportWatchHistory,
} from '@/api/__generated__/story/watch-history/watch-history';
import { readSnowflakeId } from '@/utils';

const REPORT_DELAY_MS = 2_000;
const REPORT_BATCH_SIZE = 20;

const pendingHistory = new Map<string, number>();
let reportTimer: number | undefined;
let unmountFlushTimer: number | undefined;
let inFlightReport: Promise<void> | undefined;

function scheduleReport(queryClient: QueryClient) {
  if (reportTimer !== undefined || pendingHistory.size === 0) {
    return;
  }

  reportTimer = window.setTimeout(() => {
    reportTimer = undefined;
    void flushWatchHistory(queryClient);
  }, REPORT_DELAY_MS);
}

function restoreFailedBatch(batch: Array<[string, number]>) {
  for (const [episodeId, watchedAt] of batch) {
    const pendingWatchedAt = pendingHistory.get(episodeId);
    if (pendingWatchedAt === undefined || watchedAt > pendingWatchedAt) {
      pendingHistory.set(episodeId, watchedAt);
    }
  }
}

function invalidateWatchHistoryQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: getListVideosQueryKey(),
  });
  void queryClient.invalidateQueries({
    queryKey: getListDramas1QueryKey(),
  });
  void queryClient.invalidateQueries({
    queryKey: getListRecentQueryKey(),
  });
  void queryClient.invalidateQueries({
    queryKey: ['profile', 'watch-history'],
  });
}

async function flushWatchHistory(queryClient: QueryClient) {
  if (inFlightReport) {
    return inFlightReport;
  }

  window.clearTimeout(reportTimer);
  reportTimer = undefined;
  const batch = Array.from(pendingHistory.entries()).slice(
    0,
    REPORT_BATCH_SIZE,
  );
  if (batch.length === 0) {
    return;
  }

  for (const [episodeId] of batch) {
    pendingHistory.delete(episodeId);
  }

  // episodeId 全链路保持雪花 string；生成类型暂为 number，边界做最小适配
  const items: WatchHistoryReportItem[] = batch.map(
    ([episodeId, watchedAt]) => ({
      episodeId: episodeId as unknown as WatchHistoryReportItem['episodeId'],
      watchedAt,
    }),
  );

  inFlightReport = reportWatchHistory({ items })
    .then(() => {
      invalidateWatchHistoryQueries(queryClient);
    })
    .catch(() => {
      restoreFailedBatch(batch);
    })
    .finally(() => {
      inFlightReport = undefined;

      if (pendingHistory.size === 0) {
        return;
      }

      // 飞行中新入队的条目：满批立即刷，否则重新延迟调度
      if (pendingHistory.size >= REPORT_BATCH_SIZE) {
        void flushWatchHistory(queryClient);
        return;
      }

      scheduleReport(queryClient);
    });

  return inFlightReport;
}

function enqueueWatchHistory(episodeId: string, queryClient: QueryClient) {
  const watchedAt = Date.now();
  const previous = pendingHistory.get(episodeId);
  if (previous === undefined || watchedAt > previous) {
    pendingHistory.set(episodeId, watchedAt);
  }

  if (pendingHistory.size >= REPORT_BATCH_SIZE) {
    void flushWatchHistory(queryClient);
    return;
  }

  scheduleReport(queryClient);
}

/**
 * 消费侧播放页登记观看历史（Watch / Immersive / Detail）。
 * Banner 预览、创作预览等非消费播放不接入本 hook。
 * 当前内容成为 active item 即入队；与媒体加载和有效播放状态无关。
 */
export function usePlayWatchHistoryReporter({
  episodeId,
  isLogin,
}: {
  episodeId?: string;
  isLogin: boolean;
}) {
  const queryClient = useQueryClient();
  const episodeIdText = readSnowflakeId(episodeId);

  useEffect(() => {
    if (!isLogin || !episodeIdText) {
      return;
    }

    enqueueWatchHistory(episodeIdText, queryClient);
  }, [episodeIdText, isLogin, queryClient]);

  useEffect(() => {
    window.clearTimeout(unmountFlushTimer);
    unmountFlushTimer = undefined;

    if (!isLogin) {
      pendingHistory.clear();
      window.clearTimeout(reportTimer);
      reportTimer = undefined;
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushWatchHistory(queryClient);
      } else if (pendingHistory.size > 0) {
        void flushWatchHistory(queryClient);
      }
    };
    const handlePageHide = () => {
      void flushWatchHistory(queryClient);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);

      // 下一任务取消该定时器，可规避 React StrictMode 探测卸载造成重复上报
      unmountFlushTimer = window.setTimeout(() => {
        unmountFlushTimer = undefined;
        void flushWatchHistory(queryClient);
      }, 0);
    };
  }, [isLogin, queryClient]);
}
