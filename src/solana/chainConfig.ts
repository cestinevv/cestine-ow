/**
 * 链配置工具
 * 直接从环境变量读取当前链
 */

export type SupportedChain = 'solana-devnet' | 'solana';

const DEFAULT_CHAIN: SupportedChain = 'solana-devnet';

const SUPPORTED_CHAINS: readonly SupportedChain[] = ['solana-devnet', 'solana'];

/**
 * 获取当前链
 */
export function getCurrentChain(): SupportedChain {
  const chain = import.meta.env.VITE_CHAIN;

  if (!chain) {
    return DEFAULT_CHAIN;
  }

  const normalizedChain = chain.toLowerCase();

  if (SUPPORTED_CHAINS.includes(normalizedChain as SupportedChain)) {
    return normalizedChain as SupportedChain;
  }

  throw new Error(
    `Unsupported VITE_CHAIN value "${chain}". Supported values: ${SUPPORTED_CHAINS.join(', ')}`,
  );
}

/**
 * 获取链 ID 映射
 */
export const CHAIN_ID_MAP: Record<SupportedChain, number> = {
  'solana-devnet': 3,
  solana: 1, // Solana 主网（非 EVM chain id，仅占位供内部映射）
};

/**
 * 获取当前链的 ID
 */
export function getCurrentChainId(): number {
  const chain = getCurrentChain();
  return CHAIN_ID_MAP[chain];
}

/**
 * 与 `@solana/react-hooks` 的 `cluster` 对齐：仅依据 `VITE_CHAIN` 推断。
 * RPC URL 一律走 `chainlinks.<chain>.rpc.http`（见 `getChainRpcHttp`），不再读取 env。
 */
export function getSolanaClusterMonikerFromEnv():
  | 'mainnet-beta'
  | 'devnet'
  | 'testnet' {
  if (getCurrentChain() === 'solana-devnet') {
    return 'devnet';
  }

  return 'mainnet-beta';
}

/** Privy `signAndSendTransaction` 的 Solana cluster 标识 */
export type PrivySolanaChain =
  | 'solana:mainnet'
  | 'solana:devnet'
  | 'solana:testnet';

/** 将应用链名或 `getCurrentChain()` 映射为 Privy Solana cluster */
export function toPrivySolanaChain(chain: string): PrivySolanaChain {
  if (chain.includes('devnet')) {
    return 'solana:devnet';
  }

  if (chain.includes('testnet')) {
    return 'solana:testnet';
  }

  return 'solana:mainnet';
}
