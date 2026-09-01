import type { Address } from '@solana/kit';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { findCollectionInfoPda } from '@/solana/generated/story/src/generated/pdas/collectionInfo';
import { findActorMintAssetPda } from './findActorMintAssetPda';

export type BatchMintActorNftItemAccounts = {
  assetId: string;
  asset: PublicKey;
};

export type BatchMintActorRemainingAccountMeta = {
  address: string;
  isWritable: boolean;
  label: string;
};

export type BatchMintActorNftResolvedAccounts = {
  collectionInfo: Address;
  collectionMint: PublicKey;
  creatorPayAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
  items: BatchMintActorNftItemAccounts[];
  remainingAccounts: BatchMintActorRemainingAccountMeta[];
};

export function buildActorAssetId(
  collectionAssetId: string,
  mintIndex: bigint,
): string {
  return `${collectionAssetId}_${mintIndex.toString()}`;
}

export async function resolveBatchMintActorNftAccounts(params: {
  creator: PublicKey;
  storyProgramId: Address;
  collectionAssetId: string;
  collectionMint: PublicKey;
  payTokenMint: PublicKey;
  treasury: PublicKey;
  mintStartIndex: bigint;
  mintCount: number;
}): Promise<BatchMintActorNftResolvedAccounts> {
  const {
    creator,
    storyProgramId,
    collectionAssetId,
    collectionMint,
    payTokenMint,
    treasury,
    mintStartIndex,
    mintCount,
  } = params;

  const [[collectionInfo], creatorPayAccount, treasuryTokenAccount] =
    await Promise.all([
      findCollectionInfoPda(
        { assetId: collectionAssetId },
        { programAddress: storyProgramId },
      ),
      getAssociatedTokenAddress(payTokenMint, creator),
      getAssociatedTokenAddress(payTokenMint, treasury, true),
    ]);

  const items = await Promise.all(
    Array.from({ length: mintCount }, async (_, index) => {
      const mintIndex = mintStartIndex + BigInt(index);
      const assetId = buildActorAssetId(collectionAssetId, mintIndex);
      // 合约 remaining account 期望 Core `actor_mint` PDA（seed: actor_mint + asset_id）
      const [assetPda] = await findActorMintAssetPda(
        { assetId },
        { programAddress: storyProgramId },
      );

      return {
        assetId,
        asset: new PublicKey(assetPda),
      };
    }),
  );

  const remainingAccounts = items.map(
    (item, index): BatchMintActorRemainingAccountMeta => ({
      address: item.asset.toBase58(),
      isWritable: true,
      label: `actor[${index}].asset`,
    }),
  );

  return {
    collectionInfo,
    collectionMint,
    creatorPayAccount,
    treasuryTokenAccount,
    items,
    remainingAccounts,
  };
}
