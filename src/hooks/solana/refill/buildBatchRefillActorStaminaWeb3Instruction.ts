import type { Address, TransactionSigner } from '@solana/kit';
import { AccountRole } from '@solana/kit';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { findActorMintAssetPda } from '@/hooks/solana/actorMint/findActorMintAssetPda';
import i18n from '@/i18n';
import { getBatchRefillActorStaminaInstructionAsync } from '@/solana/generated/story/src/generated/instructions/batchRefillActorStamina';
import { findConfigPda } from '@/solana/generated/story/src/generated/pdas/config';
import { findRefillRecordPda } from '@/solana/generated/story/src/generated/pdas/refillRecord';

export type BuildBatchRefillActorStaminaWeb3InstructionParams = {
  storyProgramId: Address;
  userAddress: Address;
  userSigner: TransactionSigner<string>;
  sponorSigner: TransactionSigner<string>;
  treasuryWallet: Address;
  actorNftIds: string[];
  payTokenMint: Address;
  orderHash: Uint8Array;
  canonicalPayload: string;
  sig64: Uint8Array;
};

export type BuildBatchRefillActorStaminaWeb3InstructionResult = {
  refillIx: TransactionInstruction;
  actorAssetPdas: Address[];
  payerPayAccount: PublicKey;
  treasuryPayAccount: PublicKey;
  kitFixedAccountCount: number;
};

/** 组装 batch_refill_actor_stamina：固定账户 + remaining actor_mint PDA。 */
export async function buildBatchRefillActorStaminaWeb3Instruction(
  params: BuildBatchRefillActorStaminaWeb3InstructionParams,
): Promise<BuildBatchRefillActorStaminaWeb3InstructionResult> {
  const {
    storyProgramId,
    userAddress,
    userSigner,
    sponorSigner,
    treasuryWallet,
    actorNftIds,
    payTokenMint,
    orderHash,
    canonicalPayload,
    sig64,
  } = params;

  const normalizedActorNftIds = actorNftIds
    .map((id) => id.trim().replace(/^#/, ''))
    .filter(Boolean);

  if (normalizedActorNftIds.length === 0) {
    throw new Error(i18n.t('角色 NFT assetId 无效，请刷新后重试'));
  }

  if (normalizedActorNftIds.length > 5) {
    throw new Error('Batch size exceeds the maximum allowed');
  }

  const payTokenMintKey = new PublicKey(payTokenMint);
  const userPublicKey = new PublicKey(userAddress);
  const treasuryKey = new PublicKey(treasuryWallet);
  const [payerPayAccount, treasuryPayAccount] = await Promise.all([
    getAssociatedTokenAddress(payTokenMintKey, userPublicKey),
    getAssociatedTokenAddress(payTokenMintKey, treasuryKey, true),
  ]);

  const actorAssetPdas = await Promise.all(
    normalizedActorNftIds.map(async (assetId) => {
      const [pda] = await findActorMintAssetPda(
        { assetId },
        { programAddress: storyProgramId },
      );

      return pda;
    }),
  );

  const [[configPda], [refillRecordPda]] = await Promise.all([
    findConfigPda({ programAddress: storyProgramId }),
    findRefillRecordPda({ orderHash }, { programAddress: storyProgramId }),
  ]);

  const kitInstruction = await getBatchRefillActorStaminaInstructionAsync(
    {
      user: userSigner,
      sponor: sponorSigner,
      config: configPda,
      payTokenMint,
      payerPayAccount: payerPayAccount.toBase58() as Address,
      treasury: treasuryPayAccount.toBase58() as Address,
      refillRecord: refillRecordPda,
      orderHash,
      params: {
        canonicalPayload,
        sig: sig64,
      },
    },
    { programAddress: storyProgramId },
  );

  // biome-ignore lint/suspicious/noExplicitAny: kit type
  const keys = kitInstruction.accounts.map((acc: any, index: number) => {
    const isSigner =
      index === 0 ||
      index === 1 ||
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

  // remaining：按 payload 顺序追加 Core actor_mint PDA（与单次 refill 的 asset 同口径，readonly）
  for (const pda of actorAssetPdas) {
    keys.push({
      pubkey: new PublicKey(pda),
      isSigner: false,
      isWritable: false,
    });
  }

  const refillIx = new TransactionInstruction({
    programId: new PublicKey(kitInstruction.programAddress),
    keys,
    data: Buffer.from(kitInstruction.data),
  });

  return {
    refillIx,
    actorAssetPdas,
    payerPayAccount,
    treasuryPayAccount,
    kitFixedAccountCount: kitInstruction.accounts.length,
  };
}
