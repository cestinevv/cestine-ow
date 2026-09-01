import { useMemo } from 'react';
import { getCurrentChain } from '@/solana/chainConfig';
import {
  type ChainInfo,
  type DepositConfig,
  type InitDepositConfig,
  useConfigStore,
} from '@/stores/config';
import type { Token } from '@/types';
import { SHOW_DEV_ONLY_UI } from '@/utils';

export enum DepositAssetSymbol {
  Usdc = 'USDC',
  Story = 'STORY',
}

export const DEPOSIT_ASSET_SYMBOLS = [
  DepositAssetSymbol.Usdc,
  DepositAssetSymbol.Story,
] as const;

export interface DepositAssetOption {
  symbol: DepositAssetSymbol;
  token: Token;
}

/** 转账充值：币种 × 链 的一条可选配置 */
export interface DepositTransferPair {
  chain: string;
  chainName: string;
  chainIcon: string;
  chainType: 'evm' | 'svm';
  symbol: string;
  tokenIcon: string;
  minDeposit: string;
  scale: number;
  exchangeRate: number;
  tokenAddress: string;
  decimals: number;
  fullSymbol: string;
}

export interface DepositTransferTokenOption {
  symbol: string;
  icon: string;
}

export interface DepositTransferChainOption {
  chain: string;
  chainName: string;
  chainIcon: string;
  chainType: 'evm' | 'svm';
}

/** 按币种构建当前链充值配置（与 useGlobalConfig 口径一致） */
export function buildDepositConfigForSymbol(
  chainData: ChainInfo,
  chainKey: string,
  symbol: DepositAssetSymbol,
  initDepositData?: InitDepositConfig,
): DepositConfig | null {
  const tokenEntry = Object.entries(chainData.tokens ?? {}).find(
    ([key, token]) =>
      key.toLowerCase() === symbol.toLowerCase() ||
      token.symbol?.toLowerCase() === symbol.toLowerCase(),
  );

  if (!tokenEntry) {
    return null;
  }

  const [, selectedToken] = tokenEntry;
  const selectedDepositToken = initDepositData?.tokens?.find(
    (token) => token.symbol?.toLowerCase() === symbol.toLowerCase(),
  );

  return {
    chain: chainKey,
    chainType: chainData.chainType,
    chainId: chainData.chainId,
    chainName: chainData.name,
    chainIcon: chainData.icon,
    rpc: chainData.rpc?.http || '',
    vaultAddress: chainData.contracts?.vault || '',
    inVaultAddress: chainData.contracts?.inVault,
    spenderAddress: chainData.contracts?.spender,
    testnet: chainData.testnet ?? false,
    explorer: chainData.explorer,
    token: {
      address: selectedToken.address,
      symbol: selectedToken.symbol,
      decimals: selectedToken.decimals,
      icon: selectedToken.icon,
      minDeposit: selectedDepositToken?.min || '10',
      scale: Number(selectedDepositToken?.scale) || 2,
      fullSymbol: selectedToken.fullSymbol || selectedToken.symbol,
    },
    api: initDepositData?.api,
  };
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toLowerCase();
}

function isVisibleDepositTokenSymbol(symbol: string) {
  return SHOW_DEV_ONLY_UI || normalizeSymbol(symbol) !== 'story';
}

function findTokenInChain(chainData: ChainInfo, symbol: string) {
  const needle = normalizeSymbol(symbol);

  return Object.entries(chainData.tokens ?? {}).find(
    ([key, token]) =>
      key.toLowerCase() === needle || token.symbol?.toLowerCase() === needle,
  );
}

/** 从 init.deposit × chainlinks 展开转账矩阵 */
export function buildDepositTransferPairs(
  initDeposit: InitDepositConfig[] | undefined,
  chainlinks: Record<string, ChainInfo> | null,
): DepositTransferPair[] {
  if (!initDeposit?.length || !chainlinks) {
    return [];
  }

  const pairs: DepositTransferPair[] = [];

  for (const depositItem of initDeposit) {
    const chainData = chainlinks[depositItem.chain];

    if (!chainData) {
      continue;
    }

    const chainType =
      depositItem.chainType === 'evm' || depositItem.chainType === 'svm'
        ? depositItem.chainType
        : chainData.chainType;

    for (const token of depositItem.tokens ?? []) {
      const tokenEntry = findTokenInChain(chainData, token.symbol);

      if (!tokenEntry) {
        continue;
      }

      const [, chainToken] = tokenEntry;

      pairs.push({
        chain: depositItem.chain,
        chainName: chainData.name,
        chainIcon: chainData.icon,
        chainType,
        symbol: chainToken.symbol,
        tokenIcon: chainToken.icon,
        minDeposit: token.min || '0',
        scale: Number(token.scale) || 2,
        exchangeRate:
          typeof token.exchange_rate === 'number' ? token.exchange_rate : 1,
        tokenAddress: chainToken.address,
        decimals: chainToken.decimals,
        fullSymbol: chainToken.fullSymbol || chainToken.symbol,
      });
    }
  }

  return pairs;
}

export function getTokensForChain(
  pairs: DepositTransferPair[],
  chain: string,
): DepositTransferTokenOption[] {
  const seen = new Set<string>();
  const options: DepositTransferTokenOption[] = [];

  for (const pair of pairs) {
    if (pair.chain !== chain) {
      continue;
    }

    const key = normalizeSymbol(pair.symbol);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    options.push({ symbol: pair.symbol, icon: pair.tokenIcon });
  }

  return options;
}

export function getChainsForToken(
  pairs: DepositTransferPair[],
  symbol: string,
): DepositTransferChainOption[] {
  const needle = normalizeSymbol(symbol);
  const seen = new Set<string>();
  const options: DepositTransferChainOption[] = [];

  for (const pair of pairs) {
    if (normalizeSymbol(pair.symbol) !== needle) {
      continue;
    }

    if (seen.has(pair.chain)) {
      continue;
    }

    seen.add(pair.chain);
    options.push({
      chain: pair.chain,
      chainName: pair.chainName,
      chainIcon: pair.chainIcon,
      chainType: pair.chainType,
    });
  }

  return options;
}

export function resolveDepositPair(
  pairs: DepositTransferPair[],
  symbol: string,
  chain: string,
): DepositTransferPair | null {
  const needle = normalizeSymbol(symbol);

  return (
    pairs.find(
      (pair) => pair.chain === chain && normalizeSymbol(pair.symbol) === needle,
    ) ?? null
  );
}

/** 默认选中：优先 usdc + envChain，否则矩阵第一对 */
export function getDefaultTransferSelection(
  pairs: DepositTransferPair[],
  envChain: string,
): { symbol: string; chain: string } | null {
  if (pairs.length === 0) {
    return null;
  }

  const usdcOnEnv = pairs.find(
    (pair) =>
      pair.chain === envChain && normalizeSymbol(pair.symbol) === 'usdc',
  );

  if (usdcOnEnv) {
    return { symbol: usdcOnEnv.symbol, chain: usdcOnEnv.chain };
  }

  const anyOnEnv = pairs.find((pair) => pair.chain === envChain);

  if (anyOnEnv) {
    return { symbol: anyOnEnv.symbol, chain: anyOnEnv.chain };
  }

  const firstUsdc = pairs.find(
    (pair) => normalizeSymbol(pair.symbol) === 'usdc',
  );

  if (firstUsdc) {
    return { symbol: firstUsdc.symbol, chain: firstUsdc.chain };
  }

  return { symbol: pairs[0].symbol, chain: pairs[0].chain };
}

/** 结算目标：Solana 链上的 USDC（用于接收侧展示） */
export function resolveSolanaUsdcTarget(
  pairs: DepositTransferPair[],
  chainlinks: Record<string, ChainInfo> | null,
  envChain: string,
): {
  symbol: string;
  tokenIcon: string;
  chainIcon: string;
  chainName: string;
} | null {
  const solanaPair = pairs.find(
    (pair) =>
      pair.chainType === 'svm' && normalizeSymbol(pair.symbol) === 'usdc',
  );

  if (solanaPair) {
    return {
      symbol: solanaPair.symbol,
      tokenIcon: solanaPair.tokenIcon,
      chainIcon: solanaPair.chainIcon,
      chainName: solanaPair.chainName,
    };
  }

  const solanaChainKey =
    Object.entries(chainlinks ?? {}).find(
      ([, info]) => info.chainType === 'svm',
    )?.[0] ?? envChain;

  const solanaChain = chainlinks?.[solanaChainKey];
  const usdcToken = solanaChain
    ? findTokenInChain(solanaChain, 'usdc')?.[1]
    : undefined;

  if (!solanaChain || !usdcToken) {
    return null;
  }

  return {
    symbol: usdcToken.symbol,
    tokenIcon: usdcToken.icon,
    chainIcon: solanaChain.icon,
    chainName: solanaChain.name,
  };
}

/**
 * Hook to get deposit configuration from global config store
 */
export function useDepositConfig() {
  const {
    depositConfig,
    isLoading,
    isInitialized,
    error,
    chainlinks,
    currentChain,
    initConfig,
    usdcToken,
    storyToken,
    setDepositConfig,
  } = useConfigStore();

  const envChain = currentChain || getCurrentChain();

  const transferPairs = useMemo(
    () =>
      buildDepositTransferPairs(initConfig?.deposit, chainlinks).filter(
        (pair) => isVisibleDepositTokenSymbol(pair.symbol),
      ),
    [chainlinks, initConfig?.deposit],
  );

  const allTokenOptions = useMemo<DepositTransferTokenOption[]>(() => {
    const seen = new Set<string>();
    const options: DepositTransferTokenOption[] = [];

    for (const pair of transferPairs) {
      const key = normalizeSymbol(pair.symbol);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      options.push({ symbol: pair.symbol, icon: pair.tokenIcon });
    }

    // Offline 币种下拉固定顺序：USDC → USDT → Story → 其它
    const order = ['usdc', 'usdt', 'story'];

    return [...options].sort((a, b) => {
      const aRank = order.indexOf(normalizeSymbol(a.symbol));
      const bRank = order.indexOf(normalizeSymbol(b.symbol));
      const aOrder = aRank === -1 ? order.length : aRank;
      const bOrder = bRank === -1 ? order.length : bRank;

      return aOrder - bOrder;
    });
  }, [transferPairs]);

  const allChainOptions = useMemo<DepositTransferChainOption[]>(() => {
    const seen = new Set<string>();
    const options: DepositTransferChainOption[] = [];

    for (const pair of transferPairs) {
      if (seen.has(pair.chain)) {
        continue;
      }

      seen.add(pair.chain);
      options.push({
        chain: pair.chain,
        chainName: pair.chainName,
        chainIcon: pair.chainIcon,
        chainType: pair.chainType,
      });
    }

    return options;
  }, [transferPairs]);

  const settlementTarget = useMemo(
    () => resolveSolanaUsdcTarget(transferPairs, chainlinks, envChain),
    [chainlinks, envChain, transferPairs],
  );

  const depositAssetOptions = useMemo<DepositAssetOption[]>(() => {
    const options: DepositAssetOption[] = [];

    if (usdcToken) {
      options.push({ symbol: DepositAssetSymbol.Usdc, token: usdcToken });
    }

    if (SHOW_DEV_ONLY_UI && storyToken) {
      options.push({ symbol: DepositAssetSymbol.Story, token: storyToken });
    }

    return options;
  }, [storyToken, usdcToken]);

  const applyDepositAsset = (symbol: DepositAssetSymbol) => {
    const chainData = chainlinks?.[envChain];

    if (!chainData) {
      return;
    }

    const initDepositData = initConfig?.deposit?.find(
      (item) => item.chain === envChain,
    );
    const nextConfig = buildDepositConfigForSymbol(
      chainData,
      envChain,
      symbol,
      initDepositData,
    );

    if (nextConfig) {
      setDepositConfig(nextConfig);
    }
  };

  return {
    transferPairs,
    allTokenOptions,
    allChainOptions,
    settlementTarget,
    getChainsForToken: (symbol: string) =>
      getChainsForToken(transferPairs, symbol),
    getTokensForChain: (chain: string) =>
      getTokensForChain(transferPairs, chain),
    resolvePair: (symbol: string, chain: string) =>
      resolveDepositPair(transferPairs, symbol, chain),
    getDefaultSelection: () =>
      getDefaultTransferSelection(transferPairs, envChain),
    depositAssetOptions,
    applyDepositAsset,
    isLoading: isLoading || !isInitialized,
    error,
    depositConfig,
    envChain,
  };
}
