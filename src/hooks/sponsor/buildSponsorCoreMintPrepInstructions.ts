import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  type Connection,
  PublicKey,
  type TransactionInstruction,
} from '@solana/web3.js';

import { buildSponsorRentTransferInstruction } from '@/hooks/sponsor/buildSponsorRentTransferInstruction';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

/**
 * Core 版 mint 代付前置指令（邮箱 0-SOL 钱包）：
 * 1. sponsor 向 user 预付 SOL，供 creator 在 MPL Core CPI 内创建账户时扣 rent；
 * 2. 幂等创建 creator USDC ATA（pay token mint 已存在，可安全 prepend）。
 */
export async function buildSponsorCoreMintPrepInstructions(params: {
  connection: Connection;
  feePayer: PublicKey;
  user: PublicKey;
  payTokenMint: PublicKey;
  creatorPayAccount: PublicKey;
  rentLamports: number;
}): Promise<TransactionInstruction[]> {
  const {
    connection,
    feePayer,
    user,
    payTokenMint,
    creatorPayAccount,
    rentLamports,
  } = params;

  const instructions: TransactionInstruction[] = [];

  instructions.push(
    buildSponsorRentTransferInstruction({
      feePayer,
      user,
      lamports: rentLamports,
    }),
  );

  const existingPayAccount = await connection.getAccountInfo(creatorPayAccount);
  if (!existingPayAccount) {
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        feePayer,
        creatorPayAccount,
        user,
        payTokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  return instructions;
}
