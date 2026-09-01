const ACTOR_COLLECTION_PREPARE_CACHE_KEY =
  'onestory:create-actor:prepare-cache';
const ACTOR_COLLECTION_PREPARE_CACHE_TTL_MS = 5 * 60 * 1000;

type ActorCollectionPrepareCacheEntry = {
  actorCollectionId: string;
  expiresAt: number;
};

type ActorCollectionPrepareCacheStore = Record<
  string,
  ActorCollectionPrepareCacheEntry
>;

export function buildActorCollectionPrepareCacheKey({
  assetId,
  name,
  bio,
  pricingMode,
  totalSupply,
  initialPriceUsdc,
}: {
  assetId: string;
  name: string;
  bio: string;
  pricingMode?: string;
  totalSupply?: number;
  initialPriceUsdc?: number;
}): string {
  return JSON.stringify({
    assetId: assetId.trim(),
    name: name.trim(),
    bio: bio.trim(),
    pricingMode,
    totalSupply,
    initialPriceUsdc,
  });
}

function readPrepareCacheStore(): ActorCollectionPrepareCacheStore {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(ACTOR_COLLECTION_PREPARE_CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed as ActorCollectionPrepareCacheStore;
  } catch {
    return {};
  }
}

function writePrepareCacheStore(store: ActorCollectionPrepareCacheStore) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      ACTOR_COLLECTION_PREPARE_CACHE_KEY,
      JSON.stringify(store),
    );
  } catch {
    // localStorage 不可用时降级为每次重新 prepare。
  }
}

export function getCachedActorCollectionId(
  cacheKey: string,
): string | undefined {
  const store = readPrepareCacheStore();
  const entry = store[cacheKey];

  if (!entry?.actorCollectionId) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    delete store[cacheKey];
    writePrepareCacheStore(store);
    return undefined;
  }

  return entry.actorCollectionId;
}

function resolvePrepareCacheExpiresAt(serverExpiresAt?: number): number {
  if (serverExpiresAt !== undefined && serverExpiresAt !== null) {
    // 后端 expiresAt 为秒级 Unix 时间戳；毫秒级则直接使用。
    return serverExpiresAt > 1_000_000_000_000
      ? serverExpiresAt
      : serverExpiresAt * 1000;
  }

  return Date.now() + ACTOR_COLLECTION_PREPARE_CACHE_TTL_MS;
}

export function setCachedActorCollectionId(
  cacheKey: string,
  actorCollectionId: string,
  serverExpiresAt?: number,
) {
  const store = readPrepareCacheStore();
  store[cacheKey] = {
    actorCollectionId,
    expiresAt: resolvePrepareCacheExpiresAt(serverExpiresAt),
  };
  writePrepareCacheStore(store);
}

export function removeCachedActorCollectionId(cacheKey: string) {
  const store = readPrepareCacheStore();
  if (!(cacheKey in store)) {
    return;
  }

  delete store[cacheKey];
  writePrepareCacheStore(store);
}
