import { useWallets as useEvmWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { useMemo } from 'react';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';

type WalletLinkedAccount = {
  address: string;
  chainType?: string;
  type?: string;
  walletClientType?: string;
  connectorType?: string;
};

export type DepositChainFamily = 'evm' | 'svm' | 'tron' | 'sui';

/**
 * 仅取 Privy 嵌入式钱包地址（与 Session Signer / webhook 监控口径一致）。
 * 禁止回退到外部 MetaMask / Phantom，避免充值地址与授权地址分叉。
 */
function getEmbeddedLinkedWalletAddress(
  linkedAccounts: readonly unknown[] | undefined,
  chainType: string,
) {
  const account = linkedAccounts?.find((item): item is WalletLinkedAccount => {
    if (
      !item ||
      typeof item !== 'object' ||
      !('type' in item) ||
      item.type !== 'wallet' ||
      !('chainType' in item) ||
      item.chainType !== chainType ||
      !('address' in item) ||
      typeof item.address !== 'string'
    ) {
      return false;
    }

    const walletClientType =
      'walletClientType' in item ? item.walletClientType : undefined;
    const connectorType =
      'connectorType' in item ? item.connectorType : undefined;

    // Tron / Sui 仅 Privy create；EVM / Solana 必须嵌入式，禁止外部登录地址
    if (chainType === 'tron' || chainType === 'sui') {
      return true;
    }

    return walletClientType === 'privy' || connectorType === 'embedded';
  });

  return account?.address;
}

/**
 * 充值收款地址单一事实来源（Privy 嵌入式四链）。
 * 邮箱登录与钱包登录口径一致：一律嵌入式托管地址。
 */
export function usePrivyDepositAddresses() {
  const { user } = useAppPrivyAccount();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const linkedAccounts = user?.linkedAccounts;

  const embeddedEvmAddress = useMemo(() => {
    const wallet = evmWallets.find((item) => item.walletClientType === 'privy');

    return wallet?.address;
  }, [evmWallets]);

  const embeddedSolanaAddress = useMemo(() => {
    const wallet = solanaWallets.find((item) => {
      const candidate = item as {
        walletClientType?: string;
        standardWallet?: { name?: string };
      };

      return (
        candidate.walletClientType === 'privy' ||
        candidate.standardWallet?.name === 'Privy'
      );
    });

    return wallet?.address;
  }, [solanaWallets]);

  const linkedEvmAddress = useMemo(() => {
    return getEmbeddedLinkedWalletAddress(linkedAccounts, 'ethereum');
  }, [linkedAccounts]);

  const linkedSolanaAddress = useMemo(() => {
    return getEmbeddedLinkedWalletAddress(linkedAccounts, 'solana');
  }, [linkedAccounts]);

  const linkedTronAddress = useMemo(() => {
    return getEmbeddedLinkedWalletAddress(linkedAccounts, 'tron');
  }, [linkedAccounts]);

  const linkedSuiAddress = useMemo(() => {
    return getEmbeddedLinkedWalletAddress(linkedAccounts, 'sui');
  }, [linkedAccounts]);

  // 只暴露嵌入式地址（hooks 优先，linked 嵌入式回退）
  const evmAddress = embeddedEvmAddress ?? linkedEvmAddress;
  const solanaAddress = embeddedSolanaAddress ?? linkedSolanaAddress;
  const tronAddress = linkedTronAddress;
  const suiAddress = linkedSuiAddress;

  return {
    evmAddress,
    solanaAddress,
    tronAddress,
    suiAddress,
    addresses: {
      evm: evmAddress,
      solana: solanaAddress,
      tron: tronAddress,
      sui: suiAddress,
    },
  };
}

type ResolveDepositTargetParams = {
  chainFamily: DepositChainFamily;
  embedded: {
    evm?: string;
    solana?: string;
    tron?: string;
    sui?: string;
  };
};

/**
 * 解析充值目标地址：一律 Privy 嵌入式四链地址（与 Logger / Session Signer / webhook 一致）
 */
export function resolveDepositTargetAddress({
  chainFamily,
  embedded,
}: ResolveDepositTargetParams): string {
  switch (chainFamily) {
    case 'evm':
      return embedded.evm || '';
    case 'svm':
      return embedded.solana || '';
    case 'tron':
      return embedded.tron || '';
    case 'sui':
      return embedded.sui || '';
    default:
      return '';
  }
}
