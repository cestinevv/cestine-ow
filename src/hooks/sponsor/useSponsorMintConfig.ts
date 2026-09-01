import { useSignMessage, useWallets } from '@privy-io/react-auth/solana';
import { useMemo } from 'react';

import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useDepositConfig } from '@/hooks/useDepositConfig';
import { useConfigStore } from '@/stores/config';

/** 邮箱登录 NFT 铸造代付：init.deposit.api + spender 等与解锁/充值代付共用 */
export function useSponsorMintConfig() {
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();
  const { signMessage } = useSignMessage();
  const { wallets } = useWallets();
  const { depositConfig } = useDepositConfig();
  const { currentChain, initConfig } = useConfigStore();

  const sponsorUrl = useMemo(() => {
    return (
      initConfig?.deposit?.find((item) => item.chain === currentChain)?.api ||
      depositConfig?.api ||
      ''
    );
  }, [currentChain, depositConfig?.api, initConfig?.deposit]);

  const spenderAddress = depositConfig?.spenderAddress?.trim() ?? '';

  const solanaWallet = useMemo(() => {
    if (!solanaAddress) {
      return undefined;
    }

    return wallets.find((wallet) => wallet.address === solanaAddress);
  }, [solanaAddress, wallets]);

  const isReady = useMemo(() => {
    return (
      isEmbeddedLogin &&
      !!solanaAddress &&
      !!solanaWallet &&
      depositConfig?.chainType === 'svm' &&
      !!spenderAddress &&
      !!sponsorUrl &&
      !!depositConfig?.rpc &&
      !!depositConfig?.token.address
    );
  }, [
    depositConfig?.chainType,
    depositConfig?.rpc,
    depositConfig?.token.address,
    isEmbeddedLogin,
    solanaAddress,
    solanaWallet,
    spenderAddress,
    sponsorUrl,
  ]);

  return {
    isEmbeddedLogin,
    isReady,
    solanaAddress,
    solanaWallet,
    signMessage,
    depositConfig,
    sponsorUrl,
    spenderAddress,
  };
}
