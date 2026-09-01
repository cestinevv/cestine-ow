import { useMemo } from 'react';
import { DepositAssetSymbol } from '@/hooks/useDepositConfig';
import { getCurrentChain } from '@/solana/chainConfig';
import {
  type ChainInfo,
  type InitWithdrawConfig,
  readWithdrawTokenLimit,
  readWithdrawTokenScale,
  useConfigStore,
  type WithdrawConfig,
} from '@/stores/config';
import type { Token } from '@/types';
import { SHOW_DEV_ONLY_UI } from '@/utils';

/** init.withdraw.tokens[].min 缺省时的产品默认下限 */
const DEFAULT_MIN_WITHDRAW = '10';
/** init.withdraw.tokens[].max 缺省或为 0 时表示不限制上限 */
const DEFAULT_MAX_WITHDRAW = '0';
const DEFAULT_WITHDRAW_FEE = '0';

export interface WithdrawAssetOption {
  symbol: DepositAssetSymbol;
  token: Token;
}

function toWithdrawAssetSymbol(symbol: string): DepositAssetSymbol | undefined {
  const normalized = symbol.toLowerCase();

  if (normalized === 'usdc') {
    return DepositAssetSymbol.Usdc;
  }

  if (normalized === 'story') {
    return DepositAssetSymbol.Story;
  }

  return undefined;
}

/** 按币种构建当前链提现配置（与 useGlobalConfig 口径一致） */
export function buildWithdrawConfigForSymbol(
  chainData: ChainInfo,
  chainKey: string,
  symbol: DepositAssetSymbol,
  initWithdrawData?: InitWithdrawConfig,
): WithdrawConfig | null {
  const tokenEntry = Object.entries(chainData.tokens ?? {}).find(
    ([key, token]) =>
      key.toLowerCase() === symbol.toLowerCase() ||
      token.symbol?.toLowerCase() === symbol.toLowerCase(),
  );

  if (!tokenEntry) {
    return null;
  }

  const [, selectedToken] = tokenEntry;
  const selectedWithdrawToken = initWithdrawData?.tokens?.find(
    (token) => token.symbol?.toLowerCase() === symbol.toLowerCase(),
  );

  return {
    chain: chainKey,
    chainId: chainData.chainId,
    chainName: chainData.name,
    minWithdraw: readWithdrawTokenLimit(
      selectedWithdrawToken?.min,
      DEFAULT_MIN_WITHDRAW,
    ),
    maxWithdraw: readWithdrawTokenLimit(
      selectedWithdrawToken?.max,
      DEFAULT_MAX_WITHDRAW,
    ),
    fee: DEFAULT_WITHDRAW_FEE,
    token: {
      symbol: selectedToken.symbol,
      decimals: selectedToken.decimals,
      scale: readWithdrawTokenScale(selectedWithdrawToken?.scale),
      inputScale: readWithdrawTokenScale(selectedWithdrawToken?.inputScale),
    },
  };
}

export function useWithdrawConfig() {
  const {
    withdrawConfig,
    chainlinks,
    currentChain,
    initConfig,
    usdcToken,
    storyToken,
    setWithdrawConfig,
  } = useConfigStore();

  const envChain = currentChain || getCurrentChain();

  const withdrawAssetOptions = useMemo<WithdrawAssetOption[]>(() => {
    const tokenBySymbol = new Map<DepositAssetSymbol, Token>();

    if (usdcToken) {
      tokenBySymbol.set(DepositAssetSymbol.Usdc, usdcToken);
    }

    if (SHOW_DEV_ONLY_UI && storyToken) {
      tokenBySymbol.set(DepositAssetSymbol.Story, storyToken);
    }

    const initWithdrawTokens = initConfig?.withdraw?.find(
      (item) => item.chain === envChain,
    )?.tokens;

    if (initWithdrawTokens?.length) {
      const options: WithdrawAssetOption[] = [];

      for (const item of initWithdrawTokens) {
        const symbol = toWithdrawAssetSymbol(item.symbol);
        const token = symbol ? tokenBySymbol.get(symbol) : undefined;

        if (!symbol || !token) {
          continue;
        }

        options.push({ symbol, token });
      }

      return options;
    }

    return [...tokenBySymbol.entries()].map(([symbol, token]) => ({
      symbol,
      token,
    }));
  }, [envChain, initConfig?.withdraw, storyToken, usdcToken]);

  const applyWithdrawAsset = (symbol: DepositAssetSymbol) => {
    const chainData = chainlinks?.[envChain];

    if (!chainData) {
      return;
    }

    const initWithdrawData = initConfig?.withdraw?.find(
      (item) => item.chain === envChain,
    );
    const nextConfig = buildWithdrawConfigForSymbol(
      chainData,
      envChain,
      symbol,
      initWithdrawData,
    );

    if (nextConfig) {
      setWithdrawConfig(nextConfig);
    }
  };

  return {
    withdrawAssetOptions,
    applyWithdrawAsset,
    withdrawConfig,
  };
}
