链上钱包余额查询（SOL / SPL Token），由 `@solana/react-hooks` + Privy 钱包地址驱动，经 `GlobalUpdater` 同步到全局 Store。

### 涉及文件

| 文件 | 职责 |
|------|------|
| [`useAppWalletNativeBalance.ts`](../src/hooks/solana/useAppWalletNativeBalance.ts) | SOL 原生余额（`useBalance`） |
| [`useAppWalletTokenBalance.ts`](../src/hooks/solana/useAppWalletTokenBalance.ts) | SPL Token 余额（`useSplToken`），入参为 `Token` |
| [`updater.ts`](../src/stores/updater.ts) | 挂载上述 Hook，写入 `useGlobalStore` |
| [`chainRpcConfig.ts`](../src/hooks/solana/chainRpcConfig.ts) | `findChainTokenByAsset`：从 `chainlinks` 解析 `usdcToken` / `storyToken` |
| [`SolanaReactHooksProvider.tsx`](../src/providers/SolanaReactHooksProvider.tsx) | 提供 RPC / cluster（devnet 见 `.env.development`） |

> 已移除：`fetchSolanaTokenBalance.ts`、`useSolanaTokenBalance.ts`（原 React Query + 直连 RPC 方案）。

### 全局字段（链上余额）

| Store 字段 | 来源 | 说明 |
|------------|------|------|
| `walletNativeBalance` | `nativeBalance` | SOL uiAmount 字符串 |
| `walletUsdcBalance` | `usdcToken` mint 查询 | 链上 USDC |
| `walletStoryBalance` | `storyToken` mint 查询 | 链上 STORY |

与平台可领取余额区分：`claimableUsdcBalance` / `claimableStoryBalance` 仍由服务端 `useAssets` 写入，勿混用。

### 行为说明

| 能力 | 说明 |
|------|------|
| **钱包地址** | `useAppPrivyAccount().solanaAddress`（Privy 当前 Solana 账户） |
| **RPC / 网络** | `SolanaReactHooksProvider`：`VITE_CHAIN=solana-devnet` 时 `cluster: devnet`，RPC 来自 `chainlinks[currentChain].rpc.http`（Admin 配置中心，见 `getChainRpcHttp`） |
| **Token 配置** | `useGlobalConfig` → `useConfigStore` 的 `usdcToken` / `storyToken`（`findChainTokenByAsset` 按 **symbol 优先** 匹配） |
| **SPL 查询** | `useSplToken(mint, { owner: solanaAddress })`；mint 或地址未就绪时不请求，返回 `'0'` |
| **轮询** | SPL 默认 5s `refreshInterval`（mint 就绪时） |
| **UI 展示** | 如 [`LoginButton.tsx`](../src/components/LoginButton.tsx) 读 `walletUsdcBalance` / `walletStoryBalance`，`formatNumber(..., 2)` 固定 2 位小数 |

### 组件内直接使用 Hook（可选）

仅在需要局部刷新、不走全局 Store 时使用：

```tsx
import { useAppWalletTokenBalance } from '@/hooks/solana/useAppWalletTokenBalance';
import { useConfigStore } from '@/stores/config';

function Example() {
  const usdcToken = useConfigStore((s) => s.usdcToken);
  const { tokenBalance, refreshBalance, isLoading } =
    useAppWalletTokenBalance(usdcToken);

  if (isLoading) return <span>…</span>;
  return <span>{tokenBalance}</span>;
}
```

`Token` 类型见 [`src/types/index.ts`](../src/types/index.ts)（`address` / `symbol` / `decimals` 等）。

### 全局 Store 消费（推荐）

```tsx
import useGlobalStore from '@/stores/global';
import { formatNumber } from '@/utils';

function WalletUsdcLabel() {
  const walletUsdcBalance = useGlobalStore((s) => s.walletUsdcBalance);
  return <span>{formatNumber(walletUsdcBalance, 2)} USDC</span>;
}
```

余额由根节点 [`GlobalUpdater`](../src/stores/updater.ts) 自动维护，无需在业务组件重复挂 Hook。

### 交易后刷新

- **平台资产（可领取余额）**：`refreshWalletAssets()`（`useAssets` refetch）
- **链上 SPL**：在对应场景调用 `useAppWalletTokenBalance` 返回的 `refreshBalance`，或依赖 Hook 内置 5s 轮询

### 排查余额为 0

1. 控制台确认 `solanaAddress` 与区块浏览器查看的地址一致  
2. `useConfigStore.getState().usdcToken?.address` 是否为当前链真实 USDC mint  
3. 确认 `.env.development` 为 devnet，且 Solscan 链接带 `?cluster=devnet`  
4. 区分链上 `wallet*` 与平台 `claimable*`
