import type { ClusterUrl } from '@solana/kit';
import { SolanaProvider } from '@solana/react-hooks';
import { type ReactNode, useMemo } from 'react';

import { getChainRpcHttp } from '@/hooks/solana/chainRpcConfig';
import {
  getCurrentChain,
  getSolanaClusterMonikerFromEnv,
} from '@/solana/chainConfig';
import { useConfigStore } from '@/stores/config';

interface SolanaReactHooksProviderProps {
  children: ReactNode;
}

// SWR 查询层配置：组件外提升为常量，避免每次渲染生成新引用导致内部客户端重建
const SWR_QUERY_CONFIG = { config: { revalidateOnFocus: false } } as const;

/**
 * 挂载 `@solana/react-hooks` 所需的 Solana 客户端上下文（含 SWR 查询层）。
 *
 * RPC 端点**完全**来自 `chainlinks.<chain>.rpc.http`（Admin 配置中心，经 zustand persist 落盘）。
 * 当 chainlinks 尚未拉到（SSR 首屏 / 用户首次冷启动）时不挂 `SolanaProvider`：
 *  - 避免 SSR 阶段无意义的 `warmupCluster` 把 RPC 配额消耗殆尽；
 *  - 钱包/链上交互组件仅在用户登录后才进入渲染树，那时 chainlinks 已就绪。
 */
export function SolanaReactHooksProvider({
  children,
}: SolanaReactHooksProviderProps) {
  // 用 selector 精确订阅，避免 store 其它字段变化触发本组件 re-render → SolanaProvider 重建 → 重发 warmupCluster
  const chainlinks = useConfigStore((s) => s.chainlinks);
  const chain = getCurrentChain();
  const rpcUrl = getChainRpcHttp(chainlinks, chain);

  // config 对象按 rpcUrl 缓存引用，rpcUrl 不变时 SolanaProvider 内部不会重建 RPC client / 重发 getLatestBlockhash
  const config = useMemo(() => {
    if (!rpcUrl) return null;
    return {
      cluster: getSolanaClusterMonikerFromEnv(),
      rpc: rpcUrl as ClusterUrl,
      walletConnectors: [],
    };
  }, [rpcUrl]);

  if (!config) {
    return <>{children}</>;
  }

  return (
    <SolanaProvider config={config} query={SWR_QUERY_CONFIG}>
      {children}
    </SolanaProvider>
  );
}
