import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { useTheme } from 'next-themes';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getPrivySolanaRpcEndpoints } from '@/hooks/solana/chainRpcConfig';
import { useConfigStore } from '@/stores/config';

const APP_ID = import.meta.env.VITE_PRIVY_APP_ID || '';

/** Privy 强调色（Submit / 链接文案）— 与站点 --primary / --onestory-brand-red 对齐 */
const PRIVY_ACCENT = '#E8001B';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

/**
 * 将应用的 locale 映射到 Privy 支持的 locale 格式
 *
 * 应用支持的语言 vs Privy 支持情况：
 * - en (English) ✅ Privy 支持
 * - zh-CN (简体中文) ✅ Privy 支持
 * - ja (日本語) ✅ Privy 支持
 * - es (Español) ✅ Privy 支持
 * - tr (Türkçe) ❌ Privy 不支持，回退到 en
 * - vi (Tiếng Việt) ❌ Privy 不支持，回退到 en
 */
function mapToPrivyLocale(appLocale: string): string {
  // Privy 直接支持的语言（与 APP_LOCALE_OPTIONS 对应）
  const privySupportedLocales: Record<string, string> = {
    en: 'en',
    'zh-CN': 'zh-CN',
    ja: 'ja',
    es: 'es',
    // tr 和 vi 不支持，回退到英语
    tr: 'en',
    vi: 'en',
  };

  return privySupportedLocales[appLocale] || 'en';
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  const { i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const privyLocale = mapToPrivyLocale(i18n.language);

  // 与 next-themes / data-theme 对齐；未 hydrate 时按深色，与系统默认一致
  const privyTheme = resolvedTheme === 'light' ? 'light' : 'dark';
  const chainlinks = useConfigStore((s) => s.chainlinks);
  const solanaConnectors = useMemo(() => toSolanaWalletConnectors(), []);

  const privySolanaRpcs = useMemo(() => {
    const endpoints = getPrivySolanaRpcEndpoints(chainlinks);
    const rpcs: NonNullable<
      NonNullable<Parameters<typeof PrivyProvider>[0]['config']>['solana']
    >['rpcs'] = {};

    for (const [cluster, { http, wss }] of Object.entries(endpoints)) {
      rpcs[cluster as keyof typeof rpcs] = {
        rpc: createSolanaRpc(http),
        rpcSubscriptions: createSolanaRpcSubscriptions(wss),
      };
    }

    return rpcs;
  }, [chainlinks]);

  const privyConfig = useMemo(() => {
    const config: NonNullable<Parameters<typeof PrivyProvider>[0]['config']> = {
      appearance: {
        theme: privyTheme,
        accentColor: PRIVY_ACCENT,
        logo: '/logo.svg?v=story-text',

        // 钱包登录弹窗只走 Solana，避免 MetaMask 等出现 EVM + Solana 双入口
        walletChainType: 'solana-only',
        walletList: ['metamask', 'phantom', 'okx_wallet', 'wallet_connect'],
        ...({ locale: privyLocale } satisfies Record<'locale', string>),
      },
      loginMethods: ['email', 'wallet'],
      embeddedWallets: {
        showWalletUIs: false,

        // 与 walletChainType 独立：邮箱登录（无外部钱包）时同时创建 EVM + Solana 嵌入式钱包
        ethereum: {
          createOnLogin: 'users-without-wallets',
        },
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
      config.solana = { rpcs: privySolanaRpcs };
    }

    return config;
  }, [privyLocale, privySolanaRpcs, solanaConnectors, privyTheme]);

  return (
    <PrivyProvider
      // locale / 主题变更时重建，使 appearance.theme 生效；会话由 Privy localStorage 恢复
      key={`${privyLocale}-${privyTheme}`}
      appId={APP_ID}
      config={privyConfig}
    >
      {children}
    </PrivyProvider>
  );
}
