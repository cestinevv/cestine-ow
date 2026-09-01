import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TheaterBannerConfig } from '@/features/play/types/playTheaterBannerItem';
import { getCurrentChain } from '@/solana/chainConfig';
import type { Token } from '@/types';

/**
 * 链配置接口
 */
export interface ChainRpcConfig {
  wss: string;
  http: string;
  /** 支持 Metaplex DAS JSON-RPC 的端点；不能默认普通 Solana RPC 支持 DAS。 */
  das?: string;
}

export interface ChainExplorer {
  url: string;
  name: string;
  suffix?: string;
}

/**
 * 链上合约 / PDA 地址（Admin chainlinks.contracts）
 * Story 相关字段与 `demo/mock/config.json` solana-devnet 示例对齐。
 */
export interface ChainContracts {
  vault: string;
  inVault?: string;
  outVault?: string;
  spender?: string;
  privyAdmin?: string;
  privyLogical?: string;
  /** Story 程序 ID */
  story?: string;
  storyAdmin?: string;
  storyTreasury?: string;
  storyAuthority?: string;
  storyConfigPDA?: string;
  storyDelegator?: string;
  /** 剧集（drama）集合 Collection Mint / CollectionInfo PDA */
  storyDramaCollectionMintPDA?: string;
  storyDramaCollectionInfoPDA?: string;
  /** 短剧 mint_series_nft Address Lookup Table（合约/Admin 预创建） */
  storyDramaMintLookupTable?: string;
  /** 演员（actor）集合 Collection Mint / CollectionInfo PDA */
  storyActorCollectionMintPDA?: string;
  storyActorCollectionInfoPDA?: string;
  /** 演员 mint_actor_nft Address Lookup Table（合约/Admin 预创建） */
  storyActorMintLookupTable?: string;
}

export interface TokenInfo {
  icon: string;
  symbol: string;
  address: string;
  decimals: number;
  fullSymbol: string;
}

export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

export interface ChainInfo {
  rpc: ChainRpcConfig;
  icon: string;
  name: string;
  tokens: {
    [key: string]: TokenInfo;
  };
  chainId: number;
  testnet?: boolean;
  explorer: ChainExplorer;
  chainType: 'evm' | 'svm';
  contracts: ChainContracts;
  nativeCurrency?: NativeCurrency;
}

/**
 * 充值配置
 */
export interface DepositConfig {
  chain: string;
  chainType: 'evm' | 'svm';
  chainId: number;
  chainName: string;
  chainIcon: string;
  rpc: string;
  vaultAddress: string;
  inVaultAddress?: string;
  spenderAddress?: string;
  testnet: boolean;
  explorer: ChainExplorer;
  token: {
    address: string;
    symbol: string;
    decimals: number;
    icon: string;
    minDeposit: string;
    scale: number;
    fullSymbol: string;
  };
  api?: string; // 充值 API 地址
}

/**
 * Init 配置中的充值 Token 信息
 */
export interface InitDepositToken {
  min: string;
  type: number;
  scale: string;
  symbol: string;
  /** 转入 Solana USDC 的兑换比例 */
  exchange_rate?: number;
}

/**
 * Init 配置中的充值配置（多链；api 仅部分链如 Solana 提供）
 */
export interface InitDepositConfig {
  api?: string;
  chain: string;
  tokens: InitDepositToken[];
  chainType: 'evm' | 'svm' | string;
}

/**
 * Init 配置中的提现 Token 信息
 * 例：{ scale: 2, symbol: "usdc", inputScale: 5, min: 10, max: 10000 }
 */
export interface InitWithdrawToken {
  symbol: string;
  /** 提现币种展示精度 */
  scale: number;
  /** 提现币种可提现数值的输入精度 */
  inputScale: number;
  /** 最小提现 */
  min: number;
  /** 最大提现（0 表示不限制上限） */
  max: number;
}

const DEFAULT_WITHDRAW_SCALE = 2;

/** 读取 init.withdraw.tokens[].scale / inputScale */
export function readWithdrawTokenScale(
  value: number | undefined,
  fallback = DEFAULT_WITHDRAW_SCALE,
) {
  const scale = Number(value);
  return Number.isFinite(scale) ? scale : fallback;
}

/** 读取 init.withdraw.tokens[].min / max（写入 WithdrawConfig 时为 string） */
export function readWithdrawTokenLimit(
  value: number | undefined,
  fallback: string,
) {
  const limit = Number(value);
  return Number.isFinite(limit) ? String(limit) : fallback;
}

/**
 * Init 配置中的提现配置
 */
export interface InitWithdrawConfig {
  chain: string;
  tokens: InitWithdrawToken[];
}

/**
 * Init 配置中的领取（claim）配置
 */
export interface InitClaimConfig {
  fee: string;
  chain: string;
  symbol: string;
}

/**
 * Init 配置中的演员 NFT 升级规则
 */
export interface InitActorNftUpgradeConfig {
  /* 目标等级 */
  toLevel: number;
  /* 所需材料数量 */
  requiredMaterialCount: number;
  /* 热度阈值 */
  heatThreshold: number;
  /* 升级费用 */
  fee: number;
}

/**
 * Init 配置中的演员 NFT 咖位等级
 */
export interface InitActorNftLevelConfig {
  name: string;
  /* 补充体力需要消耗的USDC的数量 */
  supplyFee: number;
  /* 挖矿系数 */
  miningCoefficient: number;
  upgrade?: InitActorNftUpgradeConfig;
}

/**
 * Init 配置中的演员 NFT 规则
 */
export interface InitActorNftConfig {
  /* 派遣质押状态每小时体力消耗 */
  staminaCostPerHour: number;
  /* 非质押休息状态每小时体力恢复 */
  staminaRecoverPerHour: number;
  /* 是否支持部分购买体力 */
  partialRefillSupported: boolean;
  /* 一键加满价格是否固定不按剩余体力折算 */
  fixedFullRefillPrice: boolean;
  /* 升级后体力是否继承主材体力 */
  upgradeInheritMainActorStamina: boolean;
  /* 体力上限 */
  staminaLimit: number;
  /* 咖位等级 */
  levels: Record<string, InitActorNftLevelConfig>;
}

/**
 * Init 配置中的 STORY 总量分配比例
 */
export interface InitMiningPercentsConfig {
  team: number;
  treasury: number;
  investors: number;
  liquidity: number;
  nftMiningPool: number;
  marketOperations: number;
}

/**
 * Init 配置中的挖矿 / STORY 分配
 */
export interface InitMiningConfig {
  percents: InitMiningPercentsConfig;
  /** STORY 总量，字符串避免大数精度丢失 */
  totalSupply: string;
}

/**
 * Init 配置
 */
export interface InitConfig {
  claim?: InitClaimConfig;
  /** 钱包资产页展示顺序（如 story / usdc / point） */
  assets?: string[];
  deposit: InitDepositConfig[];
  withdraw: InitWithdrawConfig[];
  actorNft?: InitActorNftConfig;
  mining?: InitMiningConfig;
}

/**
 * mini-drama 配置中的返佣梯度
 */
export interface MiniDramaRebateTierConfig {
  start_episode: number;
  end_episode: number | null;
  direct_inviter_rate: number;
  indirect_inviter_rate: number;
}

/**
 * mini-drama 配置
 */
export interface MiniDramaConfig {
  rebate_tiers: MiniDramaRebateTierConfig[];
  creator_rate_max: number;
  usdt_to_points_rate: number;
  default_creator_rate: number;
  self_reward_usdt_rate: number;
  point_cost_per_episode: number;
  bulk_unlock_discount_rate: number;
}

/**
 * 提现配置
 */
export interface WithdrawConfig {
  chain: string;
  chainId: number;
  chainName: string;
  minWithdraw: string;
  maxWithdraw: string;
  fee: string;
  token: {
    symbol: string;
    decimals: number;
    /** 提现币种展示精度 */
    scale: number;
    /** 提现币种可提现数值的输入精度 */
    inputScale: number;
  };
}

/**
 * 活动任务类型（Admin config.activity.tasks[].type）
 */
export type ActivityTaskType =
  | 'follow_x'
  | 'retweet_x'
  | 'like_x'
  | 'publish_drama'
  | 'watch_drama'
  | 'mining';

/**
 * 活动分享平台
 */
export type ActivitySharePlatform = 'x' | 'tiktok' | 'youtube';

/**
 * 活动任务项
 */
export interface ActivityTaskConfig {
  type: ActivityTaskType | string;
  points: number;
  taskId: number;
  linkUrl: string;
  description: string;
}

/**
 * 排行榜奖励档位
 */
export interface ActivityRewardRankTier {
  amount: number;
  maxRank: number;
  minRank: number;
}

/**
 * 分享传播指标积分规则（单指标）
 */
export interface ActivityShareMetricPointsRule {
  points: number;
  threshold: number;
}

/**
 * 单平台分享传播积分规则
 */
export interface ActivitySharePlatformPointsRules {
  like?: ActivityShareMetricPointsRule;
  play?: ActivityShareMetricPointsRule;
  retweet?: ActivityShareMetricPointsRule;
}

/**
 * 活动配置（Admin config key: activity）
 */
export interface ActivityConfig {
  tasks: ActivityTaskConfig[];
  title: string;
  status: string;
  activityId: number;
  activityEndAt: number;
  sharePlatforms: ActivitySharePlatform[] | string[];
  activityStartAt: number;
  rewardRankTiers: ActivityRewardRankTier[];
  checkinDailyPoints: number[];
  shareMetricsPointsRules: Partial<
    Record<ActivitySharePlatform | string, ActivitySharePlatformPointsRules>
  >;
}

/**
 * 全局配置 Store
 */
interface ConfigState {
  // 原始链配置数据
  chainlinks: Record<string, ChainInfo> | null;

  // 当前链
  currentChain: string;

  // 充值配置
  depositConfig: DepositConfig | null;

  // 提现配置
  withdrawConfig: WithdrawConfig | null;

  // 其他配置
  initConfig: InitConfig | null;
  miniDramaConfig: MiniDramaConfig | null;
  theaterBannerConfig: TheaterBannerConfig | null;
  activityConfig: ActivityConfig | null;

  // 当前链 USDC / STORY 代币元数据
  usdcToken: Token | null;
  storyToken: Token | null;

  // 加载状态
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setChainlinks: (chainlinks: Record<string, ChainInfo>) => void;
  setCurrentChain: (chain: string) => void;
  setDepositConfig: (config: DepositConfig | null) => void;
  setWithdrawConfig: (config: WithdrawConfig | null) => void;
  setInitConfig: (config: InitConfig | null) => void;
  setMiniDramaConfig: (config: MiniDramaConfig | null) => void;
  setTheaterBannerConfig: (config: TheaterBannerConfig | null) => void;
  setActivityConfig: (config: ActivityConfig | null) => void;
  setUsdcToken: (config: Token | null) => void;
  setStoryToken: (config: Token | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  chainlinks: null,
  currentChain: getCurrentChain(),
  depositConfig: null,
  withdrawConfig: null,
  initConfig: null,
  miniDramaConfig: null,
  theaterBannerConfig: null,
  activityConfig: null,
  usdcToken: null,
  storyToken: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...initialState,

      setChainlinks: (chainlinks) => set({ chainlinks }),
      setCurrentChain: (chain) => set({ currentChain: chain }),
      setDepositConfig: (config) => set({ depositConfig: config }),
      setWithdrawConfig: (config) => set({ withdrawConfig: config }),
      setInitConfig: (config) => set({ initConfig: config }),
      setMiniDramaConfig: (config) => set({ miniDramaConfig: config }),
      setTheaterBannerConfig: (config) => set({ theaterBannerConfig: config }),
      setActivityConfig: (config) => set({ activityConfig: config }),
      setUsdcToken: (config) => set({ usdcToken: config }),
      setStoryToken: (config) => set({ storyToken: config }),
      setLoading: (loading) => set({ isLoading: loading }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: 'app-config', // localStorage key
      // 只持久化配置数据，不持久化加载状态
      partialize: (state) => ({
        chainlinks: state.chainlinks,
        currentChain: state.currentChain,
        depositConfig: state.depositConfig,
        withdrawConfig: state.withdrawConfig,
        initConfig: state.initConfig,
        miniDramaConfig: state.miniDramaConfig,
        theaterBannerConfig: state.theaterBannerConfig,
        activityConfig: state.activityConfig,
        usdcToken: state.usdcToken,
        storyToken: state.storyToken,
        isInitialized: state.isInitialized,
      }),
    },
  ),
);
