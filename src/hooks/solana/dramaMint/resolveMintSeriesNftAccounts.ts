import type { Address } from '@solana/kit';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { DRAMA_COLLECTION_TYPE } from '@/hooks/solana/dramaCollection/constants';
import {
  findDramaCollectionInfoPda,
  findDramaCollectionMintPda,
  findDramaMintAssetPda,
} from './findDramaMintPdas';

export { DRAMA_COLLECTION_TYPE };

export type MintSeriesNftResolvedAccounts = {
  asset: PublicKey;
  collectionInfo: PublicKey;
  collectionMint: PublicKey;
  creatorPayAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
};

/** 派生 Core 短剧 asset 与 drama collection 相关 PDA / 支付账户。 */
export async function resolveMintSeriesNftAccounts(params: {
  storyProgramId: Address;
  dramaId: bigint;
  creator: PublicKey;
  payTokenMint: PublicKey;
  treasury: PublicKey;
  collectionType?: string;
}): Promise<MintSeriesNftResolvedAccounts> {
  const collectionType = params.collectionType ?? DRAMA_COLLECTION_TYPE;

  const [
    [assetPda],
    [collectionInfo],
    [collectionMint],
    creatorPayAccount,
    treasuryTokenAccount,
  ] = await Promise.all([
    findDramaMintAssetPda(
      { dramaId: params.dramaId },
      { programAddress: params.storyProgramId },
    ),
    findDramaCollectionInfoPda(
      { collectionType },
      { programAddress: params.storyProgramId },
    ),
    findDramaCollectionMintPda(
      { collectionType },
      { programAddress: params.storyProgramId },
    ),
    getAssociatedTokenAddress(params.payTokenMint, params.creator),
    getAssociatedTokenAddress(params.payTokenMint, params.treasury, true),
  ]);

  return {
    asset: new PublicKey(assetPda),
    collectionInfo: new PublicKey(collectionInfo),
    collectionMint: new PublicKey(collectionMint),
    creatorPayAccount,
    treasuryTokenAccount,
  };
}
