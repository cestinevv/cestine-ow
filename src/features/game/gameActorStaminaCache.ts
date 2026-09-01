import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import {
  getListAllActorsQueryKey,
  getListDeployedActorsQueryKey,
  listAllActors,
  type listAllActorsResponse,
  listDeployedActors,
  type listDeployedActorsResponse,
  type listRestActorsResponse,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { PageActorDTO } from '@/api/__generated__/mining/model/pageActorDTO';
import { DEFAULT_PAGE_SIZE_STRING } from '@/constants';
import {
  GAME_LIST_ALL_ACTORS_EXCLUDE_MAX_LEVEL,
  GAME_MY_ACTORS_MIXED_PAGE_KEY,
} from '@/features/game/constants/gameConstants';
import { isActorStaminaFull } from '@/features/game/constants/gameStamina';
import type { WalletUserContext } from '@/lib/walletUserContext';
import { readSnowflakeId } from '@/utils/snowflakeId';

export const ACTOR_STAMINA_SYNC_POLL_INTERVAL_MS = 2000;
export const ACTOR_STAMINA_SYNC_POLL_MAX_ATTEMPTS = 20;

const LIST_ALL_ACTORS_QUERY_PREFIX = '/api/mining/listAllActors' as const;
const LIST_REST_ACTORS_QUERY_PREFIX = '/api/mining/listRestActors' as const;

type PagedActorsCache<T extends object> = InfiniteData<T> | T;

/** appAxiosInstance 落盘到 React Query 的实际结构：{ data: BaseResponse<T>, status, headers } */
type CachedOrvalResponse<T> = {
  data?: { data?: T | null; code?: number; msg?: string; message?: string };
  status?: number;
  headers?: Headers;
};

function readCachedPayload<T>(response: unknown): T | null | undefined {
  const cached = response as CachedOrvalResponse<T> | undefined;
  return cached?.data?.data ?? undefined;
}

function patchCachedOrvalData<T>(
  response: CachedOrvalResponse<T> | undefined,
  patch: (data: T) => T,
): CachedOrvalResponse<T> | undefined {
  if (!response?.data) {
    return response;
  }

  const inner = response.data.data;
  if (inner === undefined || inner === null) {
    return response;
  }

  const patched = patch(inner);
  if (patched === inner) {
    return response;
  }

  return {
    ...response,
    data: {
      ...response.data,
      data: patched,
    },
  };
}

function asCachedResponse<T>(
  response: unknown,
): CachedOrvalResponse<T> | undefined {
  return response as CachedOrvalResponse<T> | undefined;
}

const syncingActorNftIds = new Set<string>();
const syncingListeners = new Set<() => void>();

const upgradeSyncingActorNftIds = new Set<string>();
const upgradeSyncingListeners = new Set<() => void>();

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

function emitSyncingChange() {
  for (const listener of syncingListeners) {
    listener();
  }
}

function emitUpgradeSyncingChange() {
  for (const listener of upgradeSyncingListeners) {
    listener();
  }
}

function normalizeActorNftId(actorNftId: string): string {
  return readSnowflakeId(actorNftId) ?? actorNftId.trim();
}

function matchesActorNftId(actor: ActorDTO, targetActorNftId: string): boolean {
  const target = normalizeActorNftId(targetActorNftId);
  const actorId =
    readSnowflakeId(actor.actorNftId) ?? actor.actorNftId?.trim() ?? '';

  return Boolean(target && actorId && target === actorId);
}

function patchActorInList(
  actors: ActorDTO[],
  actorNftId: string,
  stamina: number,
): ActorDTO[] {
  let changed = false;

  const next = actors.map((actor) => {
    if (!matchesActorNftId(actor, actorNftId)) {
      return actor;
    }

    changed = true;
    return { ...actor, stamina };
  });

  return changed ? next : actors;
}

function patchActorFieldsInList(
  actors: ActorDTO[],
  actorNftId: string,
  fields: Partial<ActorDTO>,
): ActorDTO[] {
  let changed = false;

  const next = actors.map((actor) => {
    if (!matchesActorNftId(actor, actorNftId)) {
      return actor;
    }

    changed = true;
    return { ...actor, ...fields };
  });

  return changed ? next : actors;
}

function patchAllActorsCachePages<T extends object>(
  old: PagedActorsCache<T> | undefined,
  patchRecords: (records: ActorDTO[]) => ActorDTO[],
): PagedActorsCache<T> | undefined {
  if (!old) {
    return old;
  }

  if ('pages' in old && Array.isArray(old.pages)) {
    let changed = false;
    const pages = old.pages.map((page) => {
      const patched = patchCachedOrvalData(
        asCachedResponse<PageActorDTO>(page),
        (pageData) => {
          const records = pageData.records ?? [];
          const nextRecords = patchRecords(records);

          if (nextRecords === records) {
            return pageData;
          }

          changed = true;
          return { ...pageData, records: nextRecords };
        },
      );

      return (patched ?? page) as T;
    });

    return changed ? { ...old, pages } : old;
  }

  return patchCachedOrvalData(
    asCachedResponse<PageActorDTO>(old),
    (pageData) => {
      const records = pageData.records ?? [];
      const nextRecords = patchRecords(records);

      if (nextRecords === records) {
        return pageData;
      }

      return { ...pageData, records: nextRecords };
    },
  ) as typeof old;
}

export function markActorStaminaSyncing(actorNftId: string) {
  syncingActorNftIds.add(normalizeActorNftId(actorNftId));
  emitSyncingChange();
}

export function clearActorStaminaSyncing(actorNftId: string) {
  syncingActorNftIds.delete(normalizeActorNftId(actorNftId));
  emitSyncingChange();
}

export function useIsActorStaminaSyncing(
  actorNftId: string | undefined,
): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      syncingListeners.add(onStoreChange);

      return () => {
        syncingListeners.delete(onStoreChange);
      };
    },
    () => {
      if (!actorNftId?.trim()) {
        return false;
      }

      return syncingActorNftIds.has(normalizeActorNftId(actorNftId));
    },
    () => false,
  );
}

export function patchActorStaminaInCache(
  queryClient: QueryClient,
  actorNftId: string,
  stamina: number,
) {
  queryClient.setQueryData<listDeployedActorsResponse>(
    getListDeployedActorsQueryKey(),
    (old) =>
      patchCachedOrvalData(asCachedResponse<ActorDTO[]>(old), (actors) =>
        patchActorInList(actors, actorNftId, stamina),
      ) as listDeployedActorsResponse | undefined,
  );

  queryClient.setQueriesData<PagedActorsCache<listAllActorsResponse>>(
    { queryKey: [LIST_ALL_ACTORS_QUERY_PREFIX] },
    (old) =>
      patchAllActorsCachePages(old, (records) =>
        patchActorInList(records, actorNftId, stamina),
      ),
  );

  // 候场候选列表走 listRestActors，补充后立刻同步体力与「已满」态
  queryClient.setQueriesData<PagedActorsCache<listRestActorsResponse>>(
    { queryKey: [LIST_REST_ACTORS_QUERY_PREFIX] },
    (old) =>
      patchAllActorsCachePages(old, (records) =>
        patchActorInList(records, actorNftId, stamina),
      ),
  );
}

function readActorStaminaFromDeployedCache(
  queryClient: QueryClient,
  actorNftId: string,
): number | undefined {
  const deployed = queryClient.getQueryData<listDeployedActorsResponse>(
    getListDeployedActorsQueryKey(),
  );
  const actors = readCachedPayload<ActorDTO[]>(deployed) ?? [];
  const actor = actors.find((item) => matchesActorNftId(item, actorNftId));

  return actor?.stamina;
}

function readActorStaminaFromPagedCache(
  queryClient: QueryClient,
  queryKeyPrefix: string,
  actorNftId: string,
): number | undefined {
  const queries = queryClient.getQueriesData<
    PagedActorsCache<listAllActorsResponse | listRestActorsResponse>
  >({
    queryKey: [queryKeyPrefix],
  });

  for (const [, data] of queries) {
    if (!data) {
      continue;
    }

    if ('pages' in data && Array.isArray(data.pages)) {
      for (const page of data.pages) {
        const pageData = readCachedPayload<PageActorDTO>(page);
        const actor = pageData?.records?.find((item) =>
          matchesActorNftId(item, actorNftId),
        );

        if (actor?.stamina !== undefined) {
          return actor.stamina;
        }
      }

      continue;
    }

    const pageData = readCachedPayload<PageActorDTO>(data);
    const actor = pageData?.records?.find((item) =>
      matchesActorNftId(item, actorNftId),
    );

    if (actor?.stamina !== undefined) {
      return actor.stamina;
    }
  }

  return undefined;
}

export function findActorStaminaInCache(
  queryClient: QueryClient,
  actorNftId: string,
): number | undefined {
  return (
    readActorStaminaFromDeployedCache(queryClient, actorNftId) ??
    readActorStaminaFromPagedCache(
      queryClient,
      LIST_REST_ACTORS_QUERY_PREFIX,
      actorNftId,
    ) ??
    readActorStaminaFromPagedCache(
      queryClient,
      LIST_ALL_ACTORS_QUERY_PREFIX,
      actorNftId,
    )
  );
}

export function isActorStaminaReplenishSynced(
  stamina: number | undefined,
  params: {
    beforeStamina?: number;
    afterStamina?: number;
    staminaLimit?: number;
  },
): boolean {
  if (stamina === undefined) {
    return false;
  }

  const { beforeStamina, afterStamina, staminaLimit } = params;

  if (afterStamina !== undefined && stamina >= afterStamina) {
    return true;
  }

  if (isActorStaminaFull(stamina, staminaLimit)) {
    return true;
  }

  if (beforeStamina !== undefined && stamina > beforeStamina) {
    return true;
  }

  return false;
}

async function refetchActorListCaches(queryClient: QueryClient) {
  await Promise.all([
    queryClient.fetchQuery({
      queryKey: getListDeployedActorsQueryKey(),
      queryFn: () => listDeployedActors(),
    }),
    queryClient.refetchQueries({
      queryKey: [LIST_ALL_ACTORS_QUERY_PREFIX],
    }),
    queryClient.refetchQueries({
      queryKey: [LIST_REST_ACTORS_QUERY_PREFIX],
    }),
  ]);
}

export type PollActorStaminaSyncedParams = {
  actorNftId: string;
  beforeStamina?: number;
  afterStamina?: number;
  staminaLimit?: number;
};

export type PollActorStaminaSyncedResult = 'synced' | 'timeout';

export async function pollActorStaminaSynced(
  queryClient: QueryClient,
  params: PollActorStaminaSyncedParams,
): Promise<PollActorStaminaSyncedResult> {
  const { actorNftId, beforeStamina, afterStamina, staminaLimit } = params;

  try {
    for (
      let attempt = 0;
      attempt < ACTOR_STAMINA_SYNC_POLL_MAX_ATTEMPTS;
      attempt += 1
    ) {
      await refetchActorListCaches(queryClient);

      const stamina = findActorStaminaInCache(queryClient, actorNftId);

      if (
        isActorStaminaReplenishSynced(stamina, {
          beforeStamina,
          afterStamina,
          staminaLimit,
        })
      ) {
        if (stamina !== undefined) {
          patchActorStaminaInCache(queryClient, actorNftId, stamina);
        }

        return 'synced';
      }

      if (attempt < ACTOR_STAMINA_SYNC_POLL_MAX_ATTEMPTS - 1) {
        await sleep(ACTOR_STAMINA_SYNC_POLL_INTERVAL_MS);
      }
    }

    return 'timeout';
  } finally {
    clearActorStaminaSyncing(actorNftId);
  }
}

export function markActorUpgradeSyncing(actorNftId: string) {
  upgradeSyncingActorNftIds.add(normalizeActorNftId(actorNftId));
  emitUpgradeSyncingChange();
}

export function clearActorUpgradeSyncing(actorNftId: string) {
  upgradeSyncingActorNftIds.delete(normalizeActorNftId(actorNftId));
  emitUpgradeSyncingChange();
}

export function useIsActorUpgradeSyncing(
  actorNftId: string | undefined,
): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      upgradeSyncingListeners.add(onStoreChange);

      return () => {
        upgradeSyncingListeners.delete(onStoreChange);
      };
    },
    () => {
      if (!actorNftId?.trim()) {
        return false;
      }

      return upgradeSyncingActorNftIds.has(normalizeActorNftId(actorNftId));
    },
    () => false,
  );
}

export function patchActorFieldsInAllActorsCache(
  queryClient: QueryClient,
  actorNftId: string,
  fields: Partial<ActorDTO>,
) {
  queryClient.setQueriesData<
    InfiniteData<listAllActorsResponse> | listAllActorsResponse
  >({ queryKey: [LIST_ALL_ACTORS_QUERY_PREFIX] }, (old) =>
    patchAllActorsCachePages(old, (records) =>
      patchActorFieldsInList(records, actorNftId, fields),
    ),
  );
}

export function findActorInAllActorsCache(
  queryClient: QueryClient,
  actorNftId: string,
): ActorDTO | undefined {
  const queries = queryClient.getQueriesData<
    InfiniteData<listAllActorsResponse> | listAllActorsResponse
  >({ queryKey: [LIST_ALL_ACTORS_QUERY_PREFIX] });

  for (const [, data] of queries) {
    if (!data) {
      continue;
    }

    if ('pages' in data && Array.isArray(data.pages)) {
      for (const page of data.pages) {
        const pageData = readCachedPayload<PageActorDTO>(page);
        const actor = pageData?.records?.find((item) =>
          matchesActorNftId(item, actorNftId),
        );

        if (actor) {
          return actor;
        }
      }

      continue;
    }

    const pageData = readCachedPayload<PageActorDTO>(data);
    const actor = pageData?.records?.find((item) =>
      matchesActorNftId(item, actorNftId),
    );

    if (actor) {
      return actor;
    }
  }

  return undefined;
}

export function isActorUpgradeSynced(
  level: number | undefined,
  params: { fromLevel?: number; toLevel?: number },
): boolean {
  if (level === undefined || params.toLevel === undefined) {
    return false;
  }

  if (level >= params.toLevel) {
    return true;
  }

  if (params.fromLevel !== undefined && level > params.fromLevel) {
    return true;
  }

  return false;
}

async function refetchAllActorsListCache(queryClient: QueryClient) {
  await queryClient.refetchQueries({
    queryKey: [LIST_ALL_ACTORS_QUERY_PREFIX],
  });
}

export type GameListAllActorsPollContext = {
  sort: string;
  walletQueryKeyScope: Pick<WalletUserContext, 'userId' | 'token'>;
};

function buildListAllActorsInfiniteQueryKey(
  listContext: GameListAllActorsPollContext,
) {
  return [
    ...getListAllActorsQueryKey({
      sort: listContext.sort,
      excludeMaxLevel: GAME_LIST_ALL_ACTORS_EXCLUDE_MAX_LEVEL,
    }),
    ...GAME_MY_ACTORS_MIXED_PAGE_KEY,
    listContext.walletQueryKeyScope,
  ] as const;
}

async function fetchListAllActorsFirstPage(
  listContext: GameListAllActorsPollContext,
): Promise<listAllActorsResponse> {
  return listAllActors({
    sort: listContext.sort,
    excludeMaxLevel: GAME_LIST_ALL_ACTORS_EXCLUDE_MAX_LEVEL,
    pageSize: DEFAULT_PAGE_SIZE_STRING,
    pageNum: '1',
  });
}

function resetListAllActorsInfiniteToFirstPage(
  queryClient: QueryClient,
  listContext: GameListAllActorsPollContext,
  pageOneResponse: listAllActorsResponse,
) {
  queryClient.setQueryData<InfiniteData<listAllActorsResponse>>(
    buildListAllActorsInfiniteQueryKey(listContext),
    {
      pages: [pageOneResponse],
      pageParams: ['1'],
    },
  );
}

export type PollActorUpgradeSyncedParams = {
  actorNftId: string;
  fromLevel?: number;
  toLevel?: number;
  listContext: GameListAllActorsPollContext;
};

export type PollActorUpgradeSyncedResult = 'synced' | 'timeout';

export async function pollActorUpgradeSynced(
  queryClient: QueryClient,
  params: PollActorUpgradeSyncedParams,
): Promise<PollActorUpgradeSyncedResult> {
  const { actorNftId, fromLevel, toLevel, listContext } = params;

  try {
    for (
      let attempt = 0;
      attempt < ACTOR_STAMINA_SYNC_POLL_MAX_ATTEMPTS;
      attempt += 1
    ) {
      await refetchAllActorsListCache(queryClient);

      const actor = findActorInAllActorsCache(queryClient, actorNftId);

      if (isActorUpgradeSynced(actor?.level, { fromLevel, toLevel })) {
        const pageOne = await fetchListAllActorsFirstPage(listContext);
        resetListAllActorsInfiniteToFirstPage(
          queryClient,
          listContext,
          pageOne,
        );

        return 'synced';
      }

      if (attempt < ACTOR_STAMINA_SYNC_POLL_MAX_ATTEMPTS - 1) {
        await sleep(ACTOR_STAMINA_SYNC_POLL_INTERVAL_MS);
      }
    }

    return 'timeout';
  } finally {
    clearActorUpgradeSyncing(actorNftId);
  }
}
