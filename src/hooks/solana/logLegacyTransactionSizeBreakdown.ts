import type { Transaction, TransactionInstruction } from '@solana/web3.js';

/** Solana Legacy Transaction 序列化后体积硬上限（字节） */
export const SOLANA_LEGACY_TX_MAX_BYTES = 1232;

export type LegacyTransactionSizeBreakdown = {
  limitBytes: number;
  serializedBytes: number;
  overLimitBytes: number;
  isOverLimit: boolean;
  uniqueAccountKeys: number;
  accountKeysBytesEstimate: number;
  recentBlockhashBytes: number;
  headerBytes: number;
  signaturesSlotBytesEstimate: number;
  instructionsMetaBytesEstimate: number;
  instructionCount: number;
  instructions: Array<{
    index: number;
    programId: string;
    accountCount: number;
    dataBytes: number;
  }>;
  canonicalPayloadChars?: number;
  canonicalPayloadUtf8Bytes?: number;
  mintActorNftDataBytes?: number;
  ed25519DataBytes?: number;
  reason: string;
};

function estimateCompiledMessageOverheadBytes(accountKeyCount: number): {
  headerBytes: number;
  signaturesSlotBytesEstimate: number;
  accountKeysBytesEstimate: number;
  recentBlockhashBytes: number;
  instructionsMetaBytesEstimate: number;
} {
  // Legacy Message 固定头 3 字节 + 32 字节 blockhash + compact-u16 编码的账户表
  const headerBytes = 3;
  const recentBlockhashBytes = 32;
  const accountKeysBytesEstimate =
    compactU16Size(accountKeyCount) + accountKeyCount * 32;
  // 未签名时 signatures 区仍占位：compact-u16(1) + 64
  const signaturesSlotBytesEstimate = compactU16Size(1) + 64;

  return {
    headerBytes,
    signaturesSlotBytesEstimate,
    accountKeysBytesEstimate,
    recentBlockhashBytes,
    instructionsMetaBytesEstimate: 0,
  };
}

function compactU16Size(value: number): number {
  if (value <= 0x7f) {
    return 1;
  }

  if (value <= 0x3fff) {
    return 2;
  }

  return 3;
}

function instructionDataBytes(ix: TransactionInstruction): number {
  return ix.data?.length ?? 0;
}

/**
 * 分析 Legacy Transaction 体积构成并输出到 console。
 * 演员 mint_actor_nft 账户多 + canonicalPayload 写入指令 data，易超过 1232 字节上限。
 */
export function analyzeLegacyTransactionSize(
  tx: Transaction,
  extras?: {
    canonicalPayload?: string;
    mintActorNftIx?: TransactionInstruction;
    ed25519Ix?: TransactionInstruction;
  },
): LegacyTransactionSizeBreakdown {
  const message = tx.compileMessage();
  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  const overhead = estimateCompiledMessageOverheadBytes(
    message.accountKeys.length,
  );

  const instructions = message.compiledInstructions.map((ix, index) => ({
    index,
    programId: message.accountKeys[ix.programIdIndex].toBase58(),
    accountCount: ix.accountKeyIndexes.length,
    dataBytes: ix.data.length,
  }));

  const instructionDataTotal = instructions.reduce(
    (sum, ix) => sum + ix.dataBytes,
    0,
  );
  const instructionsMetaBytesEstimate =
    compactU16Size(instructions.length) +
    instructions.reduce(
      (sum, ix) =>
        sum +
        3 +
        compactU16Size(ix.accountCount) +
        ix.accountCount +
        compactU16Size(ix.dataBytes) +
        ix.dataBytes,
      0,
    );

  const canonicalPayloadUtf8Bytes = extras?.canonicalPayload
    ? new TextEncoder().encode(extras.canonicalPayload).length
    : undefined;

  const mintActorNftDataBytes = extras?.mintActorNftIx
    ? instructionDataBytes(extras.mintActorNftIx)
    : undefined;
  const ed25519DataBytes = extras?.ed25519Ix
    ? instructionDataBytes(extras.ed25519Ix)
    : undefined;

  const overLimitBytes = serialized.length - SOLANA_LEGACY_TX_MAX_BYTES;

  let reason =
    'Legacy Transaction 序列化体积超过 Solana 1232 字节上限，钱包/Privy 拒绝广播。';
  if (overLimitBytes > 0) {
    const parts: string[] = [
      `超出 ${overLimitBytes} 字节`,
      `唯一账户 ${message.accountKeys.length} 个（每个在消息里占 32 字节，未去重前指令引用按索引计）`,
      `指令 ${instructions.length} 条，指令 data 合计约 ${instructionDataTotal} 字节`,
    ];

    if (canonicalPayloadUtf8Bytes !== undefined) {
      parts.push(
        `canonicalPayload UTF-8 约 ${canonicalPayloadUtf8Bytes} 字节（完整写入 mint_actor_nft 指令 data，外加 8 字节 discriminator + 8 字节 actorId + 64 字节 sig）`,
      );
    }

    if (mintActorNftDataBytes !== undefined) {
      parts.push(`mint_actor_nft 单条指令 data ${mintActorNftDataBytes} 字节`);
    }

    if (ed25519DataBytes !== undefined) {
      parts.push(`Ed25519 验签指令 data ${ed25519DataBytes} 字节`);
    }

    parts.push(
      '对比：mint_series_nft（短剧）账户更少、无支付相关 ATA，通常可压在 1232 以内；演员 mint_actor_nft 多 pay_token / treasury 等账户。',
    );
    parts.push(
      '修复方向：改用 VersionedTransaction(v0) + Address Lookup Table 压缩账户地址，或缩短链上 payload（需合约/后端配合）。',
    );

    reason = parts.join('；');
  }

  return {
    limitBytes: SOLANA_LEGACY_TX_MAX_BYTES,
    serializedBytes: serialized.length,
    overLimitBytes,
    isOverLimit: overLimitBytes > 0,
    uniqueAccountKeys: message.accountKeys.length,
    accountKeysBytesEstimate: overhead.accountKeysBytesEstimate,
    recentBlockhashBytes: overhead.recentBlockhashBytes,
    headerBytes: overhead.headerBytes,
    signaturesSlotBytesEstimate: overhead.signaturesSlotBytesEstimate,
    instructionsMetaBytesEstimate,
    instructionCount: instructions.length,
    instructions,
    canonicalPayloadChars: extras?.canonicalPayload?.length,
    canonicalPayloadUtf8Bytes,
    mintActorNftDataBytes,
    ed25519DataBytes,
    reason,
  };
}

/** Privy / 钱包侧常见的 Legacy 交易体积报错文案 */
export const TRANSACTION_TOO_LARGE_MESSAGE = 'Transaction too large';

export function isTransactionTooLargeError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.message}\n${error.stack ?? ''}`
      : String(error);
  return (
    text.includes(TRANSACTION_TOO_LARGE_MESSAGE) ||
    text.includes('1280 > 1232') ||
    text.includes('> 1232')
  );
}

export function logLegacyTransactionSizeBreakdown(
  tag: string,
  tx: Transaction,
  extras?: Parameters<typeof analyzeLegacyTransactionSize>[1] & {
    /** 与 Privy 实际发送一致的序列化字节（`tx.serialize` 结果） */
    serializedBytes?: number;
    /** 报错阶段标注，便于对照源码行号 */
    stage?: string;
    /** 关联的原始 Error（如 Privy signAndSend） */
    error?: unknown;
  },
): LegacyTransactionSizeBreakdown {
  const breakdown = analyzeLegacyTransactionSize(tx, extras);
  const serializedBytes = extras?.serializedBytes ?? breakdown.serializedBytes;
  const overLimitBytes = serializedBytes - SOLANA_LEGACY_TX_MAX_BYTES;
  const isOverLimit = overLimitBytes > 0;

  const payload = {
    ...breakdown,
    serializedBytes,
    overLimitBytes,
    isOverLimit,
    stage: extras?.stage,
    privyErrorMessage:
      extras?.error instanceof Error ? extras.error.message : undefined,
    sourceHint:
      'Legacy Transaction 上限 1232 字节；超限发生在 tx.serialize() 之后由 Privy signAndSendTransaction 拒绝',
    file: 'src/hooks/solana/useMintActorNftOnChain.ts',
  };

  // 使用 error 级别，避免控制台过滤掉 log 导致「看不到」
  console.error(`[${tag}] 交易体积诊断（Legacy Transaction）`, payload);

  if (isOverLimit) {
    console.error(`[${tag}] 明细`, {
      serializedBytes,
      limitBytes: SOLANA_LEGACY_TX_MAX_BYTES,
      overLimitBytes,
      canonicalPayload: extras?.canonicalPayload,
      canonicalPayloadUtf8Bytes: breakdown.canonicalPayloadUtf8Bytes,
      mintActorNftDataBytes: breakdown.mintActorNftDataBytes,
      ed25519DataBytes: breakdown.ed25519DataBytes,
      uniqueAccountKeys: breakdown.uniqueAccountKeys,
      instructions: breakdown.instructions,
      reason: breakdown.reason,
      stage: extras?.stage,
      privyError: extras?.error,
    });
  }

  return { ...breakdown, serializedBytes, overLimitBytes, isOverLimit };
}
