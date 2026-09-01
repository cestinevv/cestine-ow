import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppDialog } from '@/components/common/AppDialog';
import { DepositOffline } from '@/components/deposit/DepositOffline';
import { DepositPrivyAddSessionSigners } from '@/components/deposit/DepositPrivyAddSessionSigners';
import {
  getChainsForToken,
  getDefaultTransferSelection,
  getTokensForChain,
  resolveDepositPair,
  useDepositConfig,
} from '@/hooks/useDepositConfig';
import {
  resolveDepositTargetAddress,
  usePrivyDepositAddresses,
} from '@/hooks/usePrivyDepositAddresses';
import { useDialogStore } from '@/stores/dialogStore';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber } from '@/utils';

/**
 * 邮箱转账充值弹窗：打开后直接进入 Offline（选币 / 选网 / 二维码 / 嵌入式收款地址）。
 */
export function DepositDialog() {
  const { t } = useTranslation();
  const { depositDialogOpen, closeDepositDialog } = useDialogStore();
  const { addresses: embeddedAddresses } = usePrivyDepositAddresses();
  const { walletUsdcBalance } = useGlobalStore();
  const {
    transferPairs,
    allTokenOptions,
    allChainOptions,
    envChain,
    settlementTarget,
  } = useDepositConfig();

  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const wasOpenRef = useRef(false);

  // 有选中币时，网络列表限定为支持该币的链（Story 仅 Solana）
  const visibleChainOptions = useMemo(() => {
    if (!selectedSymbol) {
      return allChainOptions;
    }

    return getChainsForToken(transferPairs, selectedSymbol);
  }, [allChainOptions, selectedSymbol, transferPairs]);

  const currentPair = useMemo(() => {
    if (!selectedSymbol || !selectedChain) {
      return null;
    }

    return resolveDepositPair(transferPairs, selectedSymbol, selectedChain);
  }, [selectedChain, selectedSymbol, transferPairs]);

  // 收款地址：一律 Privy 嵌入式对应链地址
  const depositAddress = useMemo(() => {
    if (!currentPair) {
      return '';
    }

    return resolveDepositTargetAddress({
      chainFamily: currentPair.chainType === 'evm' ? 'evm' : 'svm',
      embedded: embeddedAddresses,
    });
  }, [currentPair, embeddedAddresses]);

  const dialogTitle = (
    <span className={cn('flex flex-col', 'gap-0.5')}>
      <span>{t('充值')}</span>
      <span
        className={cn(
          'text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground',
        )}
      >
        {t('StoryFun 余额：{{amount}} USDC', {
          amount: formatNumber(walletUsdcBalance ?? 0, 2),
        })}
      </span>
    </span>
  );

  useEffect(() => {
    if (depositDialogOpen) {
      const defaults = getDefaultTransferSelection(transferPairs, envChain);

      if (defaults) {
        setSelectedSymbol(defaults.symbol);
        setSelectedChain(defaults.chain);
      } else {
        setSelectedSymbol('');
        setSelectedChain('');
      }

      wasOpenRef.current = true;
      return;
    }

    if (wasOpenRef.current) {
      setSelectedSymbol('');
      setSelectedChain('');
      wasOpenRef.current = false;
    }
  }, [depositDialogOpen, envChain, transferPairs]);

  // 选币后：若当前链不支持该币，切到可用链（Story 优先 Solana）
  function handleSelectToken(symbol: string) {
    setSelectedSymbol(symbol);

    const chains = getChainsForToken(transferPairs, symbol);

    if (chains.length === 0) {
      return;
    }

    const stillValid = chains.some((item) => item.chain === selectedChain);

    if (!stillValid) {
      const preferSvm = symbol.trim().toLowerCase() === 'story';
      const nextChain =
        (preferSvm
          ? chains.find((item) => item.chainType === 'svm')
          : undefined) ?? chains[0];

      setSelectedChain(nextChain.chain);
    }
  }

  // 选链后：若当前币不在该链，切到该链第一个币
  function handleSelectChain(chain: string) {
    setSelectedChain(chain);

    const tokens = getTokensForChain(transferPairs, chain);

    if (tokens.length === 0) {
      return;
    }

    const stillValid = tokens.some(
      (item) => item.symbol.toLowerCase() === selectedSymbol.toLowerCase(),
    );

    if (!stillValid) {
      setSelectedSymbol(tokens[0].symbol);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      closeDepositDialog();
    }
  }

  return (
    <AppDialog
      open={depositDialogOpen}
      onOpenChange={handleOpenChange}
      title={dialogTitle}
      width={500}
    >
      <DepositPrivyAddSessionSigners />
      <DepositOffline
        tokenOptions={allTokenOptions}
        chainOptions={visibleChainOptions}
        selectedSymbol={selectedSymbol}
        selectedChain={selectedChain}
        currentPair={currentPair}
        depositAddress={depositAddress}
        settlementTarget={settlementTarget}
        onSelectToken={handleSelectToken}
        onSelectChain={handleSelectChain}
      />
    </AppDialog>
  );
}
