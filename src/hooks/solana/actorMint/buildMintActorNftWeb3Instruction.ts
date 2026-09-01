import type { Address } from '@solana/kit';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { getBatchMintActorNftInstructionDataEncoder } from '@/solana/generated/story/src/generated/instructions/batchMintActorNft';
import { buildBatchMintActorNftCoreAccountMetas } from '../storyCoreInstructionAccounts';

export type BatchMintActorRemainingAccount = {
  pubkey: PublicKey;
  isWritable: boolean;
};

export type BuildMintActorNftWeb3InstructionParams = {
  storyProgramId: Address;
  creator: PublicKey;
  sponor: PublicKey;
  configPda: Address;
  collectionInfo: Address;
  collectionMint: PublicKey;
  payTokenMint: PublicKey;
  creatorPayAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
  remainingAccounts: BatchMintActorRemainingAccount[];
  mintCount: number;
  canonicalPayload: string;
  sig64: Uint8Array;
};

/** 按 IDL 账户顺序组装 `batch_mint_actor_nft` 指令。 */
export function buildMintActorNftWeb3Instruction(
  params: BuildMintActorNftWeb3InstructionParams,
): TransactionInstruction {
  const programId = new PublicKey(params.storyProgramId);

  const instructionData = getBatchMintActorNftInstructionDataEncoder().encode({
    mintCount: params.mintCount,
    params: {
      canonicalPayload: params.canonicalPayload,
      sig: params.sig64,
    },
  });

  return new TransactionInstruction({
    programId,
    keys: buildBatchMintActorNftCoreAccountMetas({
      ...params,
      remainingAccounts: params.remainingAccounts.map((account) => ({
        pubkey: account.pubkey,
        isSigner: false,
        isWritable: account.isWritable,
      })),
    }),
    data: Buffer.from(instructionData),
  });
}
