export enum ActorPlazaSortKey {
  Price = 'price',
  Lv1Salary = 'lv1Salary',
}

export type ActorPlazaSortOption = ActorPlazaSortKey;
export type ActorPlazaPriceSortOrder = 'asc' | 'desc';

export type ActorPlazaSessionState = {
  activeSort: ActorPlazaSortOption;
  priceSortOrder: ActorPlazaPriceSortOrder;
  scrollY: number;
};

const ACTOR_PLAZA_SESSION_KEY = 'actor-plaza-session-v1';

const ACTOR_PLAZA_SORT_KEYS = new Set<string>(Object.values(ActorPlazaSortKey));

function readRawSession(): Partial<ActorPlazaSessionState> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(ACTOR_PLAZA_SESSION_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Partial<ActorPlazaSessionState> & {
      activeSort?: string;
    };
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function readActorPlazaSession(): Partial<ActorPlazaSessionState> {
  const session = readRawSession();

  // 旧筛选 completion / heat / ipPower / maxSalary 回退到价格
  if (
    session.activeSort !== undefined &&
    !ACTOR_PLAZA_SORT_KEYS.has(session.activeSort)
  ) {
    return {
      ...session,
      activeSort: ActorPlazaSortKey.Price,
    };
  }

  return session;
}

export function writeActorPlazaSession(
  patch: Partial<ActorPlazaSessionState>,
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
      ACTOR_PLAZA_SESSION_KEY,
      JSON.stringify(next),
    );
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}
