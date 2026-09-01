import { readSnowflakeId } from '@/utils';

export type DramaPlaybackEntry = {
  episodeNo: number;
  currentTime: number;
  duration?: number;
  updatedAt: number;
};

export type DramaPlaybackHistory = {
  version: 2;
  dramas: Record<string, DramaPlaybackEntry>;
};

const PLAY_DRAMA_PROGRESS_STORAGE_KEY = 'play-drama-progress-v2';
const LEGACY_PLAY_WATCH_RESUME_STORAGE_KEY = 'play-watch-resume-v1';
const PLAY_DRAMA_PROGRESS_VERSION = 2;
const PLAY_DRAMA_PROGRESS_LIMIT = 50;

type LegacyPlayWatchResumeState = {
  dramaId: string;
  episodeNo: number;
  currentTime: number;
};

function getEmptyHistory(): DramaPlaybackHistory {
  return { version: PLAY_DRAMA_PROGRESS_VERSION, dramas: {} };
}

function isValidFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeDramaPlaybackEntry(
  value: unknown,
): DramaPlaybackEntry | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<DramaPlaybackEntry>;
  if (!isValidFiniteNumber(candidate.episodeNo) || candidate.episodeNo < 1) {
    return undefined;
  }

  if (
    !isValidFiniteNumber(candidate.currentTime) ||
    candidate.currentTime < 0
  ) {
    return undefined;
  }

  if (!isValidFiniteNumber(candidate.updatedAt) || candidate.updatedAt < 0) {
    return undefined;
  }

  const duration =
    candidate.duration !== undefined &&
    isValidFiniteNumber(candidate.duration) &&
    candidate.duration >= 0
      ? candidate.duration
      : undefined;

  return {
    episodeNo: Math.max(1, Math.floor(candidate.episodeNo)),
    currentTime: candidate.currentTime,
    duration,
    updatedAt: candidate.updatedAt,
  };
}

function pruneHistory(history: DramaPlaybackHistory): DramaPlaybackHistory {
  const sortedEntries = Object.entries(history.dramas)
    .map(([dramaId, entry]) => [dramaId, entry] as const)
    .sort((left, right) => right[1].updatedAt - left[1].updatedAt)
    .slice(0, PLAY_DRAMA_PROGRESS_LIMIT);

  return {
    version: PLAY_DRAMA_PROGRESS_VERSION,
    dramas: Object.fromEntries(sortedEntries),
  };
}

function readHistoryFromStorage(): DramaPlaybackHistory {
  if (typeof window === 'undefined') {
    return getEmptyHistory();
  }

  try {
    const raw = window.localStorage.getItem(PLAY_DRAMA_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return getEmptyHistory();
    }

    const parsed = JSON.parse(raw) as Partial<DramaPlaybackHistory>;
    if (parsed.version !== PLAY_DRAMA_PROGRESS_VERSION) {
      return getEmptyHistory();
    }

    const dramasRaw = parsed.dramas;
    if (!dramasRaw || typeof dramasRaw !== 'object') {
      return getEmptyHistory();
    }

    const dramas = Object.fromEntries(
      Object.entries(dramasRaw).flatMap(([dramaId, entry]) => {
        const normalizedDramaId = readSnowflakeId(dramaId) ?? dramaId.trim();
        const normalizedEntry = normalizeDramaPlaybackEntry(entry);
        if (!normalizedDramaId || !normalizedEntry) {
          return [];
        }

        return [[normalizedDramaId, normalizedEntry] as const];
      }),
    );

    return pruneHistory({
      version: PLAY_DRAMA_PROGRESS_VERSION,
      dramas,
    });
  } catch {
    return getEmptyHistory();
  }
}

function writeHistoryToStorage(
  history: DramaPlaybackHistory,
): DramaPlaybackHistory {
  const prunedHistory = pruneHistory(history);

  if (typeof window === 'undefined') {
    return prunedHistory;
  }

  try {
    window.localStorage.setItem(
      PLAY_DRAMA_PROGRESS_STORAGE_KEY,
      JSON.stringify(prunedHistory),
    );
  } catch {
    // private mode / quota exceeded
  }

  return prunedHistory;
}

function readLegacyResumeState(): LegacyPlayWatchResumeState | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const raw = window.sessionStorage.getItem(
      LEGACY_PLAY_WATCH_RESUME_STORAGE_KEY,
    );
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as Partial<LegacyPlayWatchResumeState>;
    const dramaId = readSnowflakeId(parsed.dramaId);
    if (
      !dramaId ||
      !isValidFiniteNumber(parsed.episodeNo) ||
      parsed.episodeNo < 1 ||
      !isValidFiniteNumber(parsed.currentTime) ||
      parsed.currentTime < 0
    ) {
      return undefined;
    }

    return {
      dramaId,
      episodeNo: Math.floor(parsed.episodeNo),
      currentTime: parsed.currentTime,
    };
  } catch {
    return undefined;
  }
}

function clearLegacyResumeState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(LEGACY_PLAY_WATCH_RESUME_STORAGE_KEY);
  } catch {
    // ignore legacy cleanup failures
  }
}

function migrateLegacyResumeState(
  history: DramaPlaybackHistory,
): DramaPlaybackHistory {
  const legacyEntry = readLegacyResumeState();
  if (!legacyEntry) {
    return history;
  }

  if (history.dramas[legacyEntry.dramaId]) {
    clearLegacyResumeState();
    return history;
  }

  const nextHistory: DramaPlaybackHistory = {
    version: PLAY_DRAMA_PROGRESS_VERSION,
    dramas: {
      ...history.dramas,
      [legacyEntry.dramaId]: {
        episodeNo: legacyEntry.episodeNo,
        currentTime: legacyEntry.currentTime,
        updatedAt: Date.now(),
      },
    },
  };
  const migratedHistory = writeHistoryToStorage(nextHistory);
  const persistedEntry = readHistoryFromStorage().dramas[legacyEntry.dramaId];

  if (
    persistedEntry?.episodeNo === legacyEntry.episodeNo &&
    persistedEntry.currentTime === legacyEntry.currentTime
  ) {
    clearLegacyResumeState();
    return migratedHistory;
  }

  return history;
}

export function readPlayDramaProgressHistory(): DramaPlaybackHistory {
  return migrateLegacyResumeState(readHistoryFromStorage());
}

export function readPlayDramaProgressEntry(
  dramaId: string,
): DramaPlaybackEntry | undefined {
  const normalizedDramaId = readSnowflakeId(dramaId);
  if (!normalizedDramaId) {
    return undefined;
  }

  return readPlayDramaProgressHistory().dramas[normalizedDramaId];
}

export function writePlayDramaProgressEntry(
  dramaId: string,
  entry: DramaPlaybackEntry,
): DramaPlaybackHistory {
  const normalizedDramaId = readSnowflakeId(dramaId);
  const normalizedEntry = normalizeDramaPlaybackEntry(entry);
  if (!normalizedDramaId || !normalizedEntry) {
    return readPlayDramaProgressHistory();
  }

  const history = readPlayDramaProgressHistory();
  return writeHistoryToStorage({
    version: PLAY_DRAMA_PROGRESS_VERSION,
    dramas: {
      ...history.dramas,
      [normalizedDramaId]: normalizedEntry,
    },
  });
}

export function clearPlayDramaProgressEntry(
  dramaId: string,
): DramaPlaybackHistory {
  const normalizedDramaId = readSnowflakeId(dramaId);
  if (!normalizedDramaId) {
    return readPlayDramaProgressHistory();
  }

  const history = readPlayDramaProgressHistory();
  const { [normalizedDramaId]: _removed, ...rest } = history.dramas;
  return writeHistoryToStorage({
    version: PLAY_DRAMA_PROGRESS_VERSION,
    dramas: rest,
  });
}
