import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  getProfileBlockedInteractionToastKey,
  type ProfileBlockedInteraction,
} from '@/features/profile/profileBlockRelations';
import {
  fetchProfileBlockRelation,
  getProfileBlockRelationQueryKey,
} from '@/features/profile/profileWalletApi';
import useGlobalStore from '@/stores/global';
import { readSnowflakeId } from '@/utils';

export function useProfileBlockInteractionGuard(targetUserId?: string) {
  const { t } = useTranslation();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const currentUserId = useGlobalStore((state) =>
    readSnowflakeId(state.userProfile?.userId),
  );
  const targetId = readSnowflakeId(targetUserId);
  const shouldQuery =
    isLogin &&
    targetId !== undefined &&
    currentUserId !== undefined &&
    targetId !== currentUserId;
  const blockRelationQueryKey = [
    ...getProfileBlockRelationQueryKey(targetId ?? ''),
    { isLogin },
  ] as const;

  const { data } = useQuery({
    queryKey: blockRelationQueryKey,
    queryFn: ({ signal }) =>
      fetchProfileBlockRelation(targetId ?? '', { signal }),
    enabled: shouldQuery,
    retry: false,
  });

  function guardBlockedInteraction(interaction: ProfileBlockedInteraction) {
    const toastKey = getProfileBlockedInteractionToastKey({
      relation: data?.relation,
      interaction,
    });

    if (!toastKey) {
      return true;
    }

    toast.error(t(toastKey));
    return false;
  }

  return {
    blockRelation: data?.relation,
    guardBlockedInteraction,
  };
}
