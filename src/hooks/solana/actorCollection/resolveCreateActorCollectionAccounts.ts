import type { Address } from '@solana/kit';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { findCollectionPda } from '@/solana/generated/story/src/generated/pdas/collection';
import { findCollectionInfoPda } from '@/solana/generated/story/src/generated/pdas/collectionInfo';

export type CreateActorCollectionResolvedAccounts = {
  collection: PublicKey;
  collectionInfo: Address;
  creatorPayAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
};

export async function resolveCreateActorCollectionMintAddress(params: {
  storyProgramId: Address;
  assetId: string;
}): Promise<string> {
  const [collectionPda] = await findCollectionPda(
    { assetId: params.assetId },
    { programAddress: params.storyProgramId },
  );

  return collectionPda;
}

export async function resolveCreateActorCollectionAccounts(params: {
  creator: PublicKey;
  storyProgramId: Address;
  assetId: string;
  payTokenMint: PublicKey;
  treasury: PublicKey;
}): Promise<CreateActorCollectionResolvedAccounts> {
  const { creator, storyProgramId, assetId, payTokenMint, treasury } = params;

  const [[collectionPda], [collectionInfo]] = await Promise.all([
    // Core collection mint PDA: [collection_mint, asset_id]
    findCollectionPda({ assetId }, { programAddress: storyProgramId }),
    findCollectionInfoPda({ assetId }, { programAddress: storyProgramId }),
  ]);

  const [creatorPayAccount, treasuryTokenAccount] = await Promise.all([
    getAssociatedTokenAddress(payTokenMint, creator),
    getAssociatedTokenAddress(payTokenMint, treasury, true),
  ]);

  return {
    collection: new PublicKey(collectionPda),
    collectionInfo,
    creatorPayAccount,
    treasuryTokenAccount,
  };
}
