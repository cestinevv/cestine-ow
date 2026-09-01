import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import {
  getListAllActorsQueryKey,
  listAllActors,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { PageActorDTO } from '@/api/__generated__/mining/model/pageActorDTO';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { FilterTabs } from '@/components/common/Tabs';
import { Spinner } from '@/components/ui/spinner';
import {
  GAME_ACTOR_SORT_OPTIONS,
  GAME_LIST_ALL_ACTORS_EXCLUDE_MAX_LEVEL,
  GAME_MY_ACTORS_MIXED_PAGE_KEY,
  type GameActorSort,
  getGameMyActorsPageSize,
} from '@/features/game/constants/gameConstants';
import type { GameListAllActorsPollContext } from '@/features/game/gameActorStaminaCache';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import {
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/play/playFormat';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

import { GameMyActorCard } from './GameMyActorCard';

function getGameActorsNextPageParam(
  lastPage: Awaited<ReturnType<typeof listAllActors>>,
): string | undefined {
  const pageData = unwrapOrvalPayload<PageActorDTO>(lastPage);
  if (pageData?.pageNumber === undefined || pageData.totalPage === undefined) {
    return undefined;
  }

  if (pageData.pageNumber >= pageData.totalPage) {
    return undefined;
  }

  return String(pageData.pageNumber + 1);
}

export function GameMyActorsSection() {
  const { t } = useTranslation();
  const { ref, inView } = useInView();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );

  const [sort, setSort] = useState<GameActorSort>('COMPUTING_POWER');

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey，勿写入请求 params
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
  );

  const listParams = useMemo(
    () => ({
      sort,
      excludeMaxLevel: GAME_LIST_ALL_ACTORS_EXCLUDE_MAX_LEVEL,
    }),
    [sort],
  );

  const upgradeListContext = useMemo<GameListAllActorsPollContext>(
    () => ({
      sort,
      walletQueryKeyScope,
    }),
    [sort, walletQueryKeyScope],
  );

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      ...getListAllActorsQueryKey(listParams),
      ...GAME_MY_ACTORS_MIXED_PAGE_KEY,
      walletQueryKeyScope,
    ] as const,
    queryFn: ({ pageParam }) =>
      listAllActors({
        ...listParams,
        pageSize: getGameMyActorsPageSize(pageParam as string),
        pageNum: pageParam as string,
      }),
    initialPageParam: '1',
    getNextPageParam: getGameActorsNextPageParam,
    enabled: isLogin,
    retry: false,
  });

  const actorRows = useMemo(() => {
    if (!data?.pages?.length) {
      return [];
    }

    const seenActorNftIds = new Set<string>();
    const rows: ActorDTO[] = [];

    for (const page of data.pages) {
      const pageData = unwrapOrvalPayload<PageActorDTO>(page);
      const records = pageData?.records ?? [];
      for (const record of records) {
        const actorNftId =
          readSnowflakeId(record.actorNftId) ?? record.actorNftId?.trim();

        if (actorNftId) {
          if (seenActorNftIds.has(actorNftId)) {
            continue;
          }

          seenActorNftIds.add(actorNftId);
        }

        rows.push(record);
      }
    }

    return rows;
  }, [data?.pages]);

  const totalRow = useMemo(() => {
    const firstPage = data?.pages?.[0];
    if (!firstPage) {
      return undefined;
    }

    return unwrapOrvalPayload<PageActorDTO>(firstPage)?.totalRow;
  }, [data?.pages]);

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

  const handleSortChange = (value: string) => {
    setSort(value as GameActorSort);
  };

  return (
    <section className="flex w-full flex-col gap-4 md:gap-6">
      <header className="flex items-baseline gap-2">
        <h2 className="text-base leading-6 font-bold tracking-[-0.08px] text-foreground md:text-xl md:leading-7">
          {t('我的角色')}
        </h2>
        {totalRow !== undefined ? (
          <span className="text-sm leading-5 text-muted-foreground">
            {`（${totalRow}）`}
          </span>
        ) : null}
      </header>

      <FilterTabs
        items={GAME_ACTOR_SORT_OPTIONS}
        value={sort}
        onValueChange={handleSortChange}
        t={t}
      />

      <AppLoadingContainer
        data={actorRows}
        isLoading={isPending}
        isError={isError}
        minHeight={280}
        scrollable={false}
      >
        <ul
          className={cn(
            PLAY_THEATER_GRID_VIEW_CLASS,
            PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
          )}
        >
          {actorRows.map((actor) => {
            const rowKey =
              readSnowflakeId(actor.actorNftId) ??
              actor.actorNftId?.trim() ??
              actor.actorName ??
              'actor';

            return (
              <li key={rowKey}>
                <GameMyActorCard
                  actor={actor}
                  upgradeListContext={upgradeListContext}
                />
              </li>
            );
          })}
        </ul>
      </AppLoadingContainer>

      {hasNextPage ? (
        <div
          ref={ref}
          className="flex min-h-12 w-full items-center justify-center"
        >
          {isFetchingNextPage ? <Spinner className="size-6" /> : null}
        </div>
      ) : null}
    </section>
  );
}
