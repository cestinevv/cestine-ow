import { ListPublicDramasSort } from '@/api/__generated__/story/model/listPublicDramasSort';

export type PlayTheaterSessionState = {
  selectedTagId?: number;
  selectedSort: ListPublicDramasSort;
  searchDraft: string;
  searchKeyword?: string;
  scrollY: number;
  activeBannerIndex: number;
  hasCompletedInitialLoad: boolean;
};

const PLAY_THEATER_SESSION_KEY = 'play-theater-session-v1';

const PLAY_THEATER_SORT_VALUES = new Set<string>(
  Object.values(ListPublicDramasSort),
);

function readRawSession(): Partial<PlayTheaterSessionState> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(PLAY_THEATER_SESSION_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Partial<PlayTheaterSessionState>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function readPlayTheaterSession(): Partial<PlayTheaterSessionState> {
  const session = readRawSession();

  if (
    session.selectedSort !== undefined &&
    !PLAY_THEATER_SORT_VALUES.has(session.selectedSort)
  ) {
    return {
      ...session,
      selectedSort: ListPublicDramasSort.hot,
    };
  }

  return session;
}

export function writePlayTheaterSession(
  patch: Partial<PlayTheaterSessionState>,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const next = {
      ...readRawSession(),
      ...patch,
    };
    window.sessionStorage.setItem(
      PLAY_THEATER_SESSION_KEY,
      JSON.stringify(next),
    );
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}
