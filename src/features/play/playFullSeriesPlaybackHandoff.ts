import { readSnowflakeId } from '@/utils';

const PLAY_FULL_SERIES_HANDOFF_STORAGE_KEY =
  'play-full-series-playback-handoff-v1';
const PLAY_FULL_SERIES_HANDOFF_MAX_AGE_MS = 30_000;

export type FullSeriesPlaybackHandoff = {
  dramaId: string;
  episodeId?: string;
  episodeNo: number;
  currentTime: number;
  paused: boolean;
  updatedAt: number;
};

type WriteFullSeriesPlaybackHandoffArgs = Omit<
  FullSeriesPlaybackHandoff,
  'updatedAt'
>;

function normalizeEpisodeNo(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
    return undefined;
  }

  return Math.floor(value);
}

function normalizeHandoff(
  value: unknown,
): FullSeriesPlaybackHandoff | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<FullSeriesPlaybackHandoff>;
  const dramaId = readSnowflakeId(candidate.dramaId);
  const episodeId = readSnowflakeId(candidate.episodeId);
  const episodeNo = normalizeEpisodeNo(candidate.episodeNo);
  if (
    !dramaId ||
    !episodeNo ||
    typeof candidate.currentTime !== 'number' ||
    !Number.isFinite(candidate.currentTime) ||
    candidate.currentTime < 0 ||
    typeof candidate.paused !== 'boolean' ||
    typeof candidate.updatedAt !== 'number' ||
    !Number.isFinite(candidate.updatedAt)
  ) {
    return undefined;
  }

  return {
    dramaId,
    episodeId,
    episodeNo,
    currentTime: candidate.currentTime,
    paused: candidate.paused,
    updatedAt: candidate.updatedAt,
  };
}

function removeStoredHandoff(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(PLAY_FULL_SERIES_HANDOFF_STORAGE_KEY);
  } catch {
    // private mode / storage unavailable
  }
}

export function readFullSeriesPlaybackHandoff():
  | FullSeriesPlaybackHandoff
  | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const raw = window.sessionStorage.getItem(
      PLAY_FULL_SERIES_HANDOFF_STORAGE_KEY,
    );
    if (!raw) {
      return undefined;
    }

    const handoff = normalizeHandoff(JSON.parse(raw));
    if (
      !handoff ||
      Date.now() - handoff.updatedAt > PLAY_FULL_SERIES_HANDOFF_MAX_AGE_MS
    ) {
      removeStoredHandoff();
      return undefined;
    }

    return handoff;
  } catch {
    removeStoredHandoff();
    return undefined;
  }
}

export function writeFullSeriesPlaybackHandoff(
  args: WriteFullSeriesPlaybackHandoffArgs,
): FullSeriesPlaybackHandoff | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const handoff = normalizeHandoff({ ...args, updatedAt: Date.now() });
  if (!handoff) {
    return undefined;
  }

  try {
    window.sessionStorage.setItem(
      PLAY_FULL_SERIES_HANDOFF_STORAGE_KEY,
      JSON.stringify(handoff),
    );
  } catch {
    return undefined;
  }

  return handoff;
}

export function isFullSeriesPlaybackHandoffMatch(
  handoff: FullSeriesPlaybackHandoff | undefined,
  target: {
    dramaId?: string;
    episodeId?: string;
    episodeNo?: number;
  },
): handoff is FullSeriesPlaybackHandoff {
  if (!handoff || readSnowflakeId(target.dramaId) !== handoff.dramaId) {
    return false;
  }

  const targetEpisodeId = readSnowflakeId(target.episodeId);
  if (targetEpisodeId) {
    return targetEpisodeId === handoff.episodeId;
  }

  return normalizeEpisodeNo(target.episodeNo) === handoff.episodeNo;
}

export function clearFullSeriesPlaybackHandoff(
  consumed: FullSeriesPlaybackHandoff,
): void {
  const stored = readFullSeriesPlaybackHandoff();
  if (
    stored?.dramaId !== consumed.dramaId ||
    stored.episodeId !== consumed.episodeId ||
    stored.episodeNo !== consumed.episodeNo ||
    stored.updatedAt !== consumed.updatedAt
  ) {
    return;
  }

  removeStoredHandoff();
}
