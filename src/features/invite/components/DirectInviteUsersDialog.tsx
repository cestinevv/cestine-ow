import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import {
  getInviteInfoQueryKey,
  getInviteRecordsQueryKey,
  inviteInfo,
  inviteRecords,
} from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
import { AppDialog } from '@/components/common/AppDialog';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber } from '@/utils';
import {
  getInviteRecordsNextPageParam,
  mergeInviteRecords,
  readPendingInviteCount,
  unwrapInviteInfo,
} from '../inviteFormat';
import { DirectInviteUserRow } from './DirectInviteUserRow';

type DirectInviteUsersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type InviteSummaryStatProps = {
  label: string;
  value?: string;
};

function formatInviteStatValue(value?: string) {
  if (value === undefined || value.trim() === '') {
    return '-';
  }

  return formatNumber(value, 0);
}

function InviteSummaryStat({ label, value }: InviteSummaryStatProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5',
        'rounded-xl bg-points-page-surface-muted px-4 py-2',
      )}
    >
      <p className="text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
        {label}
      </p>
      <p className="text-base leading-6 font-bold text-foreground">
        {formatInviteStatValue(value)}
      </p>
    </div>
  );
}

export function DirectInviteUsersDialog({
  open,
  onOpenChange,
}: DirectInviteUsersDialogProps) {
  const { t } = useTranslation();
  const { ref, inView } = useInView();

  const isLogin = useGlobalStore((state) => state.isLogin);
  const userProfileUserId = useGlobalStore(
    (state) => state.userProfile?.userId,
  );

  const inviteRecordsRequestParams = useMemo(
    () => ({ pageSize: DEFAULT_PAGE_SIZE }),
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录态变化时刷新 queryKey
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userProfileUserId],
  );

  const { data: inviteInfoResponse, isPending: isInviteInfoPending } = useQuery(
    {
      queryKey: [...getInviteInfoQueryKey(), walletQueryKeyScope] as const,
      queryFn: ({ signal }) => inviteInfo({ signal }),
      enabled: open && isLogin,
      retry: false,
    },
  );

  const {
    data: inviteRecordsPages,
    isPending: isInviteRecordsPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      ...getInviteRecordsQueryKey(inviteRecordsRequestParams),
      walletQueryKeyScope,
      'direct-invite-dialog',
    ] as const,
    queryFn: ({ pageParam, signal }) =>
      inviteRecords(
        {
          ...inviteRecordsRequestParams,
          mark: pageParam as number,
        },
        { signal },
      ),
    initialPageParam: 0,
    getNextPageParam: getInviteRecordsNextPageParam,
    enabled: open && isLogin,
    retry: false,
  });

  const inviteInfoData = unwrapInviteInfo(inviteInfoResponse);
  const totalInviteCount = inviteInfoData?.totalInviteCount;
  const validUserCount = inviteInfoData?.validUserCount;
  const pendingInviteCount = readPendingInviteCount(
    totalInviteCount,
    validUserCount,
  );

  const inviteRows = useMemo(
    () => mergeInviteRecords(inviteRecordsPages?.pages),
    [inviteRecordsPages?.pages],
  );

  const isListLoading = isInviteRecordsPending;

  useEffect(() => {
    if (open && inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [open, inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const dialogTitle = (
    <div className="flex flex-col gap-1">
      <span>{t('直接下级用户')}</span>
      <span className="text-xs font-normal leading-4 tracking-[0.04px] text-muted-foreground">
        {t('共 {{count}} 人', {
          count: formatInviteStatValue(totalInviteCount),
        })}
      </span>
    </div>
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      width={424}
      maxHeight="min(640px, 80dvh)"
    >
      <div className={cn('mt-1 flex flex-col gap-6')}>
        <div className="flex w-full gap-2">
          <InviteSummaryStat
            label={t('总人数')}
            value={
              isInviteInfoPending && totalInviteCount === undefined
                ? undefined
                : totalInviteCount
            }
          />
          <InviteSummaryStat
            label={t('有效用户')}
            value={
              isInviteInfoPending && validUserCount === undefined
                ? undefined
                : validUserCount
            }
          />
          <InviteSummaryStat
            label={t('待激活')}
            value={
              isInviteInfoPending && pendingInviteCount === undefined
                ? undefined
                : pendingInviteCount
            }
          />
        </div>

        <AppLoadingContainer
          data={isLogin && isListLoading ? null : inviteRows}
          emptyDescription={t('暂无记录')}
          minHeight={200}
        >
          <ul className="flex w-full flex-col">
            {inviteRows.map((record) => (
              <DirectInviteUserRow
                key={`direct-invite-${record.inviteeUserId ?? ''}-${record.bindAt ?? ''}-${record.createdAt ?? ''}`}
                record={record}
              />
            ))}
          </ul>
        </AppLoadingContainer>

        {isLogin && inviteRows.length > 0 ? (
          <div
            ref={ref}
            className={cn('flex w-full items-center justify-center py-2')}
          >
            {isFetchingNextPage ? (
              <Spinner className="size-5 text-muted-foreground" />
            ) : null}
          </div>
        ) : null}
      </div>
    </AppDialog>
  );
}
