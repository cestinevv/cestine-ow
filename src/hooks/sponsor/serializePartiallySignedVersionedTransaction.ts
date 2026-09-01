import type {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/buildStoryMintVersionedTransaction';

/**
 * 用户 signMessage 后，将签名写入 VersionedTransaction 并序列化为 wire-format Base64，
 * 供 sponsor API 由后端补签 fee payer 后广播。
 */
export function serializePartiallySignedVersionedTransaction(
  versionedTx: VersionedTransaction,
  userPublicKey: PublicKey,
  signature: Uint8Array,
): string {
  versionedTx.addSignature(userPublicKey, Buffer.from(signature));

  const serializedBytes = getVersionedTransactionSerializedBytes(versionedTx);
  if (serializedBytes > SOLANA_TRANSACTION_MAX_BYTES) {
    throw new Error(
      `Transaction too large: ${serializedBytes} > ${SOLANA_TRANSACTION_MAX_BYTES}`,
    );
  }

  return Buffer.from(versionedTx.serialize()).toString('base64');
}

/**
 * Legacy Transaction 代付：用户签名写入后序列化（fee payer 未签）。
 */
export function serializePartiallySignedLegacyTransaction(
  transaction: Transaction,
  userPublicKey: PublicKey,
  signature: Uint8Array,
): string {
  transaction.addSignature(userPublicKey, Buffer.from(signature));

  return Buffer.from(
    transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }),
  ).toString('base64');
}
