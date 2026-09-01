import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useMemo } from 'react';

type WalletLinkedAccount = {
  address: string;
  chainType: 'solana';
  connectorType: string;
};

const isWalletLinkedAccount = (
  account: unknown,
): account is WalletLinkedAccount => {
  if (!account || typeof account !== 'object') {
    return false;
  }

  if (!('address' in account) || typeof account.address !== 'string') {
    return false;
  }

  if (!('chainType' in account) || account.chainType !== 'solana') {
    return false;
  }

  return (
    'connectorType' in account && typeof account.connectorType === 'string'
  );
};

/**
 * Privy 账户管理 Hook
 * 用于管理 Privy 用户状态、区分登录方式、获取 Solana 钱包地址
 */
export function useAppPrivyAccount() {
  const { ready, authenticated, user, logout } = usePrivy();
  type LinkedAccount = NonNullable<
    NonNullable<typeof user>['linkedAccounts']
  >[number];

  // 判断是否为嵌入式登录（邮箱登录）
  const isEmbeddedLogin = useMemo(() => {
    const emailAccount = user?.linkedAccounts?.find((f) => f.type === 'email');
    const result = !!emailAccount;

    return result;
  }, [user]);

  // 登录类型：email | wallet
  const loginType: 'email' | 'wallet' | undefined = useMemo(() => {
    if (!ready || !authenticated || !user) {
      return undefined;
    }

    const hasEmail = user.linkedAccounts?.some((a) => a.type === 'email');
    const hasEmbeddedWallet = user.linkedAccounts?.some(
      (a) =>
        a.type === 'wallet' &&
        'walletClientType' in a &&
        a.walletClientType === 'privy' &&
        'connectorType' in a &&
        a.connectorType === 'embedded',
    );

    const type = hasEmail && hasEmbeddedWallet ? 'email' : 'wallet';

    return type;
  }, [user, ready, authenticated]);

  // 获取 Solana 账户（优先嵌入式钱包）
  const solanaAccount = useMemo(() => {
    if (!user) return null;

    const embeddedAccount = user.linkedAccounts?.find(
      (f: LinkedAccount) =>
        'chainType' in f &&
        f.chainType === 'solana' &&
        'connectorType' in f &&
        f.connectorType === 'embedded' &&
        'walletIndex' in f &&
        f.walletIndex === 0,
    );

    const connectedSolAccount = user.linkedAccounts?.find(
      (f: LinkedAccount) =>
        'chainType' in f &&
        f.chainType === 'solana' &&
        'connectorType' in f &&
        f.connectorType === 'solana_adapter' &&
        (!('walletIndex' in f) || f.walletIndex === undefined),
    );

    const account =
      loginType === 'email'
        ? embeddedAccount
        : connectedSolAccount || embeddedAccount;

    return account;
  }, [user, loginType]);

  // Solana 地址
  const solanaAddress = useMemo(() => {
    return isWalletLinkedAccount(solanaAccount)
      ? solanaAccount.address
      : undefined;
  }, [solanaAccount]);

  // 当前钱包直连的 Solana 钱包
  const connectedWallet = useMemo(() => {
    if (
      isWalletLinkedAccount(solanaAccount) &&
      solanaAccount.connectorType === 'solana_adapter'
    ) {
      return solanaAccount;
    }
    return null;
  }, [solanaAccount]);

  // 钱包直连的链类型（仅 Solana）
  const connectedChainType: 'solana' | '' = useMemo(() => {
    if (connectedWallet) {
      return 'solana';
    }
    return '';
  }, [connectedWallet]);

  // 同步 Privy Token
  const syncPrivyToken = useCallback(async () => {
    try {
      const token = localStorage.getItem('privy:token');
      const parsedToken = token ? JSON.parse(token) : '';

      return parsedToken;
    } catch {
      return '';
    }
  }, []);

  // 获取 Privy Token
  const getPrivyToken = useCallback(() => {
    try {
      const token = localStorage.getItem('privy:token');
      return token ? JSON.parse(token) : '';
    } catch {
      return '';
    }
  }, []);

  // 计算是否准备就绪（以 Solana 地址为准）
  const isReady = useMemo(() => {
    const result = ready && authenticated && !!user && !!solanaAddress;

    return result;
  }, [ready, authenticated, user, solanaAddress]);

  return {
    ready,
    authenticated,
    user,
    solanaAddress,
    solanaAccount,
    isEmbeddedLogin,
    loginType,
    connectedWallet,
    connectedChainType,
    isReady,
    logout,
    syncPrivyToken,
    getPrivyToken,
  };
}
