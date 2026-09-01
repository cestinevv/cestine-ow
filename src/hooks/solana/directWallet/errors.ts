import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const INSUFFICIENT_LAMPORTS_LOG_RE = /insufficient lamports (\d+), need (\d+)/i;

/** SOL 不足明细：当前 / 所需 / 缺口（lamports）。 */
export type InsufficientLamportsDetails = {
  currentLamports: bigint;
  requiredLamports: bigint;
  shortfallLamports: bigint;
};

/** SOL 不足判定来源：日志解析 vs 零余额 AccountNotFound 签名费兜底。 */
export type InsufficientSolSource = 'logs' | 'zero_balance_account_not_found';

/** 直连钱包 SOL 不足错误码；禁止原样作为 Toast 文案展示。 */
export const SOLANA_INSUFFICIENT_SOL_ERROR_CODE =
  'SOLANA_INSUFFICIENT_SOL' as const;

/** 直连钱包支付代币（USDC）不足错误码；禁止原样作为 Toast 文案展示。 */
export const SOLANA_INSUFFICIENT_PAY_TOKEN_ERROR_CODE =
  'SOLANA_INSUFFICIENT_PAY_TOKEN' as const;

/** 直连钱包 simulate 失败兜底错误码；禁止原样作为 Toast 文案展示。 */
export const DIRECT_WALLET_SIMULATION_FAILED_ERROR_CODE =
  'DIRECT_WALLET_SIMULATION_FAILED' as const;

/** EIP-1193 / 钱包标准：用户拒绝签名或发送交易。 */
export const WALLET_USER_REJECTED_CODE = 4001 as const;

/** 仅供日志 / instanceof 识别，禁止原样作为 Toast 文案展示。 */
const DIRECT_WALLET_INTERNAL_TOAST_MESSAGES = new Set<string>([
  SOLANA_INSUFFICIENT_SOL_ERROR_CODE,
  SOLANA_INSUFFICIENT_PAY_TOKEN_ERROR_CODE,
  DIRECT_WALLET_SIMULATION_FAILED_ERROR_CODE,
]);

/**
 * 判断 message 是否为直连钱包内部错误码（不可直接展示给用户）。
 * @param message - 待检查的 error.message 或文案
 * @returns 属于内部错误码时 true
 */
export function isDirectWalletInternalToastMessage(message: string): boolean {
  return DIRECT_WALLET_INTERNAL_TOAST_MESSAGES.has(message);
}

/**
 * 从 unknown 错误对象上读取钱包错误码（含嵌套 error / cause）。
 * @param error - catch 到的未知错误
 * @returns 解析到的数值 code，否则 undefined
 */
function readWalletErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const record = error as {
    code?: unknown;
    error?: { code?: unknown };
    cause?: unknown;
  };

  for (const candidate of [record.code, record.error?.code]) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }

    if (typeof candidate === 'string' && /^\d+$/.test(candidate)) {
      return Number(candidate);
    }
  }

  if (record.cause !== undefined) {
    return readWalletErrorCode(record.cause);
  }

  return undefined;
}

/**
 * 判断是否为用户取消钱包签名 / 发送（EIP-1193 code 4001）。
 * @param error - catch 到的未知错误
 * @returns 命中 4001 时 true
 */
export function isWalletUserRejectedError(error: unknown): boolean {
  return readWalletErrorCode(error) === WALLET_USER_REJECTED_CODE;
}

/**
 * 从 unknown 错误中解析用户可见文案，过滤内部错误码与用户拒绝签名。
 * @param error - catch 到的未知错误
 * @param fallback - 内部错误或空 message 时的兜底文案
 * @param userRejectedMessage - 命中 4001 时展示的已翻译文案
 * @returns 可安全展示给用户的错误文案
 */
export function resolveUserFacingErrorMessage(
  error: unknown,
  fallback: string,
  userRejectedMessage?: string,
): string {
  if (isWalletUserRejectedError(error)) {
    return userRejectedMessage ?? fallback;
  }

  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback;
  }

  if (isDirectWalletInternalToastMessage(error.message)) {
    return fallback;
  }

  return error.message;
}

/**
 * 从 simulate / 链上日志解析 System Program rent 不足（如 MPL Core CreateV2）。
 * @param logs - 交易日志行
 * @returns 解析成功时返回缺口明细，否则 undefined
 */
export function parseInsufficientLamportsFromLogs(
  logs: readonly string[] | null | undefined,
): InsufficientLamportsDetails | undefined {
  if (!logs?.length) {
    return undefined;
  }

  for (const line of logs) {
    const match = INSUFFICIENT_LAMPORTS_LOG_RE.exec(line);
    if (!match) {
      continue;
    }

    const currentLamports = BigInt(match[1]);
    const requiredLamports = BigInt(match[2]);

    return {
      currentLamports,
      requiredLamports,
      shortfallLamports: requiredLamports - currentLamports,
    };
  }

  const joinedMatch = INSUFFICIENT_LAMPORTS_LOG_RE.exec(logs.join('\n'));
  if (!joinedMatch) {
    return undefined;
  }

  const currentLamports = BigInt(joinedMatch[1]);
  const requiredLamports = BigInt(joinedMatch[2]);

  return {
    currentLamports,
    requiredLamports,
    shortfallLamports: requiredLamports - currentLamports,
  };
}

/**
 * 将 lamports 格式化为可读 SOL 字符串（去除多余尾零）。
 * @param lamports - 待格式化的 lamports
 * @returns 不含单位的 SOL 数值字符串
 */
export function formatLamportsAsSol(lamports: bigint): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  if (!Number.isFinite(sol) || sol === 0) {
    return '0';
  }

  const fixed = sol < 0.01 ? sol.toFixed(6) : sol.toFixed(4);

  return fixed.replace(/\.?0+$/, '') || '0';
}

/**
 * 将 SOL 不足明细序列化为可 JSON 化的字符串字段（供 console 日志使用）。
 * @param details - lamports 明细
 * @returns 各字段的字符串形式
 */
export function serializeInsufficientSol(
  details: InsufficientLamportsDetails,
): {
  currentLamports: string;
  requiredLamports: string;
  shortfallLamports: string;
} {
  return {
    currentLamports: details.currentLamports.toString(),
    requiredLamports: details.requiredLamports.toString(),
    shortfallLamports: details.shortfallLamports.toString(),
  };
}

/**
 * 将 SOL 不足明细序列化为 SOL 可读字段（供 console 日志展示）。
 * @param details - lamports 明细
 * @returns currentSol / requiredSol 字符串（不含单位后缀）
 */
export function serializeInsufficientSolAsSol(
  details: InsufficientLamportsDetails,
): {
  currentSol: string;
  requiredSol: string;
} {
  return {
    currentSol: formatLamportsAsSol(details.currentLamports),
    requiredSol: formatLamportsAsSol(details.requiredLamports),
  };
}

/** 直连钱包 fee payer SOL 不足（含 rent 不足场景）。 */
export class SolanaInsufficientSolError extends Error {
  readonly code = SOLANA_INSUFFICIENT_SOL_ERROR_CODE;
  readonly details?: InsufficientLamportsDetails;
  readonly rentAccountIndex?: number;
  readonly insufficientSolSource?: InsufficientSolSource;

  constructor(
    details?: InsufficientLamportsDetails,
    options?: {
      rentAccountIndex?: number;
      insufficientSolSource?: InsufficientSolSource;
    },
  ) {
    super(SOLANA_INSUFFICIENT_SOL_ERROR_CODE);
    this.name = 'SolanaInsufficientSolError';
    this.details = details;
    this.rentAccountIndex = options?.rentAccountIndex;
    this.insufficientSolSource = options?.insufficientSolSource;
  }
}

/** 直连钱包支付代币（USDC）余额不足。 */
export class SolanaInsufficientPayTokenError extends Error {
  readonly code = SOLANA_INSUFFICIENT_PAY_TOKEN_ERROR_CODE;

  constructor() {
    super(SOLANA_INSUFFICIENT_PAY_TOKEN_ERROR_CODE);
    this.name = 'SolanaInsufficientPayTokenError';
  }
}

/** 直连钱包 simulate 失败（Story 合约错误或其它未分类链上错误）。 */
export class DirectWalletSimulationFailedError extends Error {
  readonly code = DIRECT_WALLET_SIMULATION_FAILED_ERROR_CODE;
  readonly simulationErr: unknown;
  readonly logs: readonly string[];
  readonly storyProgramCode?: number;
  readonly storyProgramMessage?: string;

  constructor(params: {
    simulationErr: unknown;
    logs?: readonly string[] | null;
    storyProgramCode?: number;
    storyProgramMessage?: string;
  }) {
    super(DIRECT_WALLET_SIMULATION_FAILED_ERROR_CODE);
    this.name = 'DirectWalletSimulationFailedError';
    this.simulationErr = params.simulationErr;
    this.logs = params.logs ?? [];
    this.storyProgramCode = params.storyProgramCode;
    this.storyProgramMessage = params.storyProgramMessage;
  }
}
