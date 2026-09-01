import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import type { ActorCastDramasParams } from '@/api/__generated__/story/model/actorCastDramasParams';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import type { PageDtoDramaListItemResponse } from '@/api/__generated__/story/model/pageDtoDramaListItemResponse';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import IconNoData from '@/assets/svg/IconNoData';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { ContentContainer } from '@/components/common/ContentContainer';
import {
  profileContentTabsListClassName,
  profileContentTabsWrapperClassName,
  profileContentTabTriggerClassName,
} from '@/components/common/Tabs';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import {
  getActorCastDramasCursorNextPageParam,
  parseActorId,
  unwrapOrvalPayload,
} from '@/features/actor/actorFormat';
import {
  getActorPublicCastDramas,
  getActorPublicCastDramasQueryKey,
  getActorPublicDetail,
  getActorPublicDetailQueryKey,
} from '@/features/actor/actorPublicApi';
import { ActorCastDramaCard } from '@/features/actor/components/ActorCastDramaCard';
import { ActorDetailHero } from '@/features/actor/components/ActorDetailHero';
import { ActorDetailIssueSection } from '@/features/actor/components/ActorDetailIssueSection';
import {
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/play/playFormat';
import { cn, withAcceptLanguageQueryKey } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

type ActorDetailViewProps = {
  actorId: string;
};

const ACTOR_DETAIL_TABS = [
  { value: 'cast', labelKey: '参演' },
  { value: 'info', labelKey: '信息' },
] as const;

function ActorDetailMobileHeader({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 w-full bg-background pt-[env(safe-area-inset-top)] md:hidden">
      <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="-ml-2 size-10 rounded-full text-foreground hover:bg-transparent"
          aria-label={t('返回')}
        >
          <IconChevronLeft className="size-6" />
        </Button>
        <h1 className="text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
          {t('演员主页')}
        </h1>
        <div aria-hidden />
      </div>
    </header>
  );
}

function ActorCastEmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex w-[208px] flex-col items-center">
      <IconNoData className="size-[88px] shrink-0" />
      <p className="w-full text-center text-sm leading-5 text-muted-foreground">
        {t('暂无相关内容')}
      </p>
    </div>
  );
}

export function ActorDetailView({ actorId }: ActorDetailViewProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { ref, inView } = useInView();
  const [activeTab, setActiveTab] =
    useState<(typeof ACTOR_DETAIL_TABS)[number]['value']>('cast');

  const actorIdText = parseActorId(actorId);

  const {
    data: detailResponse,
    isPending: isDetailPending,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: getActorPublicDetailQueryKey(actorId),
    queryFn: ({ signal }) => getActorPublicDetail(actorId, { signal }),
    enabled: actorIdText !== undefined,
    retry: false,
  });

  const castListParams = useMemo(() => ({ pageSize: DEFAULT_PAGE_SIZE }), []);

  const {
    data: castPages,
    isPending: isCastPending,
    isFetching: isCastFetching,
    isError: isCastError,
    refetch: refetchCast,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: withAcceptLanguageQueryKey(
      getActorPublicCastDramasQueryKey(actorId, castListParams),
      i18n.language,
    ),
    queryFn: ({ pageParam }) =>
      getActorPublicCastDramas(actorId, {
        ...castListParams,
        ...(pageParam !== undefined
          ? {
              mark: pageParam as unknown as ActorCastDramasParams['mark'],
            }
          : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getActorCastDramasCursorNextPageParam,
    enabled: actorIdText !== undefined,
    retry: false,
  });

  const detail = unwrapOrvalPayload<ActorCollectionResponse>(detailResponse);

  const castItems = useMemo(() => {
    if (!castPages?.pages?.length) {
      return [];
    }

    const out: DramaListItemResponse[] = [];
    for (const page of castPages.pages) {
      const pageData = unwrapOrvalPayload<PageDtoDramaListItemResponse>(page);
      const list = pageData?.list ?? [];
      for (const item of list) {
        out.push(item);
      }
    }
    return out;
  }, [castPages?.pages]);

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage) {
      return;
    }
    void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 详情与参演列表同时失败时，提供整页重试入口。
  const handleRetryAll = () => {
    void refetchDetail();
    void refetchCast();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    void navigate({ to: '/actor' });
  };

  const isCastListLoading =
    !isCastError && castItems.length === 0 && (isCastPending || isCastFetching);
  const isPageLoading = isDetailPending || isCastListLoading;

  if (actorIdText === undefined) {
    return null;
  }

  if (isDetailError && !detail) {
    return (
      <article
        className={cn(
          'flex min-h-0 w-full min-w-0 flex-1 flex-col',
          'bg-points-page-surface-muted',
        )}
      >
        <ActorDetailMobileHeader onBack={handleBack} />
        <ContentContainer
          className={cn('flex flex-col items-center gap-4 py-12')}
        >
          <p className={cn('text-sm text-muted-foreground')}>{t('加载失败')}</p>
          <Button type="button" variant="outline" onClick={handleRetryAll}>
            {t('再试一次')}
          </Button>
        </ContentContainer>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-points-page-surface-muted',
      )}
    >
      <ActorDetailMobileHeader onBack={handleBack} />
      <AppLoadingContainer
        data={!isPageLoading && detail ? [detail] : []}
        isLoading={isPageLoading}
        minHeight="calc(100dvh - 60px)"
      >
        {detail ? (
          <>
            <ActorDetailHero detail={detail} />

            <main className={cn('flex min-h-0 w-full min-w-0 flex-1 flex-col')}>
              <div
                className={cn(
                  'mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col px-4 pt-0 pb-24',
                  'md:px-4 md:py-4',
                )}
              >
                <Tabs
                  value={activeTab}
                  onValueChange={(value) =>
                    setActiveTab(value as typeof activeTab)
                  }
                  className="flex min-h-0 flex-1 flex-col gap-0"
                >
                  <div className={profileContentTabsWrapperClassName}>
                    <TabsList
                      variant="line"
                      className={cn(
                        profileContentTabsListClassName,
                        'h-[42px] pt-2.5',
                      )}
                    >
                      {ACTOR_DETAIL_TABS.map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className={profileContentTabTriggerClassName}
                        >
                          {t(tab.labelKey)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <TabsContent value="cast" className="mt-0 pt-4">
                    {isCastError ? (
                      <div
                        className={cn('flex flex-col items-center gap-4 py-8')}
                      >
                        <p className={cn('text-sm text-muted-foreground')}>
                          {t('加载失败')}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => refetchCast()}
                        >
                          {t('再试一次')}
                        </Button>
                      </div>
                    ) : (
                      <AppLoadingContainer
                        data={castItems}
                        isLoading={isCastListLoading}
                        minHeight="22rem"
                        maxHeight="none"
                        stateClassName="rounded-xl bg-background px-10 py-24 md:py-[180px]"
                        emptyContent={<ActorCastEmptyState />}
                      >
                        <ul
                          className={cn(
                            PLAY_THEATER_GRID_VIEW_CLASS,
                            PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
                          )}
                        >
                          {castItems.map((item) => (
                            <li
                              key={
                                readSnowflakeId(item.dramaId) ??
                                item.dramaTitle ??
                                item.dramaCoverUrl
                              }
                            >
                              <ActorCastDramaCard item={item} />
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
                    )}
                  </TabsContent>

                  <TabsContent value="info" className="mt-0 pt-4">
                    <ActorDetailIssueSection detail={detail} />
                  </TabsContent>
                </Tabs>
              </div>
            </main>
          </>
        ) : null}
      </AppLoadingContainer>
    </article>
  );
}
