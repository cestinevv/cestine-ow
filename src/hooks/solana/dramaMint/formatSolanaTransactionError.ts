import { isWalletUserRejectedError } from '@/hooks/solana/directWallet/errors';

type SolanaLogsContainer = {
  logs?: string[];
};

/**
 * 格式化并重新抛出 Solana 交易错误；用户拒绝签名（4001）原样上抛以保留 code。
 * @param error - catch 到的未知错误
 */
export function rethrowFormattedSolanaError(error: unknown): never {
  if (isWalletUserRejectedError(error)) {
    throw error;
  }

  throw new Error(formatSolanaTransactionError(error));
}

export function formatSolanaTransactionError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const record = error as Error & {
    code?: string;
    details?: string;
    data?: SolanaLogsContainer;
    logs?: string[];
    cause?: unknown;
  };

  const parts: string[] = [record.message];

  if (record.details) {
    parts.push(record.details);
  }

  const logs = record.logs ?? record.data?.logs;
  if (logs?.length) {
    const tail = logs.slice(-8).join('\n');
    parts.push(tail);
  }

  if (
    record.cause instanceof Error &&
    record.cause.message !== record.message
  ) {
    parts.push(record.cause.message);
  }

  return parts.filter(Boolean).join('\n');
}

export function formatSimulationFailure(simulation: {
  value: {
    err?: unknown;
    logs?: string[] | null;
  };
}): string {
  const errText = JSON.stringify(simulation.value.err);
  const logs = simulation.value.logs?.slice(-12).join('\n') ?? '';
  return `交易模拟失败: ${errText}${logs ? `\n${logs}` : ''}`;
}
