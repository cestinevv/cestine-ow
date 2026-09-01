import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { buildCreateActorCollectionWeb3Instruction } from '@/hooks/solana/actorCollection/buildCreateActorCollectionWeb3Instruction';
import { resolveCreateActorCollectionAccounts } from '@/hooks/solana/actorCollection/resolveCreateActorCollectionAccounts';
import {
  buildStoryMintVersionedTransaction,
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/buildStoryMintVersionedTransaction';
import { buildStoryNftMintComputeBudgetInstructions } from '@/hooks/solana/buildStoryNftMintComputeBudget';
import { buildExplorerTxUrl } from '@/hooks/solana/chainRpcConfig';
import { confirmSolanaTransaction } from '@/hooks/solana/confirmSolanaTx';
import {
  createDelegatorEd25519Instruction,
  decodeDelegatorSigBase64,
  sha256CanonicalPayloadUtf8,
} from '@/hooks/solana/delegatorSignature';
import { MPL_CORE_PROGRAM_ID } from '@/hooks/solana/storyCoreInstructionAccounts';
import {
  assertCreateActorCollectionCanonicalPayloadHasCurveRate,
  buildCreateActorCollectionCanonicalPayloadFromDigest,
  type CreateActorCollectionOnChainResult,
  type ExecuteCreateActorCollectionOnChainParams,
} from '@/hooks/solana/useCreateActorCollectionOnChain';
import { serializePartiallySignedVersionedTransaction } from '@/hooks/sponsor/serializePartiallySignedVersionedTransaction';
import { submitSponsorTransaction } from '@/hooks/sponsor/sponsorSubmitResult';
import { useSponsorMintConfig } from '@/hooks/sponsor/useSponsorMintConfig';
import i18n from '@/i18n';
import { getCollectionInfoDecoder } from '@/solana/generated/story/src/generated/accounts/collectionInfo';
import { findConfigPda } from '@/solana/generated/story/src/generated/pdas/config';
import type { ChainExplorer } from '@/stores/config';
import { readSnowflakeId } from '@/utils/snowflakeId';

export type ExecuteSponsorCreateActorCollectionParams =
  ExecuteCreateActorCollectionOnChainParams;

export type SponsorCreateActorCollectionResult =
  CreateActorCollectionOnChainResult;

/**
 * 邮箱登录用户演员合集创建代付 Hook。
 * 流程：拼装 create_actor_collection 交易 → 用户 signMessage → POST sponsor API 由后端代付 Gas。
 */
export function useSponsorCreateActorCollection() {
  const {
    isEmbeddedLogin,
    isReady,
    solanaAddress,
    solanaWallet,
    signMessage,
    sponsorUrl,
    spenderAddress,
  } = useSponsorMintConfig();

  const executeSponsorCreateActorCollection = async (
    params: ExecuteSponsorCreateActorCollectionParams,
  ): Promise<SponsorCreateActorCollectionResult> => {
    const logPrefix = '[useSponsorCreateActorCollection]';

    if (!isEmbeddedLogin) {
      throw new Error(
        'Sponsor create actor collection is only available for email login users',
      );
    }

    if (!solanaAddress || !solanaWallet) {
      throw new Error('Solana wallet not connected');
    }

    if (!spenderAddress) {
      throw new Error('Spender address is not configured for sponsor mint');
    }

    if (!sponsorUrl) {
      throw new Error('Sponsor API (init.deposit.api) is not configured');
    }

    const {
      digest,
      rpcEndpoint,
      storyProgramId,
      delegator,
      treasury,
      explorer,
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

    const actorCollectionId = readSnowflakeId(digest.actorCollectionId);
    if (!actorCollectionId) {
      throw new Error('actorCollectionId 为空或已丢失精度');
    }

    const assetId = actorCollectionId;
    const payToken = digest.payToken?.trim();
    if (!payToken) {
      throw new Error('payToken 为空');
    }

    const canonicalPayload =
      params.canonicalPayload?.trim() ||
      buildCreateActorCollectionCanonicalPayloadFromDigest({
        digest,
        walletAddress: solanaAddress,
      });
    assertCreateActorCollectionCanonicalPayloadHasCurveRate(canonicalPayload);
    const sig64 = decodeDelegatorSigBase64(sigBase64);
    const msgHash = await sha256CanonicalPayloadUtf8(canonicalPayload);

    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPublicKey = new PublicKey(solanaAddress);
    const feePayer = new PublicKey(spenderAddress);
    const programId = new PublicKey(storyProgramId);
    const payTokenMintKey = new PublicKey(payToken);
    const treasuryKey = new PublicKey(treasury);

    console.log(`${logPrefix} ========== 开始代付创建合集 ==========`, {
      assetId,
      sponsorUrl,
      feePayer: feePayer.toBase58(),
      fromAddress: solanaAddress,
    });

    const [configPda] = await findConfigPda({ programAddress: storyProgramId });
    const resolvedAccounts = await resolveCreateActorCollectionAccounts({
      creator: userPublicKey,
      storyProgramId,
      assetId,
      payTokenMint: payTokenMintKey,
      treasury: treasuryKey,
    });

    const returnedCollectionMint = digest.collectionMintAddress?.trim();
    if (
      returnedCollectionMint &&
      returnedCollectionMint !== resolvedAccounts.collection.toBase58()
    ) {
      throw new Error(i18n.t('角色 IP collection mint 与链上 PDA 不一致'));
    }

    const ed25519Ix = await createDelegatorEd25519Instruction({
      delegator,
      canonicalPayload,
      sig64,
    });

    const createActorCollectionIx = buildCreateActorCollectionWeb3Instruction({
      storyProgramId,
      creator: userPublicKey,
      sponor: feePayer,
      configPda,
      collection: resolvedAccounts.collection,
      collectionInfo: resolvedAccounts.collectionInfo,
      payTokenMint: payTokenMintKey,
      creatorPayAccount: resolvedAccounts.creatorPayAccount,
      treasuryTokenAccount: resolvedAccounts.treasuryTokenAccount,
      assetId,
      canonicalPayload,
      sig64,
    });

    console.log(`${logPrefix} 签名与 payload`, {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      sigBase64,
      sigHex: Buffer.from(sig64).toString('hex'),
      assetId,
      payToken,
      feePayer: feePayer.toBase58(),
    });

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const versionedTx = buildStoryMintVersionedTransaction({
      payer: feePayer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...buildStoryNftMintComputeBudgetInstructions(),
        ed25519Ix,
        createActorCollectionIx,
      ],
    });

    const serializedBytes = getVersionedTransactionSerializedBytes(versionedTx);
    if (serializedBytes > SOLANA_TRANSACTION_MAX_BYTES) {
      throw new Error(
        `Transaction too large: ${serializedBytes} > ${SOLANA_TRANSACTION_MAX_BYTES}`,
      );
    }

    const messageBytes = versionedTx.message.serialize();

    console.log(`${logPrefix} 请求用户签名 message...`);

    const signResult = await signMessage({
      message: messageBytes,
      wallet: solanaWallet as never,
    });

    const signedTransactionBase64 =
      serializePartiallySignedVersionedTransaction(
        versionedTx,
        userPublicKey,
        signResult.signature,
      );

    console.log(`${logPrefix} 用户签名完成，提交代付 API...`, { sponsorUrl });

    const txHash = await submitSponsorTransaction(
      sponsorUrl,
      signedTransactionBase64,
      'Sponsor create_actor_collection request failed',
    );

    console.log(`${logPrefix} 代付交易已提交`, { txHash });

    await confirmSolanaTransaction({
      signature: txHash,
      action: 'create_actor_collection',
    });

    const [collectionAccount, collectionInfoAccount] = await Promise.all([
      connection.getAccountInfo(resolvedAccounts.collection, 'confirmed'),
      connection.getAccountInfo(
        new PublicKey(resolvedAccounts.collectionInfo),
        'confirmed',
      ),
    ]);
    if (!collectionAccount || !collectionInfoAccount) {
      throw new Error(
        i18n.t('角色合集链上账户未完整初始化，请重新执行「确定发行」'),
      );
    }
    if (!collectionAccount.owner.equals(MPL_CORE_PROGRAM_ID)) {
      throw new Error('Actor collection account is not owned by Metaplex Core');
    }
    if (!collectionInfoAccount.owner.equals(programId)) {
      throw new Error(
        'Actor CollectionInfo is not owned by current Story program',
      );
    }

    const collectionInfo = getCollectionInfoDecoder().decode(
      new Uint8Array(collectionInfoAccount.data),
    );
    if (
      collectionInfo.assetId !== assetId ||
      collectionInfo.mint !== resolvedAccounts.collection.toBase58()
    ) {
      throw new Error('Actor CollectionInfo data does not match collection');
    }

    const txExplorerUrl =
      buildExplorerTxUrl(explorer as ChainExplorer | undefined, txHash) ??
      txHash;

    console.log(`${logPrefix} complete`, {
      txHash,
      txExplorerUrl,
      collectionMintAddress: resolvedAccounts.collection.toBase58(),
    });

    return {
      txHash,
      collectionMintAddress: resolvedAccounts.collection.toBase58(),
    };
  };

  return {
    isReady,
    sponsorUrl,
    executeSponsorCreateActorCollection,
  };
}
