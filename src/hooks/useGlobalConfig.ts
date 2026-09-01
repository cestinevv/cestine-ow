import { useEffect } from 'react';
import { useGetApiAdminV1ConfigsKeysKeys } from '@/api/__generated__/admin/default/default';
import { parseTheaterBannerConfig } from '@/features/play/types/playTheaterBannerItem';
import { findChainTokenByAsset } from '@/hooks/solana/chainRpcConfig';
import { getCurrentChain } from '@/solana/chainConfig';
import {
  type ActivityConfig,
  type ChainInfo,
  type DepositConfig,
  type InitConfig,
  type MiniDramaConfig,
  readWithdrawTokenLimit,
  readWithdrawTokenScale,
  useConfigStore,
  type WithdrawConfig,
} from '@/stores/config';

interface ConfigKeysResponse {
  data?: {
    chainlinks?: Record<string, ChainInfo>;
    init?: InitConfig;
    'mini-drama'?: MiniDramaConfig;
    banner?: unknown;
    activity?: ActivityConfig;
  };
}

/**
 * 全局配置 Hook
 * 统一管理充值、提现、链配置等所有配置信息
 */
export function useGlobalConfig() {
  const {
    chainlinks,
    currentChain,
    depositConfig,
    withdrawConfig,
    initConfig,
    activityConfig,
    usdcToken,
    storyToken,
    isLoading,
    isInitialized,
    error,
    setChainlinks,
    setCurrentChain,
    setDepositConfig,
    setWithdrawConfig,
    setInitConfig,
    setMiniDramaConfig,
    setTheaterBannerConfig,
    setActivityConfig,
    setUsdcToken,
    setStoryToken,
    setLoading,
    setInitialized,
    setError,
  } = useConfigStore();

  // 从环境变量获取当前链
  const envChain = getCurrentChain();

  // 获取配置数据
  const {
    data,
    isLoading: queryLoading,
    error: queryError,
    refetch,
  } = useGetApiAdminV1ConfigsKeysKeys(
    'chainlinks,init,mini-drama,banner,activity',
  );

  // 更新加载状态
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  // 处理错误
  useEffect(() => {
    if (queryError) {
      const errorMessage =
        queryError instanceof Error
          ? queryError.message
          : 'Failed to load configuration';
      setError(errorMessage);
      setInitialized(true);
    } else {
      setError(null);
    }
  }, [queryError, setError, setInitialized]);

  // 解析配置数据
  useEffect(() => {
    if (data?.data) {
      try {
        const apiResponse = data.data as ConfigKeysResponse;

        const configData = apiResponse.data;
        const chainlinksData = configData?.chainlinks;
        const initData = configData?.init;
        const miniDramaData = configData?.['mini-drama'];
        const activityData = configData?.activity;
        const bannerRaw = configData?.banner;
        const bannerConfig = parseTheaterBannerConfig(bannerRaw);
        setTheaterBannerConfig(bannerConfig);

        if (!chainlinksData) {
          setError('Chainlinks configuration not found');
          setInitialized(true);
          return;
        }

        // 保存完整的链配置
        setChainlinks(chainlinksData as Record<string, ChainInfo>);
        setCurrentChain(envChain);

        // 保存 init 配置
        if (initData) {
          setInitConfig(initData as InitConfig);
        }

        if (miniDramaData) {
          setMiniDramaConfig(miniDramaData as MiniDramaConfig);
        }

        if (activityData) {
          setActivityConfig(activityData as ActivityConfig);
        }

        // 获取当前链的配置
        const currentChainData = chainlinksData[envChain] as ChainInfo;

        if (!currentChainData) {
          setError(`Chain configuration for '${envChain}' not found`);
          setInitialized(true);
          return;
        }

        const tokenEntries = Object.entries(currentChainData.tokens ?? {});

        setUsdcToken(
          findChainTokenByAsset(chainlinksData, envChain, 'USDC') ?? null,
        );
        setStoryToken(
          findChainTokenByAsset(chainlinksData, envChain, 'STORY') ?? null,
        );

        const preferredEntry =
          tokenEntries.find(([symbol]) => symbol.toLowerCase() === 'usdc') ??
          tokenEntries.find(([symbol]) => symbol.toLowerCase() === 'usdt') ??
          tokenEntries[0];

        if (!preferredEntry) {
          setError('Token configuration not found');
          setInitialized(true);
          return;
        }

        const [tokenKey, selectedToken] = preferredEntry;

        // 从 init.deposit 中获取当前链的配置
        const initDepositData = (initData as InitConfig)?.deposit?.find(
          (d) => d.chain === envChain,
        );

        // 从 init.withdraw 中获取当前链的配置
        const initWithdrawData = (initData as InitConfig)?.withdraw?.find(
          (w) => w.chain === envChain,
        );

        // 获取 USDT 的充值配置
        const selectedDepositToken = initDepositData?.tokens?.find(
          (t) => t.symbol?.toLowerCase() === tokenKey.toLowerCase(),
        );

        // 获取 USDT 的提现配置
        const selectedWithdrawToken = initWithdrawData?.tokens?.find(
          (t) => t.symbol?.toLowerCase() === tokenKey.toLowerCase(),
        );

        // 构建充值配置
        const deposit: DepositConfig = {
          chain: envChain,
          chainType: currentChainData.chainType,
          chainId: currentChainData.chainId,
          chainName: currentChainData.name,
          chainIcon: currentChainData.icon,
          rpc: currentChainData.rpc?.http || '',
          vaultAddress: currentChainData.contracts?.vault || '',
          inVaultAddress: currentChainData.contracts?.inVault,
          spenderAddress: currentChainData.contracts?.spender,
          testnet: currentChainData.testnet ?? false,
          explorer: currentChainData.explorer,
          token: {
            address: selectedToken.address,
            symbol: selectedToken.symbol,
            decimals: selectedToken.decimals,
            icon: selectedToken.icon,
            minDeposit: selectedDepositToken?.min || '10',
            scale: Number(selectedDepositToken?.scale) || 2,
            fullSymbol: selectedToken.fullSymbol || selectedToken.symbol,
          },
          api: initDepositData?.api, // 添加充值 API 地址
        };

        // 构建提现配置（精度与 min/max 来自 init.withdraw.tokens[]）
        const withdraw: WithdrawConfig = {
          chain: envChain,
          chainId: currentChainData.chainId,
          chainName: currentChainData.name,
          minWithdraw: readWithdrawTokenLimit(selectedWithdrawToken?.min, '10'),
          maxWithdraw: readWithdrawTokenLimit(selectedWithdrawToken?.max, '0'),
          fee: '0',
          token: {
            symbol: selectedToken.symbol,
            decimals: selectedToken.decimals,
            scale: readWithdrawTokenScale(selectedWithdrawToken?.scale),
            inputScale: readWithdrawTokenScale(
              selectedWithdrawToken?.inputScale,
            ),
          },
        };

        setDepositConfig(deposit);
        setWithdrawConfig(withdraw);
        setInitialized(true);
      } catch (_err) {
        setError('Failed to parse configuration data');
        setInitialized(true);
      }
    }
  }, [
    data,
    envChain,
    setChainlinks,
    setCurrentChain,
    setDepositConfig,
    setWithdrawConfig,
    setInitConfig,
    setMiniDramaConfig,
    setTheaterBannerConfig,
    setActivityConfig,
    setUsdcToken,
    setStoryToken,
    setError,
    setInitialized,
  ]);

  return {
    // 配置数据
    chainlinks,
    currentChain,
    depositConfig,
    withdrawConfig,
    initConfig,
    activityConfig,
    usdcToken,
    storyToken,

    // 状态
    isLoading,
    isInitialized,
    error,

    // 方法
    refetch,
  };
}

/**
 * 初始化全局配置（应用启动时调用）
 */
export function useInitGlobalConfig() {
  const { isInitialized, isLoading, error } = useConfigStore();
  const config = useGlobalConfig();

  useEffect(() => {
    if (!isInitialized && !isLoading && !error) {
      console.log('🚀 Initializing global configuration...');
    }
  }, [isInitialized, isLoading, error]);

  return config;
}
