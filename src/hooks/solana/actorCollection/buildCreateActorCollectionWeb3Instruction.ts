import type { Address } from '@solana/kit';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { buildCreateActorCollectionCoreAccountMetas } from '@/hooks/solana/storyCoreInstructionAccounts';
import { getCreateActorCollectionInstructionDataEncoder } from '@/solana/generated/story/src/generated/instructions/createActorCollection';

export type BuildCreateActorCollectionWeb3InstructionParams = {
  storyProgramId: Address;
  creator: PublicKey;
  sponor: PublicKey;
  configPda: Address;
  collection: PublicKey;
  collectionInfo: Address;
  payTokenMint: PublicKey;
  creatorPayAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
  assetId: string;
  canonicalPayload: string;
  sig64: Uint8Array;
};

/** 按 IDL 账户顺序组装 `create_actor_collection` 指令。 */
export function buildCreateActorCollectionWeb3Instruction(
  params: BuildCreateActorCollectionWeb3InstructionParams,
): TransactionInstruction {
  const programId = new PublicKey(params.storyProgramId);

  const instructionData =
    getCreateActorCollectionInstructionDataEncoder().encode({
      assetId: params.assetId,
      params: {
        canonicalPayload: params.canonicalPayload,
        sig: params.sig64,
      },
    });

  return new TransactionInstruction({
    programId,
    keys: buildCreateActorCollectionCoreAccountMetas(params),
    data: Buffer.from(instructionData),
  });
}
