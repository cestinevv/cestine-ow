# 全局配置系统使用指南

## 📁 已创建的文件

1. **环境变量**
   - `.env` - 测试环境配置（Sepolia）
   - `.env.production` - 生产环境配置（BSC）

2. **工具和配置**
   - `src/solana/chainConfig.ts` - 链配置工具
   - `src/stores/config.ts` - 配置 Store（Zustand）
   - `src/hooks/useGlobalConfig.ts` - 全局配置 Hook
   - `src/vite-env.d.ts` - TypeScript 类型声明

3. **已修改的文件**
   - `src/stores/updater.ts` - 应用启动时初始化配置

## 🚀 使用方式

### 1. 在组件中获取充值配置

```typescript
import { useConfigStore } from '@/stores/config';

function DepositComponent() {
  const { depositConfig, isInitialized } = useConfigStore();

  if (!isInitialized) {
    return <div>Loading configuration...</div>;
  }

  // 使用配置
  const vaultAddress = depositConfig?.vaultAddress;
  const tokenAddress = depositConfig?.token.address;
  const minDeposit = depositConfig?.token.minDeposit;
  
  return (
    <div>
      <p>Vault: {vaultAddress}</p>
      <p>Min Deposit: {minDeposit} USDT</p>
    </div>
  );
}
```

### 2. 在组件中获取提现配置

```typescript
import { useConfigStore } from '@/stores/config';

function WithdrawComponent() {
  const { withdrawConfig } = useConfigStore();

  const minWithdraw = withdrawConfig?.minWithdraw;
  const maxWithdraw = withdrawConfig?.maxWithdraw;
  const fee = withdrawConfig?.fee;
  
  return (
    <div>
      <p>Min Withdraw: {minWithdraw} USDT</p>
      <p>Max Withdraw: {maxWithdraw} USDT</p>
      <p>Fee: {fee} USDT</p>
    </div>
  );
}
```

### 3. 获取完整链配置

```typescript
import { useConfigStore } from '@/stores/config';

function ChainInfoComponent() {
  const { chainlinks, currentChain } = useConfigStore();

  const chainInfo = chainlinks?.[currentChain];
  
  return (
    <div>
      <p>Chain: {chainInfo?.name}</p>
      <p>Chain ID: {chainInfo?.chainId}</p>
      <p>Explorer: {chainInfo?.explorer.url}</p>
      <p>RPC: {chainInfo?.rpc.http}</p>
    </div>
  );
}
```

### 4. 手动刷新配置

```typescript
import { useGlobalConfig } from '@/hooks/useGlobalConfig';

function SettingsComponent() {
  const { refetch, isLoading } = useGlobalConfig();

  const handleRefresh = () => {
    refetch();
  };

  return (
    <button onClick={handleRefresh} disabled={isLoading}>
      刷新配置
    </button>
  );
}
```

## 🔧 环境切换

### 测试环境（Sepolia）
```bash
# 使用 .env 文件（默认）
pnpm dev
```

### 生产环境（BSC）
```bash
# 使用 .env.production 文件
pnpm build
pnpm preview
```

### 手动切换
修改 `.env` 文件中的 `VITE_CHAIN` 值：
- `VITE_CHAIN=sepolia` - 使用 Sepolia 测试网
- `VITE_CHAIN=bsc` - 使用 BSC 主网

## 📊 配置数据结构

### DepositConfig（充值配置）
```typescript
{
  chain: string;           // 链名称：'sepolia' 或 'bsc'
  chainId: number;         // 链 ID：11155111 或 56
  chainName: string;       // 显示名称：'Sepolia' 或 'BNB Smart Chain'
  chainIcon: string;       // 链图标 URL
  rpc: string;            // RPC 端点
  vaultAddress: string;   // Vault 合约地址
  testnet: boolean;       // 是否测试网
  explorer: {
    url: string;          // 区块链浏览器 URL
    name: string;         // 浏览器名称
  };
  token: {
    address: string;      // USDT 代币地址
    symbol: string;       // 'USDT'
    decimals: number;     // 精度（通常为 18）
    icon: string;         // 代币图标
    minDeposit: string;   // 最小充值金额
    scale: number;        // 显示精度
    fullSymbol: string;   // 完整名称
  };
}
```

### WithdrawConfig（提现配置）
```typescript
{
  chain: string;          // 链名称
  chainId: number;        // 链 ID
  chainName: string;      // 显示名称
  minWithdraw: string;    // 最小提现金额
  maxWithdraw: string;    // 最大提现金额
  fee: string;           // 提现手续费
  token: {
    symbol: string;       // 'USDT'
    decimals: number;     // 精度
  };
}
```

## 🔍 调试

在浏览器控制台查看日志：
```
🔗 Active Chain: sepolia (Chain ID: 11155111)
🔍 Global Config Query: { data: {...}, envChain: 'sepolia' }
✅ Configuration loaded successfully: { chain: 'sepolia', deposit: {...}, withdraw: {...} }
```

## ✨ 特性

- ✅ 环境变量自动切换链
- ✅ 配置数据持久化到 localStorage
- ✅ 应用启动时自动加载配置
- ✅ 完整的 TypeScript 类型支持
- ✅ 充值、提现等配置统一管理
- ✅ 支持手动刷新配置

## 🎯 下一步

现在你可以：
1. 在充值对话框中使用 `depositConfig`
2. 在提现对话框中使用 `withdrawConfig`
3. 在其他需要链信息的地方使用 `chainlinks` 和 `currentChain`

所有配置会在应用启动时自动加载并缓存！
