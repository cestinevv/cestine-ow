import type { PublicKey, SimulateTransactionConfig } from '@solana/web3.js';

import { formatSimulationFailure } from '@/hooks/solana/dramaMint/formatSolanaTransactionError';
import useGlobalStore from '@/stores/global';
import {
  DirectWalletSimulationFailedError,
  formatLamportsAsSol,
  SolanaInsufficientPayTokenError,
  SolanaInsufficientSolError,
  serializeInsufficientSol,
} from './errors';
import { parseDirectWalletSimulationFailure } from './parseSimulation';
import {
  type DirectWalletSimulationAccountsResult,
  evaluateDirectWalletSolConsumption,
  parseWalletNativeBalanceToLamports,
  readPostSimulateLamportsFromSimulation,
  serializeDirectWalletSolConsumption,
  ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK_LAMPORTS,
  ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK_REASON,
} from './solBalance';

type DirectWalletSimulationResult = DirectWalletSimulationAccountsResult;

/**
 * 直连钱包 simulate 配置：附带 fee payer 账户以便读取 post-balance。
 * @param feePayer - 交易 fee payer 公钥
 * @returns Solana simulateTransaction 配置
 */
export function buildDirectWalletSimulationConfig(
  feePayer: PublicKey,
): SimulateTransactionConfig {
  return {
    sigVerify: false,
    replaceRecentBlockhash: true,
    accounts: {
      encoding: 'base64',
      addresses: [feePayer.toBase58()],
    },
  };
}

function assertDirectWalletSolBalance(
  logPrefix: string,
  simulation: DirectWalletSimulationAccountsResult,
): void {
  const postSimulateLamports =
    readPostSimulateLamportsFromSimulation(simulation);
  if (postSimulateLamports === undefined) {
    console.warn(`${logPrefix} solBalance.skipped`, {
      reason: 'post_balance_unavailable',
      unitsConsumed: simulation.value.unitsConsumed,
    });
    return;
  }

  const walletNativeBalance = useGlobalStore.getState().walletNativeBalance;
  const estimate = evaluateDirectWalletSolConsumption({
    walletNativeBalance,
    postSimulateLamports,
  });

  console.log(`${logPrefix} solBalance.consumption`, {
    unitsConsumed: simulation.value.unitsConsumed,
    ...serializeDirectWalletSolConsumption(estimate),
  });

  const shortfallLamports =
    estimate.consumedLamports > estimate.currentLamports
      ? estimate.consumedLamports - estimate.currentLamports
      : 0n;

  console.log(`${logPrefix} solBalance.balanceCheck`, {
    walletNativeBalance,
    ...serializeDirectWalletSolConsumption(estimate),
    sufficient: shortfallLamports === 0n,
  });

  if (shortfallLamports === 0n) {
    console.log(`${logPrefix} solBalance.ok`);
    return;
  }

  console.error(`${logPrefix} solBalance.insufficient`, {
    walletNativeBalance,
    currentSol: formatLamportsAsSol(estimate.currentLamports),
    consumedSol: formatLamportsAsSol(estimate.consumedLamports),
    shortfallLamports: shortfallLamports.toString(),
    shortfallSol: formatLamportsAsSol(shortfallLamports),
  });

  throw new SolanaInsufficientSolError({
    currentLamports: estimate.currentLamports,
    requiredLamports: estimate.consumedLamports,
    shortfallLamports,
  });
}

/**
 * 钱包直连 simulate 统一门禁：
 * 1. 失败时解析 SOL rent / 支付代币 / 合约错误并抛出语义化错误；
 * 2. 成功时校验 fee payer 余额是否覆盖模拟实际消耗。
 *
 * @param logPrefix - 日志前缀（如 `[mintActorNftOnChain]`）
 * @param simulation - simulate 返回值
 * @param context - 附加日志上下文
 * @throws {SolanaInsufficientSolError} SOL 不足或 post-simulate 余额不够
 * @throws {SolanaInsufficientPayTokenError} USDC 等支付代币不足
 * @throws {DirectWalletSimulationFailedError} 其它 simulate 失败
 */
export function assertDirectWalletSimulationSucceeded(
  logPrefix: string,
  simulation: DirectWalletSimulationResult,
  context?: Record<string, unknown>,
): void {
  if (!simulation.value.err) {
    assertDirectWalletSolBalance(logPrefix, simulation);
    return;
  }

  const walletNativeBalance = useGlobalStore.getState().walletNativeBalance;
  const feePayerLamports =
    parseWalletNativeBalanceToLamports(walletNativeBalance);

  const failure = parseDirectWalletSimulationFailure(simulation, {
    feePayerLamports,
  });

  console.error(`${logPrefix} simulate.failed`, {
    err: simulation.value.err,
    logs: simulation.value.logs,
    unitsConsumed: simulation.value.unitsConsumed,
    failureKind: failure.kind,
    insufficientSolSource:
      failure.kind === 'insufficient_sol' ? failure.source : undefined,
    insufficientSol:
      failure.kind === 'insufficient_sol'
        ? serializeInsufficientSol(failure.details)
        : null,
    insufficientSolRent:
      failure.kind === 'insufficient_sol_rent'
        ? { accountIndex: failure.accountIndex }
        : null,
    storyProgramCode:
      failure.kind === 'story_program' ? failure.code : undefined,
    ...context,
  });

  if (
    failure.kind === 'insufficient_sol' &&
    failure.source === 'zero_balance_account_not_found'
  ) {
    console.error(`${logPrefix} simulate.failed.zeroBalanceAccountNotFound`, {
      reason: ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK_REASON,
      description:
        'fee payer store 余额为 0 且 simulate 返回 AccountNotFound；required 仅为签名费兜底，不代表真实 rent/transfer 需求',
      walletNativeBalance,
      feePayerLamports: feePayerLamports.toString(),
      simulateErr: simulation.value.err,
      simulateLogs: simulation.value.logs,
      unitsConsumed: simulation.value.unitsConsumed,
      fallbackRequiredLamports:
        ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK_LAMPORTS.toString(),
      fallbackRequiredSol: formatLamportsAsSol(
        ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK_LAMPORTS,
      ),
      ...serializeInsufficientSol(failure.details),
      ...context,
    });
  }

  if (failure.kind === 'insufficient_sol') {
    throw new SolanaInsufficientSolError(failure.details, {
      insufficientSolSource: failure.source,
    });
  }

  if (failure.kind === 'insufficient_sol_rent') {
    throw new SolanaInsufficientSolError(undefined, {
      rentAccountIndex: failure.accountIndex,
    });
  }

  if (failure.kind === 'insufficient_pay_token') {
    throw new SolanaInsufficientPayTokenError();
  }

  if (failure.kind === 'story_program') {
    throw new DirectWalletSimulationFailedError({
      simulationErr: simulation.value.err,
      logs: simulation.value.logs,
      storyProgramCode: failure.code,
      storyProgramMessage: failure.message,
    });
  }

  throw new DirectWalletSimulationFailedError({
    simulationErr: simulation.value.err,
    logs: simulation.value.logs,
    storyProgramMessage: formatSimulationFailure(simulation),
  });
}
