import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { PageDtoActorCollectionResponse } from '@/api/__generated__/story/model/pageDtoActorCollectionResponse';
import IconNoData from '@/assets/svg/IconNoData';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getActorCursorNextPageParam } from '@/features/actor/actorFormat';
import { ActorPlazaCard } from '@/features/actor/components/ActorPlazaCard';
import {
  ACTOR_PLAZA_CARD_ROW_MIN_HEIGHT_PX,
  ACTOR_PLAZA_GRID_VIEW_CLASS,
  ACTOR_PLAZA_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/actor/constants/actorPlazaCardGrid';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { PROFILE_LIST_PAGE_SIZE } from '@/features/profile/profileFormat';
import {
  fetchProfileActorCollections,
  getProfileActorCollectionsQueryKey,
} from '@/features/profile/profileUserProfilesApi';
import { cn, readSnowflakeId } from '@/utils';

type ProfileActorIpTabPanelProps = {
  userId: string;
  enabled: boolean;
  isOwn?: boolean;
};

export function ProfileActorIpTabPanel({
  userId,
  enabled,
  isOwn = false,
}: ProfileActorIpTabPanelProps) {
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();

  const listParams = useMemo(() => ({ pageSize: PROFILE_LIST_PAGE_SIZE }), []);

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: getProfileActorCollectionsQueryKey(userId, listParams),
    queryFn: ({ pageParam }) =>
      fetchProfileActorCollections(userId, {
        pageSize: PROFILE_LIST_PAGE_SIZE,
        ...(typeof pageParam === 'string' ? { mark: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getActorCursorNextPageParam,
    retry: false,
    enabled: enabled && userId.length > 0,
  });

  const items = useMemo(() => {
    if (!data?.pages?.length) {
      return [] as ActorCollectionResponse[];
    }

    const out: ActorCollectionResponse[] = [];
    for (const page of data.pages) {
      const pageData = unwrapOrvalPayload<PageDtoActorCollectionResponse>(page);
      out.push(...(pageData?.list ?? []));
    }

    return out;
  }, [data?.pages]);

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 触发条件：签约成功
  // 行为目的：刷新个人中心角色 IP 列表缓存
  function handleMintSuccess() {
    return queryClient.invalidateQueries({
      queryKey: getProfileActorCollectionsQueryKey(userId),
    });
  }

  return (
    <AppLoadingContainer
      data={items}
      isLoading={isPending}
      isError={isError}
      // 与创作管理列表一致：加载 / 空态固定一行卡片高度
      minHeight={ACTOR_PLAZA_CARD_ROW_MIN_HEIGHT_PX}
      scrollable={false}
      stateClassName={isPending ? undefined : 'gap-6 rounded-xl bg-card px-10'}
      emptyContent={<ProfileActorIpEmptyState isOwn={isOwn} />}
    >
      <ul
        className={cn(
          ACTOR_PLAZA_GRID_VIEW_CLASS,
          ACTOR_PLAZA_GRID_VIEW_DESKTOP_CLASS,
        )}
      >
        {items.map((item) => (
          <li key={readSnowflakeId(item.id) ?? item.name} className="min-w-0">
            <ActorPlazaCard
              item={item}
              presentation="search"
              onMintSuccess={handleMintSuccess}
            />
          </li>
        ))}
      </ul>
      {hasNextPage ? (
        <div
          ref={ref}
          className={cn('flex justify-center py-6')}
          aria-hidden={!isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <Spinner className="size-6 text-muted-foreground" />
          ) : null}
        </div>
      ) : null}
    </AppLoadingContainer>
  );
}

function ProfileActorIpEmptyState({ isOwn }: { isOwn: boolean }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex w-52 max-w-full flex-col items-center gap-4">
        <IconNoData className="size-22 shrink-0" />
        <p className="min-w-full text-center text-sm leading-5 font-normal text-muted-foreground">
          {isOwn ? t('暂无内容，去发布角色IP吧～') : t('暂无相关内容')}
        </p>
      </div>
      {isOwn ? (
        <Button
          className={cn(
            'h-auto rounded-xl px-8 py-2.5 text-sm leading-5 font-normal',
            'bg-foreground text-background hover:bg-foreground/90 hover:text-background',
          )}
          render={<Link to="/narrator/create-actor" />}
        >
          {t('去发布')}
        </Button>
      ) : null}
    </>
  );
}
