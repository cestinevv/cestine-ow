import store2 from 'store2';

import useGlobalStore from '@/stores/global';

export type WalletUserContext = {
  token?: string;
  userId?: number;
  nickname?: string;
  email?: string;
  avatar?: string;
};

/**
 * 从本地 token / 资料组装用户上下文。
 * 鉴权由 `appRequest` 拦截器注入 `Authorization`；勿将此对象传入 Orval 查询 params。
 */
export function getWalletUserContext(): WalletUserContext {
  const token = store2.get('userToken');
  const profile = useGlobalStore.getState().userProfile;

  const ctx: WalletUserContext = {};

  if (typeof token === 'string' && token) {
    ctx.token = token;
  }

  if (profile?.userId != null) {
    ctx.userId =
      typeof profile.userId === 'number'
        ? profile.userId
        : Number(profile.userId);
  }

  if (typeof profile?.nickname === 'string' && profile.nickname) {
    ctx.nickname = profile.nickname;
  }

  if (typeof profile?.email === 'string' && profile.email) {
    ctx.email = profile.email;
  }

  if (typeof profile?.avatarUrl === 'string' && profile.avatarUrl) {
    ctx.avatar = profile.avatarUrl;
  }

  return ctx;
}

/** 仅用于 React Query `queryKey`，随登录态变化使缓存失效 */
export function getWalletUserContextQueryKey(): Pick<
  WalletUserContext,
  'userId' | 'token'
> {
  const { userId, token } = getWalletUserContext();
  return { userId, token };
}
