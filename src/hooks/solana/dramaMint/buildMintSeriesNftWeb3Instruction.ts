import type { Address } from '@solana/kit';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { DRAMA_COLLECTION_TYPE } from '@/hooks/solana/dramaCollection/constants';
import { getMintSeriesNftInstructionDataEncoder } from '@/solana/generated/story/src/generated/instructions/mintSeriesNft';
import { buildMintSeriesNftCoreAccountMetas } from '../storyCoreInstructionAccounts';

export type BuildMintSeriesNftWeb3InstructionParams = {
  storyProgramId: Address;
  creator: PublicKey;
  sponor: PublicKey;
  configPda: Address;
  asset: PublicKey;
  dramaCollectionInfo: Address;
  collectionMint: PublicKey;
  payTokenMint: PublicKey;
  creatorPayAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
  collectionType?: string;
  dramaId: bigint;
  canonicalPayload: string;
  sig64: Uint8Array;
};

/** 按 Core 版文档参数与账户顺序组装 `mint_series_nft` 指令。 */
export function buildMintSeriesNftWeb3Instruction(
  params: BuildMintSeriesNftWeb3InstructionParams,
): TransactionInstruction {
  const programId = new PublicKey(params.storyProgramId);

  const instructionData = getMintSeriesNftInstructionDataEncoder().encode({
    collectionType: params.collectionType ?? DRAMA_COLLECTION_TYPE,
    dramaId: params.dramaId,
    params: {
      canonicalPayload: params.canonicalPayload,
      sig: params.sig64,
    },
  });

  return new TransactionInstruction({
    programId,
    keys: buildMintSeriesNftCoreAccountMetas(params),
    data: Buffer.from(instructionData),
  });
}
