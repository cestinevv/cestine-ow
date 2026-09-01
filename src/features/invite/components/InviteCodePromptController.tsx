import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { UserProfileResponse } from '@/api/__generated__/wallet/model/userProfileResponse';
import {
  getUserInfoQueryKey,
  useSkipInviteCode,
  useUserInfo,
} from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { getWalletUserContextQueryKey } from '@/lib/walletUserContext';
import useGlobalStore from '@/stores/global';

import { InviteCodeBindingDialog } from './InviteCodeBindingDialog';

export function InviteCodePromptController() {
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userId = useGlobalStore((state) => state.userProfile?.userId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 登录账号变化时刷新 queryKey
  const walletQueryKeyScope = useMemo(
    () => getWalletUserContextQueryKey(),
    [isLogin, userId],
  );
  const userInfoQuery = useUserInfo({
    query: {
      enabled: Boolean(isLogin && userId),
      retry: false,
      queryKey: [...getUserInfoQueryKey(), walletQueryKeyScope],
    },
  });
  const userProfile = unwrapOrvalPayload<UserProfileResponse>(
    userInfoQuery.data,
  );
  const { mutate: markInviteCodePromptShown } = useSkipInviteCode({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getUserInfoQueryKey(),
        });
      },
    },
  });
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const hasShownPromptRef = useRef(false);
  const hasMarkedPromptRef = useRef(false);

  useEffect(() => {
    if (
      !isLogin ||
      !userId ||
      !userInfoQuery.isSuccess ||
      userProfile?.inviterUserId ||
      userProfile?.skipInviteCode !== '0' ||
      hasShownPromptRef.current
    ) {
      return;
    }

    hasShownPromptRef.current = true;
    setIsPromptOpen(true);
  }, [
    isLogin,
    userId,
    userInfoQuery.isSuccess,
    userProfile?.inviterUserId,
    userProfile?.skipInviteCode,
  ]);

  useEffect(() => {
    if (!isPromptOpen || hasMarkedPromptRef.current) {
      return;
    }

    hasMarkedPromptRef.current = true;
    markInviteCodePromptShown();
  }, [isPromptOpen, markInviteCodePromptShown]);

  function handlePromptOpenChange(nextOpen: boolean) {
    setIsPromptOpen(nextOpen);
  }

  function handleBound() {
    setIsPromptOpen(false);
  }

  return (
    <InviteCodeBindingDialog
      open={isPromptOpen}
      onOpenChange={handlePromptOpenChange}
      onBound={handleBound}
      prompt
    />
  );
}
