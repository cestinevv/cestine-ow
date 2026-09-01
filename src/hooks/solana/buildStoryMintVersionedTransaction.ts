import {
  type AddressLookupTableAccount,
  type PublicKey,
  type TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

/** Solana 交易序列化体积硬上限（Legacy / Versioned 共用） */
export const SOLANA_TRANSACTION_MAX_BYTES = 1232;

export type BuildStoryMintVersionedTransactionParams = {
  payer: PublicKey;
  recentBlockhash: string;
  instructions: TransactionInstruction[];
  lookupTableAccount?: AddressLookupTableAccount;
};

/**
 * v0 Message → VersionedTransaction；可选 Address Lookup Table。
 */
export function buildStoryMintVersionedTransaction(
  params: BuildStoryMintVersionedTransactionParams,
): VersionedTransaction {
  const { payer, recentBlockhash, instructions, lookupTableAccount } = params;

  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash,
    instructions,
  }).compileToV0Message(lookupTableAccount ? [lookupTableAccount] : []);

  return new VersionedTransaction(messageV0);
}

export function getVersionedTransactionSerializedBytes(
  transaction: VersionedTransaction,
): number {
  return transaction.serialize().length;
}
