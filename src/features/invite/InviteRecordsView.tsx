import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import {
  getInviteRecordsQueryKey,
  inviteRecords,
} from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { ContentContainer } from '@/components/common/ContentContainer';
import { SubPageBackHeader } from '@/components/common/SubPageBackHeader';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';
import { InviteRecordRow } from './components/InviteRecordRow';
import {
  getInviteRecordsNextPageParam,
  mergeInviteRecords,
} from './inviteFormat';

export function InviteRecordsView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ref, inView } = useInView();

  const isLogin = useGlobalStore((s) => s.isLogin);
  const userProfileUserId = useGlobalStore((s) => s.userProfile?.userId);

  const inviteRecordsRequestParams = useMemo(
    () => ({ pageSize: DEFAULT_PAGE_SIZE }),
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey，勿写入请求 params
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
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
      ...getInviteRecordsQueryKey(inviteRecordsRequestParams),
      walletQueryKeyScope,
    ] as const,
    queryFn: ({ pageParam }) =>
      inviteRecords({
        ...inviteRecordsRequestParams,
        mark: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: getInviteRecordsNextPageParam,
    retry: false,
    enabled: isLogin,
  });

  const rows = useMemo(() => mergeInviteRecords(data?.pages), [data?.pages]);

  const isLoading = isPending;

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 子页点击返回时回到邀请首页。
  const handleBackToInvite = () => {
    void navigate({ to: '/invite' });
  };

  return (
    <div
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-points-page-surface-muted',
      )}
    >
      <ContentContainer className={cn('flex w-full flex-col')}>
        <SubPageBackHeader
          titleKey="邀请记录"
          onBackClick={handleBackToInvite}
        />
        <section
          className={cn(
            'flex w-full flex-col gap-8 overflow-hidden rounded-3xl bg-card px-5 pt-8 pb-4 md:px-8',
          )}
        >
          {isError ? (
            <ul className="flex w-full flex-col">
              <li
                className={cn(
                  'px-4 py-10 text-center text-sm leading-5 text-destructive',
                )}
              >
                {t('加载失败')}
              </li>
            </ul>
          ) : (
            <AppLoadingContainer
              data={isLogin && isLoading ? null : rows}
              emptyDescription={t('暂无记录')}
              minHeight={280}
            >
              <ul className="flex w-full flex-col">
                {rows.map((record, index) => (
                  <InviteRecordRow
                    key={`invite-${record.inviteeUserId ?? ''}-${record.bindAt ?? ''}-${record.createdAt ?? ''}`}
                    record={record}
                    isLast={index === rows.length - 1 && !hasNextPage}
                  />
                ))}
              </ul>
            </AppLoadingContainer>
          )}

          {isLogin && !isError && rows.length > 0 ? (
            <div
              ref={ref}
              className={cn('flex w-full items-center justify-center py-3')}
            >
              {isFetchingNextPage ? (
                <Spinner className="size-5 text-muted-foreground" />
              ) : null}
            </div>
          ) : null}
        </section>
      </ContentContainer>
    </div>
  );
}
