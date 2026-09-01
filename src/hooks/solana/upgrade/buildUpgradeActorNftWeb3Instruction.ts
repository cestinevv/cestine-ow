import type { Address, TransactionSigner } from '@solana/kit';
import { AccountRole } from '@solana/kit';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { resolveCollectionAssetIdFromActorNftId } from '@/features/game/constants/gameActorNft';
import { findActorMintAssetPda } from '@/hooks/solana/actorMint/findActorMintAssetPda';
import i18n from '@/i18n';
import { getUpgradeActorNftInstructionAsync } from '@/solana/generated/story/src/generated/instructions/upgradeActorNft';
import { findCollectionPda } from '@/solana/generated/story/src/generated/pdas/collection';
import { findCollectionInfoPda } from '@/solana/generated/story/src/generated/pdas/collectionInfo';

export type BuildUpgradeActorNftWeb3InstructionParams = {
  storyProgramId: Address;
  ownerAddress: Address;
  ownerSigner: TransactionSigner<string>;
  treasuryWallet: Address;
  mainAssetId: string;
  burnAssetIds: string[];
  actorCollectionId?: string | number;
  payTokenMint: Address;
  canonicalPayload: string;
  sig64: Uint8Array;
};

export type BuildUpgradeActorNftWeb3InstructionResult = {
  upgradeIx: TransactionInstruction;
  collectionAssetId: string;
  normalizedMainAssetId: string;
  burnAssetPdas: Address[];
  payerPayAccount: PublicKey;
  treasuryPayAccount: PublicKey;
  kitFixedAccountCount: number;
};

export async function buildUpgradeActorNftWeb3Instruction(
  params: BuildUpgradeActorNftWeb3InstructionParams,
): Promise<BuildUpgradeActorNftWeb3InstructionResult> {
  const {
    storyProgramId,
    ownerAddress,
    ownerSigner,
    treasuryWallet,
    mainAssetId,
    burnAssetIds,
    actorCollectionId,
    payTokenMint,
    canonicalPayload,
    sig64,
  } = params;

  const normalizedMainAssetId = mainAssetId.trim();
  const collectionAssetId = resolveCollectionAssetIdFromActorNftId(
    normalizedMainAssetId,
    actorCollectionId,
  );

  if (!collectionAssetId) {
    throw new Error(i18n.t('角色合集 assetId 无效，请刷新后重试'));
  }

  const payTokenMintKey = new PublicKey(payTokenMint);
  const ownerPublicKey = new PublicKey(ownerAddress);
  const treasuryKey = new PublicKey(treasuryWallet);
  const [payerPayAccount, treasuryPayAccount] = await Promise.all([
    getAssociatedTokenAddress(payTokenMintKey, ownerPublicKey),
    getAssociatedTokenAddress(payTokenMintKey, treasuryKey, true),
  ]);

  const [collectionInfoPda] = await findCollectionInfoPda(
    { assetId: collectionAssetId },
    { programAddress: storyProgramId },
  );
  const [collectionMintPda] = await findCollectionPda(
    { assetId: collectionAssetId },
    { programAddress: storyProgramId },
  );
  const [mainAssetPda] = await findActorMintAssetPda(
    { assetId: normalizedMainAssetId },
    { programAddress: storyProgramId },
  );

  const burnAssetPdas = await Promise.all(
    burnAssetIds.map(async (rawAssetId) => {
      const assetId = rawAssetId.trim();
      const [pda] = await findActorMintAssetPda(
        { assetId },
        { programAddress: storyProgramId },
      );

      return pda;
    }),
  );

  const upgradeInstructionInput = {
    user: ownerSigner,
    sponor: ownerSigner,
    collectionInfo: collectionInfoPda,
    collectionMint: collectionMintPda,
    mint: mainAssetPda,
    payTokenMint,
    payerPayAccount: payerPayAccount.toBase58() as Address,
    treasury: treasuryPayAccount.toBase58() as Address,
    assetId: normalizedMainAssetId,
    params: {
      canonicalPayload,
      sig: sig64,
    },
  };

  const kitInstruction = await getUpgradeActorNftInstructionAsync(
    upgradeInstructionInput,
    { programAddress: storyProgramId },
  );

  // biome-ignore lint/suspicious/noExplicitAny: kit type
  const keys = kitInstruction.accounts.map((acc: any, index: number) => {
    const isSigner =
      index === 0 || // user is always the first account and must be a signer
      index === 1 || // sponor is the second account and must be a signer
      acc.role === AccountRole.READONLY_SIGNER ||
      acc.role === AccountRole.WRITABLE_SIGNER;
    const isWritable =
      acc.role === AccountRole.WRITABLE ||
      acc.role === AccountRole.WRITABLE_SIGNER;

    return {
      pubkey: new PublicKey(acc.address),
      isSigner,
      isWritable,
    };
  });

  for (const pda of burnAssetPdas) {
    keys.push({
      pubkey: new PublicKey(pda),
      isSigner: false,
      isWritable: true,
    });
  }

  const upgradeIx = new TransactionInstruction({
    programId: new PublicKey(kitInstruction.programAddress),
    keys,
    data: Buffer.from(kitInstruction.data),
  });

  return {
    upgradeIx,
    collectionAssetId,
    normalizedMainAssetId,
    burnAssetPdas,
    payerPayAccount,
    treasuryPayAccount,
    kitFixedAccountCount: kitInstruction.accounts.length,
  };
}
