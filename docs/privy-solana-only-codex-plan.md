# Privy 登录弹窗与 Solana-only 改造方案

## 1. 改造目标

当前项目使用 Privy 登录，业务侧全局只使用 Solana，不再需要 EVM 交互。

本次改造目标：

1. Privy 钱包登录弹窗只展示 Solana 钱包入口。
2. 保留以下钱包：
   - MetaMask
   - Phantom
   - OKX Wallet
3. 避免 MetaMask 同时出现 EVM 和 Solana 两个登录入口。
4. 所有钱包连接均明确使用 Solana。
5. 删除不再需要的 `WagmiProvider` 和 EVM 相关配置。
6. 保留：
   - 邮箱登录
   - Solana Embedded Wallet
   - 自定义 Solana RPC
   - 多语言配置
   - MetaMask / Phantom / OKX Wallet 的 Solana 登录能力

---

## 2. 当前问题

当前配置中使用了：

```ts
walletChainType: 'ethereum-and-solana'
```

该配置允许 Privy 同时展示 Ethereum 和 Solana 钱包入口。

当 MetaMask 同时被识别为 EVM 钱包和 Solana 钱包时，登录弹窗可能出现两个 MetaMask 入口。

此外，项目中仍然包裹了：

```tsx
<WagmiProvider config={privyWagmiConfig}>
```

Wagmi 主要用于 Ethereum/EVM 钱包状态、链切换、合约调用和交易。如果项目全局只使用 Solana，则不再需要。

---

## 3. 核心修改方案

### 3.1 将 Privy 钱包模式改为 Solana-only

将：

```ts
walletChainType: 'ethereum-and-solana'
```

修改为：

```ts
walletChainType: 'solana-only'
```

作用：

- Privy 钱包弹窗只进入 Solana 连接上下文。
- 不再展示 EVM 钱包入口。
- MetaMask 不应再同时出现 Ethereum 和 Solana 两个选项。

---

### 3.2 保留三个钱包

不要删除 OKX Wallet。

钱包列表保持为：

```ts
walletList: ['metamask', 'phantom', 'okx_wallet']
```

期望弹窗中最多展示：

- MetaMask
- Phantom
- OKX Wallet

这些钱包均应按 Solana 钱包方式连接。

---

### 3.3 保留 Solana Connectors

继续保留：

```ts
externalWallets: {
  solana: {
    connectors: toSolanaWalletConnectors(),
  },
},
```

建议通过 `useMemo` 创建 connectors，避免每次渲染生成新实例：

```ts
const solanaConnectors = useMemo(
  () => toSolanaWalletConnectors(),
  [],
);
```

然后使用：

```ts
externalWallets: {
  solana: {
    connectors: solanaConnectors,
  },
},
```

---

### 3.4 删除 WagmiProvider

删除以下导入：

```ts
import { WagmiProvider } from '@privy-io/wagmi';
import { privyWagmiConfig } from '@/privyWagmiConfig';
```

将：

```tsx
<PrivyProvider
  key={privyLocale}
  appId={APP_ID}
  config={privyConfig}
>
  <WagmiProvider config={privyWagmiConfig}>
    {children}
  </WagmiProvider>
</PrivyProvider>
```

修改为：

```tsx
<PrivyProvider
  key={privyLocale}
  appId={APP_ID}
  config={privyConfig}
>
  {children}
</PrivyProvider>
```

---

## 4. 目标代码结构

请将现有 `PrivyProviderWrapper` 调整为以下结构。

```tsx
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
} from '@solana/kit';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getPrivySolanaRpcEndpoints } from '@/hooks/solana/chainRpcConfig';
import { useConfigStore } from '@/stores/config';

const APP_ID = import.meta.env.VITE_PRIVY_APP_ID || '';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

function mapToPrivyLocale(appLocale: string): string {
  const privySupportedLocales: Record<string, string> = {
    en: 'en',
    'zh-CN': 'zh-CN',
    ja: 'ja',
    es: 'es',
    tr: 'en',
    vi: 'en',
  };

  return privySupportedLocales[appLocale] || 'en';
}

export function PrivyProviderWrapper({
  children,
}: PrivyProviderWrapperProps) {
  const { i18n } = useTranslation();
  const privyLocale = mapToPrivyLocale(i18n.language);
  const chainlinks = useConfigStore((s) => s.chainlinks);

  const privySolanaRpcs = useMemo(() => {
    const endpoints = getPrivySolanaRpcEndpoints(chainlinks);

    const rpcs: NonNullable<
      NonNullable<
        Parameters<typeof PrivyProvider>[0]['config']
      >['solana']
    >['rpcs'] = {};

    for (const [cluster, { http, wss }] of Object.entries(endpoints)) {
      rpcs[cluster as keyof typeof rpcs] = {
        rpc: createSolanaRpc(http),
        rpcSubscriptions: createSolanaRpcSubscriptions(wss),
      };
    }

    return rpcs;
  }, [chainlinks]);

  const solanaConnectors = useMemo(
    () => toSolanaWalletConnectors(),
    [],
  );

  const privyConfig = useMemo(() => {
    const config: NonNullable<
      Parameters<typeof PrivyProvider>[0]['config']
    > = {
      appearance: {
        theme: 'light',
        accentColor: '#10B981',
        logo: '/logo.svg',

        // 全局只允许 Solana 钱包入口
        walletChainType: 'solana-only',

        // 保留 MetaMask、Phantom、OKX Wallet
        walletList: [
          'metamask',
          'phantom',
          'okx_wallet',
        ],

        ...({ locale: privyLocale } as any),
      },

      loginMethods: ['email', 'wallet'],

      embeddedWallets: {
        solana: {
          createOnLogin: 'users-without-wallets',
        },
      },

      externalWallets: {
        solana: {
          connectors: solanaConnectors,
        },
      },
    };

    if (Object.keys(privySolanaRpcs).length > 0) {
      config.solana = {
        rpcs: privySolanaRpcs,
      };
    }

    return config;
  }, [
    privyLocale,
    privySolanaRpcs,
    solanaConnectors,
  ]);

  return (
    <PrivyProvider
      key={privyLocale}
      appId={APP_ID}
      config={privyConfig}
    >
      {children}
    </PrivyProvider>
  );
}
```

---

## 5. 所有连接调用都应明确指定 Solana

除了 Provider 的全局设置，还需要检查项目中所有 Privy 钱包连接调用。

全局搜索：

```text
connectWallet(
useConnectWallet
login(
useLogin
```

如果使用 `connectWallet`，应明确传入 Solana 类型。

示例：

```tsx
import { useConnectWallet } from '@privy-io/react-auth';

export function ConnectWalletButton() {
  const { connectWallet } = useConnectWallet();

  const handleConnect = async () => {
    await connectWallet({
      walletChainType: 'solana',
      walletList: [
        'metamask',
        'phantom',
        'okx_wallet',
      ],
    });
  };

  return (
    <button onClick={handleConnect}>
      Connect wallet
    </button>
  );
}
```

注意：

- Provider 配置使用：`solana-only`
- 单次连接调用使用：`solana`

请根据当前安装的 Privy SDK 类型定义确认参数名称。如果当前 SDK 版本不支持在 `connectWallet` 中传入 `walletList`，则只传：

```ts
connectWallet({
  walletChainType: 'solana',
});
```

钱包列表继续由 Provider 的 `appearance.walletList` 控制。

---

## 6. 删除 EVM 相关代码前的全局检查

在删除 Wagmi 和 EVM 依赖前，全局搜索以下内容：

```text
WagmiProvider
privyWagmiConfig
wagmi
viem
useAccount
useWalletClient
usePublicClient
useConnect
useDisconnect
useSwitchChain
useChainId
useBalance
useReadContract
useWriteContract
useSendTransaction
useSignMessage
useSwitchNetwork
```

处理规则：

1. 如果这些 API 只用于 EVM，删除或替换为 Solana 对应实现。
2. 如果 `viem` 在其他业务中仍有独立用途，不要卸载 `viem`。
3. 如果项目没有任何 EVM 代码，可以删除：
   - `@privy-io/wagmi`
   - `wagmi`
   - `viem`（仅确认无其他引用后）

pnpm：

```bash
pnpm remove @privy-io/wagmi wagmi
```

确认 `viem` 无其他用途后：

```bash
pnpm remove viem
```

npm：

```bash
npm uninstall @privy-io/wagmi wagmi
```

确认无其他用途后：

```bash
npm uninstall viem
```

---

## 7. 不应删除的功能

本次改造不能影响以下能力：

- Privy 邮箱登录
- Phantom Solana 登录
- MetaMask Solana 登录
- OKX Wallet Solana 登录
- Privy Solana Embedded Wallet
- Solana 交易签名
- Solana Message 签名
- 自定义 Solana RPC 与 WebSocket RPC
- 多语言切换
- 当前 Privy Logo、主题色和样式

---

## 8. 兼容性说明

钱包能否作为 Solana 钱包出现，不仅由 `walletList` 决定，还取决于：

1. 用户是否安装对应浏览器扩展。
2. 钱包扩展是否暴露 Solana Wallet Standard 接口。
3. 当前 Privy SDK 是否能识别该钱包的 Solana connector。
4. MetaMask 当前版本是否启用了 Solana 支持。
5. OKX Wallet 当前版本是否启用了 Solana 支持。

因此：

- `walletList` 表示允许或优先展示的钱包品牌。
- `walletChainType: 'solana-only'` 表示只允许 Solana 连接。
- 如果某个钱包没有被 Privy 识别为 Solana 钱包，它可能不会展示，或点击后无法连接。
- 不要为了让 MetaMask 出现而重新启用 `ethereum-and-solana`，否则会再次出现双入口问题。

---

## 9. 验收标准

完成代码改动后，请验证以下场景。

### 登录弹窗

- 点击钱包登录后，不出现 Ethereum / EVM 选择。
- MetaMask 最多只出现一个入口。
- Phantom 最多只出现一个入口。
- OKX Wallet 被保留。
- 不出现重复钱包项。

### 钱包连接

- Phantom 连接后返回 Solana 地址。
- MetaMask 连接后返回 Solana 地址，而不是 `0x` 开头的 EVM 地址。
- OKX Wallet 连接后返回 Solana 地址。
- 钱包签名使用 Solana 交易或 Solana message。

### Embedded Wallet

- 邮箱新用户登录后仍按原配置创建 Solana Embedded Wallet。
- 不创建 EVM Embedded Wallet。

### 项目运行

- TypeScript 编译通过。
- ESLint 通过。
- Vite 构建通过。
- 删除 WagmiProvider 后页面正常启动。
- 项目中没有残留的 `privyWagmiConfig` 引用。
- 项目中没有因删除 Wagmi 导致的 Provider 缺失错误。

---

## 10. Codex 执行要求

请 Codex 按以下顺序执行：

1. 检查当前 `package.json` 中 Privy、Wagmi、Viem 的版本。
2. 检查当前 Privy SDK 类型定义，确认：
   - `walletChainType` 的合法值。
   - `connectWallet` 的参数格式。
   - `walletList` 是否支持 `metamask`、`phantom`、`okx_wallet`。
3. 修改 `PrivyProviderWrapper`。
4. 删除 `WagmiProvider` 和 `privyWagmiConfig` 引用。
5. 全局检查所有钱包连接调用，并限制为 Solana。
6. 全局检查所有 Wagmi/EVM hooks。
7. 仅在确认无引用后卸载相关依赖。
8. 执行 TypeScript、Lint 和 Build。
9. 修复所有编译错误。
10. 输出：
    - 修改的文件列表
    - 每个文件的修改说明
    - 是否卸载依赖
    - 构建与测试结果
    - 仍需人工测试的钱包兼容性问题

---

## 11. 最终预期

项目成为纯 Solana Privy 登录架构：

```text
PrivyProvider
├── Email Login
├── Solana Embedded Wallet
├── MetaMask Solana
├── Phantom Solana
└── OKX Wallet Solana
```

不再包含：

```text
WagmiProvider
Ethereum Wallet Login
EVM Wallet Connector
EVM Chain Selection
重复的 MetaMask EVM / Solana 登录入口
```
