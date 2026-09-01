import {
  PlayFeedContentType,
  type RecommendPlaybackScope,
} from '@/features/play/types/playImmersive';
import { readSnowflakeId } from '@/utils';

export type RecommendPlaybackSession = {
  scope: RecommendPlaybackScope;
  activeKey: {
    contentType: PlayFeedContentType;
    dramaId?: string;
    episodeId: string;
  };
  currentTime: number;
  paused: boolean;
  updatedAt: number;
};

const PLAY_RECOMMEND_SESSION_STORAGE_KEY = 'play-recommend-playback-session-v1';
let hasHandledInitialReloadGuard = false;

function normalizeRecommendPlaybackSession(
  value: unknown,
): RecommendPlaybackSession | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<RecommendPlaybackSession>;
  const scope = candidate.scope;
  if (
    !scope ||
    typeof scope !== 'object' ||
    typeof scope.auth !== 'string' ||
    !scope.auth.trim() ||
    typeof scope.language !== 'string' ||
    !scope.language.trim()
  ) {
    return undefined;
  }

  const activeKey = candidate.activeKey;
  if (!activeKey || typeof activeKey !== 'object') {
    return undefined;
  }

  const contentType =
    activeKey.contentType === PlayFeedContentType.ShortVideo
      ? PlayFeedContentType.ShortVideo
      : activeKey.contentType === PlayFeedContentType.DramaEpisode
        ? PlayFeedContentType.DramaEpisode
        : undefined;
  const episodeId = readSnowflakeId(activeKey.episodeId);
  const dramaId =
    activeKey.dramaId !== undefined
      ? readSnowflakeId(activeKey.dramaId)
      : undefined;

  if (
    !contentType ||
    !episodeId ||
    typeof candidate.currentTime !== 'number' ||
    !Number.isFinite(candidate.currentTime) ||
    candidate.currentTime < 0 ||
    typeof candidate.updatedAt !== 'number' ||
    !Number.isFinite(candidate.updatedAt) ||
    candidate.updatedAt < 0
  ) {
    return undefined;
  }

  return {
    scope: {
      auth: scope.auth,
      language: scope.language,
    },
    activeKey: {
      contentType,
      ...(dramaId ? { dramaId } : {}),
      episodeId,
    },
    currentTime: candidate.currentTime,
    paused: candidate.paused === true,
    updatedAt: candidate.updatedAt,
  };
}

function getNavigationType(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const navigationEntry = window.performance
    .getEntriesByType?.('navigation')
    .at(0) as PerformanceNavigationTiming | undefined;
  if (navigationEntry?.type) {
    return navigationEntry.type;
  }

  const legacyNavigation = window.performance.navigation;
  if (!legacyNavigation) {
    return undefined;
  }

  switch (legacyNavigation.type) {
    case legacyNavigation.TYPE_RELOAD:
      return 'reload';
    case legacyNavigation.TYPE_BACK_FORWARD:
      return 'back_forward';
    default:
      return 'navigate';
  }
}

export function clearPlayRecommendSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(PLAY_RECOMMEND_SESSION_STORAGE_KEY);
  } catch {
    // private mode / quota
  }
}

export function readPlayRecommendSession(
  expectedScope: RecommendPlaybackScope,
): RecommendPlaybackSession | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  if (!hasHandledInitialReloadGuard) {
    hasHandledInitialReloadGuard = true;

    if (getNavigationType() === 'reload') {
      clearPlayRecommendSession();
      return undefined;
    }
  }

  try {
    const raw = window.sessionStorage.getItem(
      PLAY_RECOMMEND_SESSION_STORAGE_KEY,
    );
    if (!raw) {
      return undefined;
    }

    const session = normalizeRecommendPlaybackSession(JSON.parse(raw));
    if (
      !session ||
      session.scope.auth !== expectedScope.auth ||
      session.scope.language !== expectedScope.language
    ) {
      clearPlayRecommendSession();
      return undefined;
    }

    return session;
  } catch {
    return undefined;
  }
}

export function writePlayRecommendSession(
  session: RecommendPlaybackSession,
): RecommendPlaybackSession | undefined {
  const normalizedSession = normalizeRecommendPlaybackSession(session);
  if (!normalizedSession) {
    return undefined;
  }

  if (typeof window === 'undefined') {
    return normalizedSession;
  }

  try {
    window.sessionStorage.setItem(
      PLAY_RECOMMEND_SESSION_STORAGE_KEY,
      JSON.stringify(normalizedSession),
    );
  } catch {
    // private mode / quota
  }

  return normalizedSession;
}

export function updatePlayRecommendSession(args: {
  scope: RecommendPlaybackScope;
  activeKey: RecommendPlaybackSession['activeKey'];
  currentTime: number;
  paused: boolean;
  updatedAt?: number;
}): RecommendPlaybackSession | undefined {
  return writePlayRecommendSession({
    scope: args.scope,
    activeKey: args.activeKey,
    currentTime: args.currentTime,
    paused: args.paused,
    updatedAt: args.updatedAt ?? Date.now(),
  });
}

export function resetPlayRecommendSessionReloadGuardForTesting(): void {
  hasHandledInitialReloadGuard = false;
}
