import { LAMPORTS_PER_SOL } from '@solana/web3.js';

import {
  formatLamportsAsSol,
  type InsufficientLamportsDetails,
} from './errors';

/** 零余额 AccountNotFound 兜底：签名费（lamports），不代表真实 rent/transfer 需求。 */
export const ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK_LAMPORTS = 5_000n;

/** 专用日志 reason 字段，便于 grep。 */
export const ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK_REASON =
  'ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK' as const;

/** simulate 后 fee payer 的 SOL 消耗估算结果。 */
export type DirectWalletSolConsumption = {
  currentLamports: bigint;
  /** 交易内从 fee payer 转出的 SOL（含 rent 等，不含签名费）。 */
  transferLamports: bigint;
  simulatedFeeLamports: bigint;
  /** 模拟交易实际消耗的 SOL（transfer + fee）。 */
  consumedLamports: bigint;
  postSimulateLamports: bigint;
};

/** simulate 返回值形态（需包含 accounts 以读取 post-balance）。 */
export type DirectWalletSimulationAccountsResult = {
  value: {
    err?: unknown;
    logs?: string[] | null;
    accounts?: Array<{ lamports?: number } | null> | null;
    unitsConsumed?: number;
  };
};

/**
 * fee payer 无 SOL 时 simulate 常返回 AccountNotFound；用于构造 SOL 不足明细。
 * @returns 当前 0、所需为签名费兜底的缺口明细
 */
export function buildFeePayerZeroSolInsufficientDetails(): InsufficientLamportsDetails {
  const requiredLamports = ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK_LAMPORTS;

  return {
    currentLamports: 0n,
    requiredLamports,
    shortfallLamports: requiredLamports,
  };
}

/**
 * 将 GlobalUpdater 写入的 `walletNativeBalance`（SOL 字符串）还原为 lamports。
 * @param walletNativeBalance - store 中的 SOL 余额字符串
 * @returns 对应的 lamports；空或 "0" 时返回 0n
 */
export function parseWalletNativeBalanceToLamports(
  walletNativeBalance: string,
): bigint {
  const trimmed = walletNativeBalance.trim();
  if (!trimmed || trimmed === '0') {
    return 0n;
  }

  const [wholePart = '0', fractionPart = ''] = trimmed.split('.');
  const wholeLamports = BigInt(wholePart) * BigInt(LAMPORTS_PER_SOL);
  const fractionDigits = `${fractionPart}000000000`.slice(0, 9);
  const fractionLamports = BigInt(fractionDigits);

  return wholeLamports + fractionLamports;
}

/**
 * 从 simulate 结果的 accounts[0] 读取 fee payer 模拟后余额。
 * @param simulation - 含 accounts 的 simulate 返回值
 * @returns post-balance lamports；accounts 不可用时 undefined
 */
export function readPostSimulateLamportsFromSimulation(
  simulation: DirectWalletSimulationAccountsResult,
): bigint | undefined {
  const postAccount = simulation.value.accounts?.[0];
  const postLamports = postAccount?.lamports;
  if (postLamports === undefined || postLamports === null) {
    return undefined;
  }

  return BigInt(postLamports);
}

/**
 * 根据 simulate 前后余额差计算 fee payer 的 SOL 消耗。
 * @param params.currentLamports - fee payer 当前余额（lamports）
 * @param params.postSimulateLamports - simulate 后 fee payer 余额（lamports）
 * @param params.simulatedFeeLamports - 可选签名费拆分值，默认 5000 lamports
 * @returns 消耗明细（consumedLamports = current - post，无 buffer）
 */
export function computeDirectWalletSolConsumption(params: {
  currentLamports: bigint;
  postSimulateLamports: bigint;
  simulatedFeeLamports?: bigint;
}): DirectWalletSolConsumption {
  const simulatedFeeLamports =
    params.simulatedFeeLamports ??
    ZERO_BALANCE_ACCOUNT_NOT_FOUND_FALLBACK_LAMPORTS;
  const consumedLamports =
    params.currentLamports > params.postSimulateLamports
      ? params.currentLamports - params.postSimulateLamports
      : 0n;
  const transferLamports =
    consumedLamports > simulatedFeeLamports
      ? consumedLamports - simulatedFeeLamports
      : 0n;

  return {
    currentLamports: params.currentLamports,
    transferLamports,
    simulatedFeeLamports,
    consumedLamports,
    postSimulateLamports: params.postSimulateLamports,
  };
}

/**
 * 结合 store 余额与 simulate post-balance 估算 SOL 消耗。
 * @param params.walletNativeBalance - store 中的 SOL 字符串
 * @param params.postSimulateLamports - simulate 后 fee payer 余额
 * @param params.simulatedFeeLamports - 可选签名费拆分值
 * @returns 消耗明细
 */
export function evaluateDirectWalletSolConsumption(params: {
  walletNativeBalance: string;
  postSimulateLamports: bigint;
  simulatedFeeLamports?: bigint;
}): DirectWalletSolConsumption {
  return computeDirectWalletSolConsumption({
    currentLamports: parseWalletNativeBalanceToLamports(
      params.walletNativeBalance,
    ),
    postSimulateLamports: params.postSimulateLamports,
    simulatedFeeLamports: params.simulatedFeeLamports,
  });
}

/**
 * 将消耗明细序列化为日志友好对象（含 SOL 可读字段）。
 * @param estimate - SOL 消耗估算
 * @returns 可展开到 console.log 的字段
 */
export function serializeDirectWalletSolConsumption(
  estimate: DirectWalletSolConsumption,
) {
  return {
    currentLamports: estimate.currentLamports.toString(),
    postSimulateLamports: estimate.postSimulateLamports.toString(),
    transferLamports: estimate.transferLamports.toString(),
    simulatedFeeLamports: estimate.simulatedFeeLamports.toString(),
    consumedLamports: estimate.consumedLamports.toString(),
    currentSol: formatLamportsAsSol(estimate.currentLamports),
    transferSol: formatLamportsAsSol(estimate.transferLamports),
    simulatedFeeSol: formatLamportsAsSol(estimate.simulatedFeeLamports),
    consumedSol: formatLamportsAsSol(estimate.consumedLamports),
  };
}
