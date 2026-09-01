import {
  type InsufficientLamportsDetails,
  type InsufficientSolSource,
  parseInsufficientLamportsFromLogs,
} from './errors';
import { buildFeePayerZeroSolInsufficientDetails } from './solBalance';

const TOKEN_INSUFFICIENT_FUNDS_LOG_RE = /insufficient funds/i;

const CUSTOM_PROGRAM_ERROR_LOG_RE = /custom program error: 0x([0-9a-f]+)/gi;

const STORY_PROGRAM_ERROR_OFFSET = 6000;

const STORY_SIMULATION_ERROR_MESSAGES: Record<number, string> = {
  6009: 'On-chain mint cost exceeds the signed totalAmount cap',
  6013: 'Invalid delegator signature',
  6014: 'Signature has expired',
  6032: 'Canonical payload is malformed or has unexpected fields',
  6034: 'Payload wallet does not match the transaction signer',
};

export type { InsufficientSolSource };

export type DirectWalletSimulationFailure =
  | {
      kind: 'insufficient_sol';
      details: InsufficientLamportsDetails;
      source: InsufficientSolSource;
    }
  | { kind: 'insufficient_sol_rent'; accountIndex?: number }
  | { kind: 'insufficient_pay_token' }
  | {
      kind: 'story_program';
      code: number;
      message: string;
    }
  | { kind: 'generic' };

export { parseInsufficientLamportsFromLogs };

/**
 * 从 simulate 日志判断支付代币（USDC 等）是否余额不足。
 * @param logs - 交易日志行
 * @returns 日志含 insufficient funds 时 true
 */
export function parseInsufficientPayTokenFromLogs(
  logs: readonly string[] | null | undefined,
): boolean {
  if (!logs?.length) {
    return false;
  }

  return logs.some((line) => TOKEN_INSUFFICIENT_FUNDS_LOG_RE.test(line));
}

/**
 * 从 simulate.err 的 InstructionError 中提取 Custom 错误码。
 * @param err - simulate.value.err
 * @returns Custom 程序错误码；无法解析时 undefined
 */
export function extractInstructionCustomError(
  err: unknown,
): number | undefined {
  if (!err || typeof err !== 'object') {
    return undefined;
  }

  const instructionError = (err as { InstructionError?: [number, unknown] })
    .InstructionError;
  if (!Array.isArray(instructionError)) {
    return undefined;
  }

  const detail = instructionError[1];
  if (
    typeof detail === 'object' &&
    detail !== null &&
    'Custom' in detail &&
    typeof (detail as { Custom: unknown }).Custom === 'number'
  ) {
    return (detail as { Custom: number }).Custom;
  }

  return undefined;
}

/**
 * 从 simulate.err 解析 InsufficientFundsForRent 的账户索引。
 * @param err - simulate.value.err
 * @returns rent 不足账户索引；非 rent 错误时 undefined
 */
export function parseInsufficientFundsForRentFromSimulationErr(
  err: unknown,
): number | undefined {
  if (!err || typeof err !== 'object') {
    return undefined;
  }

  const insufficientFundsForRent = (
    err as { InsufficientFundsForRent?: { account_index?: number } }
  ).InsufficientFundsForRent;

  if (
    typeof insufficientFundsForRent !== 'object' ||
    insufficientFundsForRent === null
  ) {
    return undefined;
  }

  return insufficientFundsForRent.account_index;
}

/**
 * 判断 simulate.err 是否为 AccountNotFound（常见于 fee payer 未激活）。
 * @param err - simulate.value.err
 * @returns AccountNotFound 时 true
 */
export function isSimulationAccountNotFound(err: unknown): boolean {
  if (err === 'AccountNotFound') {
    return true;
  }

  if (!err || typeof err !== 'object') {
    return false;
  }

  return 'AccountNotFound' in err;
}

function parseLastStoryProgramErrorCodeFromLogs(
  logs: readonly string[] | null | undefined,
): number | undefined {
  if (!logs?.length) {
    return undefined;
  }

  const joined = logs.join('\n');
  let lastCode: number | undefined;

  for (const match of joined.matchAll(CUSTOM_PROGRAM_ERROR_LOG_RE)) {
    const code = Number.parseInt(match[1], 16);
    if (Number.isFinite(code) && code >= STORY_PROGRAM_ERROR_OFFSET) {
      lastCode = code;
    }
  }

  return lastCode;
}

function resolveStoryProgramMessage(code: number): string {
  return (
    STORY_SIMULATION_ERROR_MESSAGES[code] ?? `Story program error (${code})`
  );
}

type ParseDirectWalletSimulationFailureOptions = {
  /** fee payer 当前 SOL（lamports）；为 0 且 simulate 返回 AccountNotFound 时视为 SOL 不足。 */
  feePayerLamports?: bigint;
};

/**
 * 从 simulate 结果解析直连钱包常见失败原因（SOL / 支付代币 / Story 合约）。
 * @param simulation - simulate 返回值（含 err / logs）
 * @param options.feePayerLamports - fee payer 链上余额，用于 AccountNotFound 兜底
 * @returns 分类后的失败原因
 */
export function parseDirectWalletSimulationFailure(
  simulation: {
    value: {
      err?: unknown;
      logs?: string[] | null;
      unitsConsumed?: number;
    };
  },
  options?: ParseDirectWalletSimulationFailureOptions,
): DirectWalletSimulationFailure {
  const logs = simulation.value.logs;

  const insufficientSol = parseInsufficientLamportsFromLogs(logs);
  if (insufficientSol) {
    return {
      kind: 'insufficient_sol',
      details: insufficientSol,
      source: 'logs',
    };
  }

  if (
    options?.feePayerLamports === 0n &&
    isSimulationAccountNotFound(simulation.value.err)
  ) {
    return {
      kind: 'insufficient_sol',
      details: buildFeePayerZeroSolInsufficientDetails(),
      source: 'zero_balance_account_not_found',
    };
  }

  const rentAccountIndex = parseInsufficientFundsForRentFromSimulationErr(
    simulation.value.err,
  );
  if (rentAccountIndex !== undefined) {
    return { kind: 'insufficient_sol_rent', accountIndex: rentAccountIndex };
  }

  if (parseInsufficientPayTokenFromLogs(logs)) {
    return { kind: 'insufficient_pay_token' };
  }

  const instructionCustomError = extractInstructionCustomError(
    simulation.value.err,
  );

  const storyCode =
    (instructionCustomError !== undefined &&
    instructionCustomError >= STORY_PROGRAM_ERROR_OFFSET
      ? instructionCustomError
      : undefined) ?? parseLastStoryProgramErrorCodeFromLogs(logs);

  if (storyCode !== undefined) {
    return {
      kind: 'story_program',
      code: storyCode,
      message: resolveStoryProgramMessage(storyCode),
    };
  }

  if (instructionCustomError === 1) {
    return { kind: 'insufficient_pay_token' };
  }

  return { kind: 'generic' };
}
