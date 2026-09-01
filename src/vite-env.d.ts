/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_CENTRIFUGO_WSS_BASE_URL?: string;
  readonly VITE_PLATO_TRADE_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_PRIVY_APP_ID?: string;
  readonly VITE_PRIVY_SESSION_SIGNER_ID?: string;
  readonly VITE_PRIVY_EVM_POLICY_ID?: string;
  readonly VITE_PRIVY_SVM_POLICY_ID?: string;
  readonly VITE_PRIVY_SUI_POLICY_ID?: string;
  readonly VITE_PRIVY_TRON_POLICY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
