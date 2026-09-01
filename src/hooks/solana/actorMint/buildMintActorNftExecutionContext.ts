import type { Address } from '@solana/kit';
import {
  type Connection,
  PublicKey,
  type TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { ActorNftMintDigestResponse } from '@/api/__generated__/story/model/actorNftMintDigestResponse';
import { buildMintActorNftWeb3Instruction } from '@/hooks/solana/actorMint/buildMintActorNftWeb3Instruction';
import {
  type BatchMintActorNftResolvedAccounts,
  resolveBatchMintActorNftAccounts,
} from '@/hooks/solana/actorMint/resolveBatchMintActorNftAccounts';
import {
  buildStoryNftMintComputeBudgetInstructions,
  STORY_CORE_BATCH_MINT_COMPUTE_UNIT_LIMIT,
} from '@/hooks/solana/buildStoryNftMintComputeBudget';
import { getChainRpcWss } from '@/hooks/solana/chainRpcConfig';
import {
  createDelegatorEd25519Instruction,
  decodeDelegatorSigBase64,
  sha256CanonicalPayloadUtf8,
} from '@/hooks/solana/delegatorSignature';
import { getSolanaChainConnection } from '@/hooks/solana/solanaConnection';
import {
  readActorDigestCurrentSupply,
  readActorDigestFeeAmount,
  resolveActorCollectionAssetId,
} from '@/hooks/solana/useMintActorNftOnChain';
import i18n from '@/i18n';
import { getCurrentChain } from '@/solana/chainConfig';
import { findConfigPda } from '@/solana/generated/story/src/generated/pdas/config';
import { useConfigStore } from '@/stores/config';

export type BuildMintActorNftExecutionContextParams = {
  solanaAddress: string;
  sponor?: PublicKey;
  digest: ActorNftMintDigestResponse;
  actor?: ActorCollectionResponse;
  canonicalPayload: string;
  payTokenMint: Address;
  rpcEndpoint: string;
  storyProgramId: Address;
  collectionMint: Address;
  collectionAssetId?: string;
  mintCount: number;
  feeAmount?: string | number | bigint;
  delegator: Address;
  treasury: Address;
};

export type MintActorNftExecutionContext = {
  connection: Connection;
  userPublicKey: PublicKey;
  walletAddress: string;
  sig64: Uint8Array;
  resolvedCollectionAssetId: string;
  mintStartIndex: bigint;
  mintCount: number;
  feeAmount: string;
  configPda: Address;
  collectionMintKey: PublicKey;
  payTokenMintKey: PublicKey;
  batchAccounts: BatchMintActorNftResolvedAccounts;
  computeBudgetIxs: TransactionInstruction[];
  ed25519Ix: TransactionInstruction;
  mintActorNftIx: TransactionInstruction;
};

function readMintCount(mintCount: number): number {
  if (!Number.isInteger(mintCount) || mintCount < 1 || mintCount > 10) {
    throw new Error('Mint 数量超过单次上限');
  }

  return mintCount;
}

/** 钱包直连与代付共用：解析 digest、组装 batch_mint_actor_nft 指令与预算指令。 */
export async function buildMintActorNftExecutionContext(
  params: BuildMintActorNftExecutionContextParams,
): Promise<MintActorNftExecutionContext> {
  const {
    solanaAddress,
    sponor,
    digest,
    actor,
    canonicalPayload,
    payTokenMint,
    rpcEndpoint,
    storyProgramId,
    collectionMint,
    collectionAssetId,
    mintCount,
    feeAmount,
    delegator,
    treasury,
  } = params;

  if (
    !rpcEndpoint.startsWith('http://') &&
    !rpcEndpoint.startsWith('https://')
  ) {
    throw new Error('Solana RPC endpoint is invalid');
  }

  const walletAddress = digest.walletAddress?.trim() || solanaAddress;
  if (walletAddress !== solanaAddress) {
    throw new Error('Mint wallet must match connected Solana wallet');
  }

  const sigBase64 = digest.sig?.trim();
  if (!sigBase64) {
    throw new Error('后端未返回 sig');
  }

  const sig64 = decodeDelegatorSigBase64(sigBase64);
  await sha256CanonicalPayloadUtf8(canonicalPayload);

  const resolvedCollectionAssetId = resolveActorCollectionAssetId({
    digest,
    actor,
    collectionAssetId,
  });
  const digestMintStartIndex = readActorDigestCurrentSupply(digest) + 1n;
  const resolvedMintCount = readMintCount(mintCount);
  const resolvedFeeAmount =
    feeAmount === undefined || feeAmount === null
      ? readActorDigestFeeAmount(digest)
      : String(feeAmount).trim() || readActorDigestFeeAmount(digest);

  const connection = getSolanaChainConnection(
    rpcEndpoint,
    getChainRpcWss(useConfigStore.getState().chainlinks, getCurrentChain()),
  );
  const userPublicKey = new PublicKey(solanaAddress);
  const sponorPublicKey = sponor ?? userPublicKey;
  const payTokenMintKey = new PublicKey(payTokenMint);
  const treasuryKey = new PublicKey(treasury);
  const collectionMintKey = new PublicKey(collectionMint);
  const mintStartIndex = digestMintStartIndex;

  const returnedCollectionMint = digest.collectionMintAddress?.trim();
  if (
    returnedCollectionMint &&
    returnedCollectionMint !== collectionMintKey.toBase58()
  ) {
    throw new Error(i18n.t('角色合集 collection mint 与链上 PDA 不一致'));
  }

  const [configPda] = await findConfigPda({ programAddress: storyProgramId });

  const batchAccounts = await resolveBatchMintActorNftAccounts({
    creator: userPublicKey,
    storyProgramId,
    collectionAssetId: resolvedCollectionAssetId,
    collectionMint: collectionMintKey,
    payTokenMint: payTokenMintKey,
    treasury: treasuryKey,
    mintStartIndex,
    mintCount: resolvedMintCount,
  });

  const ed25519Ix = await createDelegatorEd25519Instruction({
    delegator,
    canonicalPayload,
    sig64,
  });

  const mintActorNftIx = await buildMintActorNftWeb3Instruction({
    storyProgramId,
    creator: userPublicKey,
    sponor: sponorPublicKey,
    configPda,
    collectionInfo: batchAccounts.collectionInfo,
    collectionMint: collectionMintKey,
    payTokenMint: payTokenMintKey,
    creatorPayAccount: batchAccounts.creatorPayAccount,
    treasuryTokenAccount: batchAccounts.treasuryTokenAccount,
    remainingAccounts: batchAccounts.remainingAccounts.map((account) => ({
      pubkey: new PublicKey(account.address),
      isWritable: account.isWritable,
    })),
    mintCount: resolvedMintCount,
    canonicalPayload,
    sig64,
  });

  const computeBudgetIxs = buildStoryNftMintComputeBudgetInstructions({
    mintCount: resolvedMintCount,
  });

  return {
    connection,
    userPublicKey,
    walletAddress,
    sig64,
    resolvedCollectionAssetId,
    mintStartIndex,
    mintCount: resolvedMintCount,
    feeAmount: resolvedFeeAmount,
    configPda,
    collectionMintKey,
    payTokenMintKey,
    batchAccounts,
    computeBudgetIxs,
    ed25519Ix,
    mintActorNftIx,
  };
}

export function logMintActorNftExecutionContext(
  logPrefix: string,
  params: {
    canonicalPayload: string;
    msgHashHex: string;
    sig64: Uint8Array;
    context: MintActorNftExecutionContext;
    delegator: Address;
    payTokenMint: Address;
    feePayer?: string;
  },
): void {
  const {
    context,
    canonicalPayload,
    msgHashHex,
    sig64,
    delegator,
    payTokenMint,
    feePayer,
  } = params;

  console.log(`${logPrefix} batch_mint_actor_nft 支付信息`, {
    payTokenMint,
    payTokenMintPubkey: context.payTokenMintKey.toBase58(),
    creatorPayAccount: context.batchAccounts.creatorPayAccount.toBase58(),
    treasuryTokenAccount: context.batchAccounts.treasuryTokenAccount.toBase58(),
    mintStartIndex: context.mintStartIndex.toString(),
    feeAmount: context.feeAmount,
    feePayer,
  });

  console.log(`${logPrefix} 签名与 payload`, {
    canonicalPayload,
    msgHashHex,
    sigHex: Buffer.from(sig64).toString('hex'),
    collectionAssetId: context.resolvedCollectionAssetId,
    mintCount: context.mintCount,
    payTokenMint,
    feePayer,
  });

  console.log(`${logPrefix} batch_mint_actor_nft 账户`, {
    creator: context.userPublicKey.toBase58(),
    sponor: params.feePayer ?? context.userPublicKey.toBase58(),
    config: String(context.configPda),
    collectionInfo: context.batchAccounts.collectionInfo,
    collectionMint: context.collectionMintKey.toBase58(),
    actorAssets: context.batchAccounts.items.map((item, index) => ({
      index,
      actorAssetId: item.assetId,
      assetAddress: item.asset.toBase58(),
    })),
    remainingAccounts: context.batchAccounts.remainingAccounts,
    payTokenMint,
    creatorPayAccount: context.batchAccounts.creatorPayAccount.toBase58(),
    treasury: context.batchAccounts.treasuryTokenAccount.toBase58(),
    delegator,
  });

  console.log(`${logPrefix} Core batch mint compute budget`, {
    mintCount: context.mintCount,
    limit:
      context.mintCount > 1
        ? `${STORY_CORE_BATCH_MINT_COMPUTE_UNIT_LIMIT} CU`
        : '400000 CU',
    heapFrame: context.mintCount > 1 ? '262144 bytes' : undefined,
  });
}
