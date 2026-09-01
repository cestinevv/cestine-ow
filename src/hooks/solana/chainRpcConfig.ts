import type { Address } from '@solana/kit';

import {
  getCurrentChain,
  type PrivySolanaChain,
  type SupportedChain,
} from '@/solana/chainConfig';
import { STORY_PROGRAM_ADDRESS } from '@/solana/generated/story/src/generated/programs/story';
import type { ChainContracts, ChainExplorer, ChainInfo } from '@/stores/config';
import type { Token } from '@/types';

export type ChainlinksMap = Record<string, ChainInfo>;

/** 当前链 Story 合约片段（chainlinks.contracts 子集） */
export type StoryChainContracts = Pick<
  ChainContracts,
  | 'story'
  | 'storyAdmin'
  | 'storyTreasury'
  | 'storyAuthority'
  | 'storyConfigPDA'
  | 'storyDelegator'
  | 'storyDramaCollectionMintPDA'
  | 'storyDramaCollectionInfoPDA'
  | 'storyDramaMintLookupTable'
  | 'storyActorCollectionMintPDA'
  | 'storyActorCollectionInfoPDA'
  | 'storyActorMintLookupTable'
>;

function pickStoryContracts(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain,
): StoryChainContracts | undefined {
  const contracts = chainlinks?.[chain]?.contracts;
  if (!contracts) {
    return undefined;
  }

  return {
    story: contracts.story,
    storyAdmin: contracts.storyAdmin,
    storyTreasury: contracts.storyTreasury,
    storyAuthority: contracts.storyAuthority,
    storyConfigPDA: contracts.storyConfigPDA,
    storyDelegator: contracts.storyDelegator,
    storyDramaCollectionMintPDA: contracts.storyDramaCollectionMintPDA,
    storyDramaCollectionInfoPDA: contracts.storyDramaCollectionInfoPDA,
    storyDramaMintLookupTable: contracts.storyDramaMintLookupTable,
    storyActorCollectionMintPDA: contracts.storyActorCollectionMintPDA,
    storyActorCollectionInfoPDA: contracts.storyActorCollectionInfoPDA,
    storyActorMintLookupTable: contracts.storyActorMintLookupTable,
  };
}

function trimContractAddress(value: string | undefined): Address | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? (trimmed as Address) : undefined;
}

/** 读取当前链 Story 相关 contracts 字段（mint / PDA / treasury 等）。 */
export function getStoryChainContracts(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): StoryChainContracts | undefined {
  return pickStoryContracts(chainlinks, chain);
}

/** 剧集 Collection Mint PDA（canonical_payload 中 nftContractAddress）。 */
export function getStoryDramaCollectionMintPda(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): Address | undefined {
  return trimContractAddress(
    pickStoryContracts(chainlinks, chain)?.storyDramaCollectionMintPDA,
  );
}

/** 演员 Collection Mint PDA（canonical_payload 中 nftContractAddress）。 */
export function getStoryActorCollectionMintPda(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): Address | undefined {
  return trimContractAddress(
    pickStoryContracts(chainlinks, chain)?.storyActorCollectionMintPDA,
  );
}

/** Story delegator 公钥（用于 Ed25519 签名验证）。 */
export function getStoryDelegator(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): Address | undefined {
  return trimContractAddress(
    pickStoryContracts(chainlinks, chain)?.storyDelegator,
  );
}

/**
 * 短剧 mint_series_nft 的 ALT 地址。
 * 仅使用 chainlinks.contracts.storyDramaMintLookupTable（不再提供本地 devnet 回落）。
 */
export function getStoryDramaMintLookupTable(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): Address | undefined {
  return trimContractAddress(
    pickStoryContracts(chainlinks, chain)?.storyDramaMintLookupTable,
  );
}

/**
 * 演员 mint_actor_nft 的 ALT 地址。
 * 仅使用 chainlinks.contracts.storyActorMintLookupTable（不再提供本地 devnet 回落）。
 */
export function getStoryActorMintLookupTable(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): Address | undefined {
  return trimContractAddress(
    pickStoryContracts(chainlinks, chain)?.storyActorMintLookupTable,
  );
}

/** Story treasury 收款钱包（支付类指令向对应 SPL ATA 汇账）。 */
export function getStoryTreasury(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): Address | undefined {
  return trimContractAddress(
    pickStoryContracts(chainlinks, chain)?.storyTreasury,
  );
}

/** 按代币符号从 chainlinks.tokens 解析 mint 地址（如 USDC / USDT / STORY）。 */
export function getChainTokenAddress(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain,
  symbol: string,
): Address | undefined {
  const tokens = chainlinks?.[chain]?.tokens;
  if (!tokens) {
    return undefined;
  }

  const target = symbol.toUpperCase();
  const entries = Object.entries(tokens);

  const matched =
    entries.find(([, token]) => token.symbol?.toUpperCase() === target) ??
    entries.find(([, token]) => token.fullSymbol?.toUpperCase() === target) ??
    entries.find(([key]) => key.toUpperCase() === target);

  const address = matched?.[1]?.address?.trim();
  return address && address.length > 0 ? (address as Address) : undefined;
}

/**
 * 从 chainlinks.tokens 按资产符号解析代币（优先 symbol / fullSymbol，再回落 map key）。
 * 避免 Admin 侧 key 命名与 symbol 不一致时把 STORY mint 误配到 usdc。
 */
export function findChainTokenByAsset(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain,
  asset: 'USDC' | 'STORY',
): Token | undefined {
  const tokens = chainlinks?.[chain]?.tokens;
  if (!tokens) {
    return undefined;
  }

  const target = asset.toUpperCase();
  const entries = Object.entries(tokens);

  const matched =
    entries.find(([, token]) => token.symbol?.toUpperCase() === target) ??
    entries.find(([, token]) => token.fullSymbol?.toUpperCase() === target) ??
    entries.find(([key]) => key.toUpperCase() === target);

  return matched?.[1];
}

/** Privy `solana.rpcs` cluster → chainlinks 键名 */
const PRIVY_CLUSTER_CHAIN_KEYS: Record<PrivySolanaChain, string> = {
  'solana:mainnet': 'solana',
  'solana:devnet': 'solana-devnet',
  'solana:testnet': 'solana-testnet',
};

export type PrivySolanaRpcEndpoints = Partial<
  Record<PrivySolanaChain, { http: string; wss: string }>
>;

/** 从 chainlinks 组装 Privy 各 Solana cluster 的 HTTP / WSS（配置缺失的 cluster 跳过）。 */
export function getPrivySolanaRpcEndpoints(
  chainlinks: ChainlinksMap | null | undefined,
): PrivySolanaRpcEndpoints {
  const result: PrivySolanaRpcEndpoints = {};

  for (const [cluster, chainKey] of Object.entries(
    PRIVY_CLUSTER_CHAIN_KEYS,
  ) as [PrivySolanaChain, string][]) {
    const http = chainlinks?.[chainKey]?.rpc?.http?.trim();
    const wss = chainlinks?.[chainKey]?.rpc?.wss?.trim();

    if (http && wss) {
      result[cluster] = { http, wss };
    }
  }

  return result;
}

/** 从 chainlinks 读取当前链 JSON-RPC HTTP 端点（与 Admin 配置中心一致）。 */
export function getChainRpcHttp(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): string | undefined {
  const http = chainlinks?.[chain]?.rpc?.http?.trim();
  return http && http.length > 0 ? http : undefined;
}

/** 从 chainlinks 读取支持 Metaplex DAS 的 JSON-RPC 端点。 */
export function getChainDasRpcHttp(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): string | undefined {
  const das = chainlinks?.[chain]?.rpc?.das?.trim();
  return das && das.length > 0 ? das : undefined;
}

/** 从 chainlinks 读取当前链 JSON-RPC WSS 端点（与 Admin 配置中心一致，单一事实来源）。 */
export function getChainRpcWss(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): string | undefined {
  const wss = chainlinks?.[chain]?.rpc?.wss?.trim();
  return wss && wss.length > 0 ? wss : undefined;
}

/**
 * Story 程序地址：优先 chainlinks.contracts.story，缺失时回落 Codama 常量（与 mint 摘要 mock 一致）。
 */
export function getStoryProgramId(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): Address {
  const fromConfig = chainlinks?.[chain]?.contracts?.story?.trim();
  if (fromConfig) {
    return fromConfig as Address;
  }

  const envProgramId = import.meta.env.VITE_STORY_PROGRAM_ID?.trim();
  if (envProgramId) {
    return envProgramId as Address;
  }

  return STORY_PROGRAM_ADDRESS;
}

/** 当前链配置片段（RPC + Story Program），供联调层统一消费。 */
export function resolveStoryChainContext(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
):
  | {
      chain: SupportedChain;
      rpcHttp: string;
      dasRpcHttp?: string;
      programId: Address;
    }
  | undefined {
  const rpcHttp = getChainRpcHttp(chainlinks, chain);
  if (!rpcHttp) {
    return undefined;
  }

  return {
    chain,
    rpcHttp,
    dasRpcHttp: getChainDasRpcHttp(chainlinks, chain),
    programId: getStoryProgramId(chainlinks, chain),
  };
}

export function getChainExplorer(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain = getCurrentChain(),
): ChainExplorer | undefined {
  return chainlinks?.[chain]?.explorer;
}

export function buildExplorerTxUrl(
  explorer: ChainExplorer | null | undefined,
  txHash: string,
): string | undefined {
  const hash = txHash.trim();
  const baseUrl = explorer?.url?.trim();
  if (!hash || !baseUrl) {
    return undefined;
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const suffix = explorer?.suffix?.trim() ?? '';
  return `${normalizedBase}/tx/${hash}${suffix}`;
}

/** 钱包地址在链浏览器中的交易/账户页（与 `buildExplorerTxUrl` 共用 chainlinks.explorer 与环境后缀） */
export function buildExplorerAccountUrl(
  explorer: ChainExplorer | null | undefined,
  walletAddress: string,
): string | undefined {
  const address = walletAddress.trim();
  const baseUrl = explorer?.url?.trim();
  if (!address || !baseUrl) {
    return undefined;
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const suffix = explorer?.suffix?.trim() ?? '';
  return `${normalizedBase}/account/${address}${suffix}`;
}
