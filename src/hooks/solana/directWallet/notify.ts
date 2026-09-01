import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import {
  DirectWalletSimulationFailedError,
  formatLamportsAsSol,
  isWalletUserRejectedError,
  parseInsufficientLamportsFromLogs,
  SolanaInsufficientPayTokenError,
  SolanaInsufficientSolError,
  serializeInsufficientSolAsSol,
} from './errors';

const INSUFFICIENT_FUNDS_FOR_RENT_RE = /insufficient funds for rent/i;
const RENT_ACCOUNT_INDEX_RE = /account \((\d+)\)/i;

function readErrorLogs(error: unknown): string[] | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const logs = (error as { logs?: unknown }).logs;
  if (!Array.isArray(logs)) {
    return undefined;
  }

  return logs.filter((line): line is string => typeof line === 'string');
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

/**
 * 从 simulate / sendRaw / Privy 抛出的未知错误中识别 SOL rent 不足。
 * @param error - catch 到的未知错误
 * @returns 识别为 SOL 不足时返回对应 Error 实例，否则 undefined
 */
export function resolveDirectWalletInsufficientSolError(
  error: unknown,
): SolanaInsufficientSolError | undefined {
  if (error instanceof SolanaInsufficientSolError) {
    return error;
  }

  const logs = readErrorLogs(error);
  const insufficientSol = parseInsufficientLamportsFromLogs(logs);
  if (insufficientSol) {
    return new SolanaInsufficientSolError(insufficientSol);
  }

  const message = readErrorMessage(error);
  if (!INSUFFICIENT_FUNDS_FOR_RENT_RE.test(message)) {
    return undefined;
  }

  const accountMatch = RENT_ACCOUNT_INDEX_RE.exec(message);

  return new SolanaInsufficientSolError(undefined, {
    rentAccountIndex: accountMatch
      ? Number.parseInt(accountMatch[1], 10)
      : undefined,
  });
}

type NotifyDirectWalletInsufficientSolOptions = {
  t: TFunction;
  logPrefix: string;
  /** 默认 true；短剧/发行等混合代付场景传 !useSponsor / !isEmbeddedLogin */
  enabled?: boolean;
};

/**
 * 钱包直连 SOL 不足：写 console 详细文案并 toast 用户友好提示。
 * @param error - catch 到的未知错误
 * @param options.t - i18n 翻译函数
 * @param options.logPrefix - 日志前缀
 * @param options.enabled - 为 false 时跳过处理
 * @returns 已处理则 true，调用方应 return 跳过 fallback 错误提示
 */
export function notifyDirectWalletInsufficientSol(
  error: unknown,
  options: NotifyDirectWalletInsufficientSolOptions,
): boolean {
  if (options.enabled === false) {
    return false;
  }

  const insufficientSolError = resolveDirectWalletInsufficientSolError(error);
  if (!insufficientSolError) {
    return false;
  }

  if (insufficientSolError.details) {
    const { currentLamports, requiredLamports } = insufficientSolError.details;
    const currentSol = formatLamportsAsSol(currentLamports);
    const requiredSol = formatLamportsAsSol(requiredLamports);

    console.error(
      `${options.logPrefix}.insufficientSol`,
      options.t(
        '失败账户 Solana 余额不足，约需 {{requiredSol}} SOL，当前 {{currentSol}} SOL',
        { requiredSol, currentSol },
      ),
      serializeInsufficientSolAsSol(insufficientSolError.details),
    );
  } else {
    console.error(`${options.logPrefix}.insufficientSol`, {
      reason: 'InsufficientFundsForRent',
      accountIndex: insufficientSolError.rentAccountIndex,
    });
  }

  toast.error(options.t('SOL 余额不足，请充值后重试'));
  return true;
}

type NotifyDirectWalletSimulationErrorOptions = {
  t: TFunction;
  logPrefix: string;
  /** 默认 true；短剧/发行等混合代付场景传 !useSponsor / !isEmbeddedLogin */
  enabled?: boolean;
  /** 非 SOL/代币不足时的兜底 toast key */
  fallbackToastKey: string;
};

/**
 * 钱包直连 simulate / 链上提交错误统一提示。
 * @param error - catch 到的未知错误
 * @param options.t - i18n 翻译函数
 * @param options.logPrefix - 日志前缀
 * @param options.enabled - 为 false 时跳过处理
 * @param options.fallbackToastKey - 未分类 simulate 失败时的 toast i18n key
 * @returns 已处理则 true，调用方应 return 跳过 fallback 错误提示
 */
export function notifyDirectWalletSimulationError(
  error: unknown,
  options: NotifyDirectWalletSimulationErrorOptions,
): boolean {
  if (options.enabled === false) {
    return false;
  }

  if (isWalletUserRejectedError(error)) {
    toast.error(options.t('用户拒绝了该请求'));
    return true;
  }

  if (
    notifyDirectWalletInsufficientSol(error, {
      t: options.t,
      logPrefix: options.logPrefix,
    })
  ) {
    return true;
  }

  if (error instanceof SolanaInsufficientPayTokenError) {
    console.error(`${options.logPrefix}.insufficientPayToken`, error);
    toast.error(options.t('USDC 余额不足'));
    return true;
  }

  if (error instanceof DirectWalletSimulationFailedError) {
    console.error(`${options.logPrefix}.simulationFailed`, {
      err: error.simulationErr,
      logs: error.logs,
      storyProgramCode: error.storyProgramCode,
      storyProgramMessage: error.storyProgramMessage,
    });
    toast.error(options.t(options.fallbackToastKey));
    return true;
  }

  return false;
}
