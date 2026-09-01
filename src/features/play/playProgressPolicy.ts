export type DramaPlaybackEntryLike = {
  episodeNo: number;
  currentTime: number;
  duration?: number;
  updatedAt: number;
};

type ResolveInitialDramaPlaybackArgs = {
  explicitEpisodeId?: string;
  explicitEpisodeNo?: number;
  savedEntry?: DramaPlaybackEntryLike;
};

type ResolveCompletedDramaEntryArgs = {
  episodeNo: number;
  totalEpisodes?: number;
  duration?: number;
  updatedAt?: number;
};

const MIN_PERSIST_TIME_SECONDS = 3;
const COMPLETE_THRESHOLD_SECONDS = 5;

function normalizeEpisodeNo(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(1, Math.floor(value ?? 0));
}

export function normalizePlaybackTime(
  currentTime: number,
  duration?: number,
): number {
  if (!Number.isFinite(currentTime) || currentTime < 0) {
    return 0;
  }

  if (currentTime < MIN_PERSIST_TIME_SECONDS) {
    return 0;
  }

  if (!Number.isFinite(duration) || duration === undefined || duration <= 0) {
    return currentTime;
  }

  if (currentTime >= duration) {
    return 0;
  }

  if (duration - currentTime <= COMPLETE_THRESHOLD_SECONDS) {
    return 0;
  }

  return currentTime;
}

export function normalizeRecommendPlaybackTime(
  currentTime: number,
  duration?: number,
): number {
  if (!Number.isFinite(currentTime) || currentTime < 0) {
    return 0;
  }

  if (
    Number.isFinite(duration) &&
    duration !== undefined &&
    duration > 0 &&
    currentTime >= duration
  ) {
    return 0;
  }

  return currentTime;
}

export function isPlaybackCompleted(
  currentTime: number,
  duration?: number,
): boolean {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration)) {
    return false;
  }

  if (duration === undefined || duration <= 0) {
    return false;
  }

  return duration - currentTime <= COMPLETE_THRESHOLD_SECONDS;
}

export function resolveCompletedDramaEntry({
  episodeNo,
  totalEpisodes,
  duration,
  updatedAt = Date.now(),
}: ResolveCompletedDramaEntryArgs): DramaPlaybackEntryLike {
  const normalizedEpisodeNo = normalizeEpisodeNo(episodeNo) ?? 1;
  const normalizedTotalEpisodes = normalizeEpisodeNo(totalEpisodes);
  const nextEpisodeNo =
    normalizedTotalEpisodes !== undefined &&
    normalizedEpisodeNo < normalizedTotalEpisodes
      ? normalizedEpisodeNo + 1
      : normalizedEpisodeNo;

  return {
    episodeNo: nextEpisodeNo,
    currentTime: 0,
    duration,
    updatedAt,
  };
}

export function resolveRecommendSessionOnComplete(
  currentTime?: number,
): number {
  return normalizePlaybackTime(
    Number.isFinite(currentTime) ? (currentTime ?? 0) : 0,
    0,
  );
}

export function resolveInitialDramaPlayback({
  explicitEpisodeId,
  explicitEpisodeNo,
  savedEntry,
}: ResolveInitialDramaPlaybackArgs): {
  episodeNo: number;
  currentTime: number;
  restoredFromHistory: boolean;
  shouldStartPaused: boolean;
} {
  const normalizedExplicitEpisodeNo = normalizeEpisodeNo(explicitEpisodeNo);
  const normalizedSavedEpisodeNo = normalizeEpisodeNo(savedEntry?.episodeNo);
  const hasPendingEpisodeId =
    typeof explicitEpisodeId === 'string' && explicitEpisodeId.length > 0;

  // episodeId 未解析完成前，episodeNo 只作加载提示，不能决定最终播放集
  if (hasPendingEpisodeId) {
    return {
      episodeNo: normalizedExplicitEpisodeNo ?? normalizedSavedEpisodeNo ?? 1,
      currentTime: 0,
      restoredFromHistory: false,
      shouldStartPaused: false,
    };
  }

  const hasExplicitTarget = normalizedExplicitEpisodeNo !== undefined;

  const resolvedEpisodeNo =
    normalizedExplicitEpisodeNo ??
    (hasExplicitTarget ? undefined : normalizedSavedEpisodeNo) ??
    1;

  const canRestoreTime =
    normalizedSavedEpisodeNo !== undefined &&
    normalizedSavedEpisodeNo === resolvedEpisodeNo;

  return {
    episodeNo: resolvedEpisodeNo,
    currentTime: canRestoreTime
      ? normalizePlaybackTime(
          savedEntry?.currentTime ?? 0,
          savedEntry?.duration,
        )
      : 0,
    restoredFromHistory: canRestoreTime,
    shouldStartPaused: canRestoreTime,
  };
}

export function shouldForegroundAutoResume(args: {
  hasActivatedPlayback: boolean;
  userPaused: boolean;
}): boolean {
  return args.hasActivatedPlayback && !args.userPaused;
}

export function resolveExplicitAutoplayEntryKey(args: {
  currentEntryKey?: string;
  explicitAutoplay: boolean;
  nextEntryKey?: string;
}): string | undefined {
  if (!args.nextEntryKey) {
    return undefined;
  }

  if (args.explicitAutoplay) {
    return args.nextEntryKey;
  }

  return args.currentEntryKey === args.nextEntryKey
    ? args.currentEntryKey
    : undefined;
}

/** 每次进入新片源时的播放意图，用于决定 autoplayOnMount，与首次恢复状态解耦 */
export type PlaybackEntryReason =
  | 'initial'
  | 'history-restore'
  | 'recommend-restore'
  | 'explicit-target'
  | 'user-episode-change'
  | 'auto-next';

export function resolveInitialPlaybackEntryReason(args: {
  shouldRestoreRecommendPlayback?: boolean;
  restoredFromHistory?: boolean;
  hasExplicitEpisodeId?: boolean;
  hasExplicitEpisodeNo?: boolean;
}): PlaybackEntryReason {
  if (args.shouldRestoreRecommendPlayback) {
    return 'recommend-restore';
  }

  if (args.restoredFromHistory) {
    return 'history-restore';
  }

  if (args.hasExplicitEpisodeId || args.hasExplicitEpisodeNo) {
    return 'explicit-target';
  }

  return 'initial';
}

/** 切 contentKey（换剧 / 列表翻条）时的播放意图：列表浏览仍续播进度，但不走 history-restore 暂停 */
export function resolveContentKeyPlaybackEntryReason(args: {
  shouldRestoreRecommendPlayback?: boolean;
  restoredFromHistory?: boolean;
  hasExplicitEpisodeId?: boolean;
  hasExplicitEpisodeNo?: boolean;
  fromWorkListPlaylist?: boolean;
  isDramaPlaylistPaging?: boolean;
}): PlaybackEntryReason {
  if (args.fromWorkListPlaylist || args.isDramaPlaylistPaging) {
    return 'user-episode-change';
  }

  return resolveInitialPlaybackEntryReason(args);
}

export function shouldAutoplayForEntryReason(
  reason: PlaybackEntryReason,
  options?: { explicitAutoplay?: boolean; recommendPaused?: boolean },
): boolean {
  if (options?.explicitAutoplay) {
    return true;
  }

  switch (reason) {
    case 'recommend-restore':
      return options?.recommendPaused !== true;
    case 'history-restore':
      return false;
    case 'explicit-target':
    case 'user-episode-change':
    case 'auto-next':
    case 'initial':
      return true;
  }
}
