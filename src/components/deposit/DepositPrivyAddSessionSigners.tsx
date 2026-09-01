import {
  useCreateWallet as useCreateEvmWallet,
  useWallets as useEvmWallets,
  usePrivy,
  useSessionSigners,
} from '@privy-io/react-auth';
import { useCreateWallet as useCreateExtendedWallet } from '@privy-io/react-auth/extended-chains';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Privy extended-chains 里需要额外 createWallet 的链。
 * EVM / Solana 走主 SDK；Tron / Sui 需 `@privy-io/react-auth/extended-chains`。
 */
type ExtendedChain = 'tron' | 'sui';

/** 可挂后端 Session Signer 的链（与 Policy env 一一对应） */
type AuthorizedChain = 'ethereum' | 'solana' | 'tron' | 'sui';

/** `user.linkedAccounts` 中 type === 'wallet' 的账户形状（运行时窄化用） */
type WalletLinkedAccount = {
  address: string;
  chainType?: string;
  type?: string;
  walletClientType?: string;
  connectorType?: string;
};

const EXTENDED_CHAINS: ExtendedChain[] = ['tron', 'sui'];
const AUTHORIZED_CHAINS: AuthorizedChain[] = [
  'ethereum',
  'solana',
  'tron',
  'sui',
];

/** 登出清空 state 时复用同一空对象引用，减少无意义 re-render */
const EMPTY_EXTENDED_ADDRESSES: Partial<Record<ExtendedChain, string>> = {};

/**
 * 登录后先等 Privy iframe / channel secret 就绪再 createWallet。
 * 过早调用常报 "Channel secret not available yet"。
 */
const PRIVY_CHANNEL_READY_DELAY_MS = 1000;

/** 仅对 channel 未就绪错误做退避重试的基础间隔（实际 = 基数 × 第几次尝试） */
const PRIVY_WALLET_CREATE_RETRY_DELAY_MS = 800;

/** createWallet 遇 channel 未就绪时的最大尝试次数（含首次） */
const PRIVY_WALLET_CREATE_MAX_ATTEMPTS = 3;

/** 后端 Session Signer ID（Privy Dashboard / 后端同学提供） */
const SESSION_SIGNER_ID = String(
  import.meta.env.VITE_PRIVY_SESSION_SIGNER_ID ?? '',
);

/** 各链 Policy ID；缺配置的链在授权时 skip + warn */
const SESSION_SIGNER_POLICY_IDS: Record<AuthorizedChain, string> = {
  ethereum: String(import.meta.env.VITE_PRIVY_EVM_POLICY_ID ?? ''),
  solana: String(import.meta.env.VITE_PRIVY_SVM_POLICY_ID ?? ''),
  tron: String(import.meta.env.VITE_PRIVY_TRON_POLICY_ID ?? ''),
  sui: String(import.meta.env.VITE_PRIVY_SUI_POLICY_ID ?? ''),
};

/**
 * 从 Privy `linkedAccounts` 里按链类型取**嵌入式**钱包地址。
 * 覆盖「用户历史已创建过、但当前 hooks 列表尚未 hydrate」的情况。
 * 禁止取外部 MetaMask / Phantom，保证与充值收款 / Session Signer 口径一致。
 */
function getLinkedWalletAddress(
  linkedAccounts: readonly unknown[] | undefined,
  chainType: string,
) {
  const account = linkedAccounts?.find((item): item is WalletLinkedAccount => {
    if (
      !item ||
      typeof item !== 'object' ||
      !('type' in item) ||
      item.type !== 'wallet' ||
      !('chainType' in item) ||
      item.chainType !== chainType ||
      !('address' in item) ||
      typeof item.address !== 'string'
    ) {
      return false;
    }

    const walletClientType =
      'walletClientType' in item
        ? (item as WalletLinkedAccount).walletClientType
        : undefined;
    const connectorType =
      'connectorType' in item
        ? (item as WalletLinkedAccount).connectorType
        : undefined;

    // Tron / Sui 仅由 Privy create，无外部登录钱包；EVM / Solana 必须限定嵌入式
    if (chainType === 'tron' || chainType === 'sui') {
      return true;
    }

    return walletClientType === 'privy' || connectorType === 'embedded';
  });

  return account?.address;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** 识别 Privy 通道尚未就绪的瞬时错误，其它错误不重试 */
function isPrivyChannelNotReadyError(error: unknown) {
  return error instanceof Error
    ? error.message.includes('Channel secret not available yet')
    : String(error).includes('Channel secret not available yet');
}

/** Session Signer 已挂过同一 signer（重复授权） */
function isDuplicateSignerError(error: unknown) {
  return asErrorMessage(error).includes('Duplicate signer');
}

/**
 * 对 createWallet 做有限次重试：仅 channel 未就绪时退避，其它错误立刻抛出。
 */
async function withPrivyChannelRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= PRIVY_WALLET_CREATE_MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        !isPrivyChannelNotReadyError(error) ||
        attempt === PRIVY_WALLET_CREATE_MAX_ATTEMPTS
      ) {
        throw error;
      }

      await delay(PRIVY_WALLET_CREATE_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

/**
 * 多链充值地址补建 + Session Signer 自动授权（无 UI，邮箱充值弹窗打开时挂载）。
 *
 * 职责：
 * 1. 弹窗打开后读取 Privy **嵌入式** EVM / Solana / Tron / Sui 地址；
 * 2. 缺失时主动 create（EVM + extended Tron/Sui；Solana 依赖 Provider 的 createOnLogin）；
 * 3. 地址集合变化时 `console.log` 汇总，便于核对充值收款地址；
 * 4. 地址就绪后对各链自动 `addSessionSigners`（后端代签），结果打 console。
 *
 * 产品口径：邮箱转账收款地址一律是这四个嵌入式地址（与 `usePrivyDepositAddresses` 一致）。
 */
export function DepositPrivyAddSessionSigners() {
  const { authenticated, user } = usePrivy();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { createWallet: createEvmWallet } = useCreateEvmWallet();
  const { addSessionSigners } = useSessionSigners();

  // Tron / Sui 等 extended chain 的创建入口
  const { createWallet } = useCreateExtendedWallet();

  // 本组件主动 create 或从 linkedAccounts 灌入的 Tron / Sui 地址
  const [extendedAddresses, setExtendedAddresses] = useState<
    Partial<Record<ExtendedChain, string>>
  >({});

  // 已对哪个 userId 跑过「补建缺失钱包」，避免同会话重复 create
  const provisionedUserIdRef = useRef<string | null>(null);

  // 上次已打印的 addresses JSON，用于去重，避免 effect 抖动刷屏
  const lastPrintedKeyRef = useRef('');

  /**
   * 已尝试授权的 userId + chain 集合，避免同会话对同一链重复狂调 addSessionSigners。
   * 登出时清空，换用户或再登录可重新跑（Duplicate 会安静处理）。
   */
  const delegatedAttemptKeysRef = useRef<Set<string>>(new Set());

  /**
   * create / 地址 / linkedAccounts / addSessionSigners 用 ref 同步最新值，
   * 让「只依赖 authenticated + userId」的 provision effect 仍能读到最新闭包外状态，
   * 且不必把 createWallet 函数引用塞进依赖引发重复创建。
   */
  const createEvmWalletRef = useRef(createEvmWallet);
  const createExtendedWalletRef = useRef(createWallet);
  const addSessionSignersRef = useRef(addSessionSigners);
  const evmAddressRef = useRef<string | undefined>(undefined);
  const linkedAccountsRef = useRef<readonly unknown[] | undefined>(undefined);

  const userId = user?.id;
  const userEmail = user?.email?.address;
  const linkedAccounts = user?.linkedAccounts;

  // Privy 嵌入式 EVM 钱包（walletClientType === 'privy'）
  const embeddedEvmAddress = useMemo(() => {
    const wallet = evmWallets.find((item) => item.walletClientType === 'privy');

    return wallet?.address;
  }, [evmWallets]);

  // Solana 嵌入式钱包：部分版本用 walletClientType，部分挂在 standardWallet.name
  const embeddedSolanaAddress = useMemo(() => {
    const wallet = solanaWallets.find((item) => {
      const candidate = item as {
        walletClientType?: string;
        standardWallet?: { name?: string };
      };

      return (
        candidate.walletClientType === 'privy' ||
        candidate.standardWallet?.name === 'Privy'
      );
    });

    return wallet?.address;
  }, [solanaWallets]);

  // hooks 列表未就绪时，回退到 user.linkedAccounts 上的 ethereum / solana
  const linkedEvmAddress = useMemo(() => {
    return getLinkedWalletAddress(linkedAccounts, 'ethereum');
  }, [linkedAccounts]);

  const linkedSolanaAddress = useMemo(() => {
    return getLinkedWalletAddress(linkedAccounts, 'solana');
  }, [linkedAccounts]);

  // 展示与日志优先嵌入式地址，其次 linked
  const evmAddress = embeddedEvmAddress ?? linkedEvmAddress;
  const solanaAddress = embeddedSolanaAddress ?? linkedSolanaAddress;

  // --- 把可变值同步进 ref，供异步 provision / 授权流程读取 ---
  useEffect(() => {
    evmAddressRef.current = evmAddress;
  }, [evmAddress]);

  useEffect(() => {
    linkedAccountsRef.current = linkedAccounts;
  }, [linkedAccounts]);

  useEffect(() => {
    createEvmWalletRef.current = createEvmWallet;
  }, [createEvmWallet]);

  useEffect(() => {
    createExtendedWalletRef.current = createWallet;
  }, [createWallet]);

  useEffect(() => {
    addSessionSignersRef.current = addSessionSigners;
  }, [addSessionSigners]);

  /**
   * 弹窗打开后按 userId 补建缺失钱包（本次挂载内同一用户只跑一次）。
   * - 未登录：清空 provision 标记、授权尝试集合与 extended 地址 state
   * - 已登录：先灌入 linked 上已有的 Tron/Sui，再异步 create 缺失的 EVM / Tron / Sui
   */
  useEffect(() => {
    if (!authenticated || !userId) {
      provisionedUserIdRef.current = null;
      delegatedAttemptKeysRef.current.clear();
      setExtendedAddresses((addresses) =>
        Object.keys(addresses).length > 0
          ? EMPTY_EXTENDED_ADDRESSES
          : addresses,
      );
      return;
    }

    // 同一用户已 provision 过则跳过，防止 Strict Mode / 依赖抖动重复 create
    if (provisionedUserIdRef.current === userId) {
      return;
    }

    provisionedUserIdRef.current = userId;

    const currentLinkedAccounts = linkedAccountsRef.current;

    // 先把 linkedAccounts 里已有的 Tron/Sui 写入 state，避免重复 create
    const existingAddresses = EXTENDED_CHAINS.reduce<
      Partial<Record<ExtendedChain, string>>
    >((result, chainType) => {
      const address = getLinkedWalletAddress(currentLinkedAccounts, chainType);

      if (address) {
        result[chainType] = address;
      }

      return result;
    }, {});

    setExtendedAddresses((addresses) => {
      const currentKey = JSON.stringify(addresses);
      const nextKey = JSON.stringify(existingAddresses);

      return currentKey === nextKey ? addresses : existingAddresses;
    });

    // effect 清理时置 true，阻止异步 create 完成后再 setState
    let cancelled = false;

    /** 无 EVM 地址时再 create；已有 linked / 当前 hooks 地址则跳过 */
    const createMissingEvmWallet = async () => {
      const existingEvmAddress = getLinkedWalletAddress(
        linkedAccountsRef.current,
        'ethereum',
      );

      if (existingEvmAddress || evmAddressRef.current) {
        return;
      }

      try {
        const wallet = await withPrivyChannelRetry(() =>
          createEvmWalletRef.current(),
        );

        if (cancelled) {
          return;
        }

        console.log('[DepositPrivyAddSessionSigners] evm.created', {
          address: wallet.address,
        });
      } catch (error) {
        console.error('[DepositPrivyAddSessionSigners] evm.create failed', {
          error,
        });
      }
    };

    /**
     * 等待 channel 就绪 → 补 EVM → 逐个补 Tron/Sui。
     * Solana 一般由 PrivyProvider `embeddedWallets.solana.createOnLogin` 覆盖，此处不 create。
     */
    const createMissingWallets = async () => {
      await delay(PRIVY_CHANNEL_READY_DELAY_MS);

      if (cancelled) {
        return;
      }

      await createMissingEvmWallet();

      for (const chainType of EXTENDED_CHAINS) {
        if (existingAddresses[chainType]) {
          continue;
        }

        try {
          const { wallet } = await withPrivyChannelRetry(() =>
            createExtendedWalletRef.current({ chainType }),
          );

          if (cancelled) {
            return;
          }

          setExtendedAddresses((addresses) => ({
            ...addresses,
            [chainType]: wallet.address,
          }));
        } catch (error) {
          console.error('[DepositPrivyAddSessionSigners] create failed', {
            chainType,
            error,
          });
        }
      }
    };

    void createMissingWallets();

    return () => {
      cancelled = true;
    };
  }, [authenticated, userId]);

  /**
   * 地址集合变化时打印一次汇总日志（按 JSON 去重）。
   * `evmNetworks` 标明同一 EVM 地址可覆盖的充值网络口径（产品约定，非 Privy API）。
   */
  useEffect(() => {
    if (!authenticated || !userId) {
      return;
    }

    const addresses = {
      evm: evmAddress,
      solana: solanaAddress,
      tron: extendedAddresses.tron,
      sui: extendedAddresses.sui,
    };
    const printedKey = JSON.stringify(addresses);

    if (printedKey === lastPrintedKeyRef.current) {
      return;
    }

    lastPrintedKeyRef.current = printedKey;

    console.log('[DepositPrivyAddSessionSigners] login.wallet.addresses', {
      userId,
      email: userEmail,
      addresses,
      evmNetworks: ['ethereum', 'bsc', 'arbitrum'],
    });
  }, [
    authenticated,
    evmAddress,
    extendedAddresses.sui,
    extendedAddresses.tron,
    solanaAddress,
    userEmail,
    userId,
  ]);

  /**
   * 四链地址全部就绪后，才对各链自动挂后端 Session Signer（无 confirm，联调脚手架）。
   * - ethereum / solana / tron / sui 缺任一地址 → 不调用 authorizeReadyChains
   * - 缺 SESSION_SIGNER_ID / 某链 policy → skip + warn
   * - Duplicate signer → 视为已授权（info）
   * - 同 userId+chain 同会话只尝试一次，避免 effect 抖动刷屏
   */
  useEffect(() => {
    if (!authenticated || !userId) {
      return;
    }

    if (!SESSION_SIGNER_ID) {
      console.warn(
        '[DepositPrivyAddSessionSigners] sessionSigner.skip: missing VITE_PRIVY_SESSION_SIGNER_ID',
      );
      return;
    }

    const chainAddresses: Record<AuthorizedChain, string | undefined> = {
      ethereum: evmAddress,
      solana: solanaAddress,
      tron: extendedAddresses.tron,
      sui: extendedAddresses.sui,
    };

    // 四链地址必须全部存在，才进入授权流程
    const allAddressesReady = AUTHORIZED_CHAINS.every((chainType) =>
      Boolean(chainAddresses[chainType]),
    );

    if (!allAddressesReady) {
      return;
    }

    let cancelled = false;

    const authorizeReadyChains = async () => {
      for (const chainType of AUTHORIZED_CHAINS) {
        if (cancelled) {
          return;
        }

        const address = chainAddresses[chainType];
        const policyId = SESSION_SIGNER_POLICY_IDS[chainType];
        const attemptKey = `${userId}:${chainType}`;

        if (delegatedAttemptKeysRef.current.has(attemptKey)) {
          continue;
        }

        // 上方已保证四链齐全；此处再收窄类型
        if (!address) {
          continue;
        }

        if (!policyId) {
          console.warn(
            '[DepositPrivyAddSessionSigners] sessionSigner.skip: missing policy',
            { chainType },
          );
          delegatedAttemptKeysRef.current.add(attemptKey);
          continue;
        }

        // 先标记再调用，避免并发 effect 重复 fire；失败且非 Duplicate 时移除以便地址/配置修复后可重试
        delegatedAttemptKeysRef.current.add(attemptKey);

        try {
          console.log(
            '---------------authorizeReadyChains start---------------',
            {
              address,
              chainType,
            },
          );
          await addSessionSignersRef.current({
            address,
            signers: [
              {
                signerId: SESSION_SIGNER_ID,
                policyIds: [policyId],
              },
            ],
          });

          if (cancelled) {
            return;
          }

          console.log(
            '[DepositPrivyAddSessionSigners] sessionSigner.authorized',
            {
              chainType,
              address,
              signerId: SESSION_SIGNER_ID,
              policyId,
            },
          );
        } catch (error) {
          if (cancelled) {
            return;
          }

          if (isDuplicateSignerError(error)) {
            console.info(
              '[DepositPrivyAddSessionSigners] sessionSigner.alreadyAuthorized',
              {
                chainType,
                address,
              },
            );
            continue;
          }

          delegatedAttemptKeysRef.current.delete(attemptKey);
          console.error(
            '[DepositPrivyAddSessionSigners] sessionSigner.authorize failed',
            {
              chainType,
              address,
              error,
            },
          );
        }
      }
    };

    void authorizeReadyChains();

    return () => {
      cancelled = true;
    };
  }, [
    authenticated,
    evmAddress,
    extendedAddresses.sui,
    extendedAddresses.tron,
    solanaAddress,
    userId,
  ]);

  // 纯副作用组件，不渲染任何 DOM
  return null;
}
