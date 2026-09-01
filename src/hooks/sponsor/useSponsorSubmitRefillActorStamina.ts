import type { Address, TransactionSigner } from '@solana/kit';
import { AccountRole } from '@solana/kit';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

import {
  resolveMainActorAssetId,
  resolveRefillOrderHash,
} from '@/features/game/constants/gameActorNft';
import {
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/actorMint/buildMintActorNftVersionedTransaction';
import { confirmSolanaTransaction } from '@/hooks/solana/confirmSolanaTx';
import {
  createDelegatorEd25519Instruction,
  decodeDelegatorSigBase64,
  sha256CanonicalPayloadUtf8,
} from '@/hooks/solana/delegatorSignature';
import {
  type ExecuteRefillActorStaminaParams,
  type RefillActorStaminaResult,
  resolveRefillActorStaminaContext,
} from '@/hooks/solana/useSubmitRefillActorStamina';
import { serializePartiallySignedVersionedTransaction } from '@/hooks/sponsor/serializePartiallySignedVersionedTransaction';
import { submitSponsorTransaction } from '@/hooks/sponsor/sponsorSubmitResult';
import { useSponsorUnlockConfig } from '@/hooks/sponsor/unlock/useSponsorUnlockConfig';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import i18n from '@/i18n';
import { getRefillActorStaminaInstructionAsync } from '@/solana/generated/story/src/generated/instructions/refillActorStamina';
import { findCollectionInfoPda } from '@/solana/generated/story/src/generated/pdas/collectionInfo';
import { readSnowflakeId } from '@/utils/snowflakeId';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

async function buildSponsorPayerPayAccountInstructionIfNeeded(params: {
  connection: Connection;
  feePayer: PublicKey;
  user: PublicKey;
  payTokenMint: PublicKey;
  payerPayAccount: PublicKey;
}): Promise<TransactionInstruction | undefined> {
  const existing = await params.connection.getAccountInfo(
    params.payerPayAccount,
  );
  if (existing) {
    return undefined;
  }

  return createAssociatedTokenAccountIdempotentInstruction(
    params.feePayer,
    params.payerPayAccount,
    params.user,
    params.payTokenMint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

/**
 * 邮箱登录 · 恢复体力代付：fee payer = spender，sponor = spender，用户 signMessage，POST sponsor。
 * 不做 simulate（托管钱包无 SOL，与解锁代付一致）。
 */
export function useSponsorSubmitRefillActorStamina() {
  const { chainlinks } = useGlobalConfig();
  const {
    isEmbeddedLogin,
    isReady,
    solanaAddress,
    solanaWallet,
    signMessage,
    depositConfig,
    sponsorUrl,
    spenderAddress,
  } = useSponsorUnlockConfig();

  const executeSponsorRefillActorStamina = async (
    params: ExecuteRefillActorStaminaParams,
  ): Promise<RefillActorStaminaResult> => {
    const logPrefix = '[useSponsorSubmitRefillActorStamina]';

    console.log('🚀 ~ executeSponsorRefillActorStamina ~ params:', params);

    if (!isEmbeddedLogin) {
      throw new Error('Sponsor refill is only available for email login users');
    }

    if (!solanaAddress || !solanaWallet) {
      throw new Error('Solana wallet not connected');
    }

    if (!spenderAddress || !sponsorUrl || !depositConfig?.rpc) {
      throw new Error('Sponsor configuration is incomplete');
    }

    const {
      actorNftId,
      actorTokenId,
      actorCollectionId,
      orderNo,
      canonicalPayload,
      sigBase64,
      payTokenMint,
    } = params;

    const context = resolveRefillActorStaminaContext(chainlinks);
    if (!context) {
      throw new Error('Solana 链上配置不完整');
    }

    const { rpcEndpoint, storyProgramId, delegator, treasury } = context;

    if (
      !rpcEndpoint.startsWith('http://') &&
      !rpcEndpoint.startsWith('https://')
    ) {
      throw new Error('Solana RPC endpoint is invalid');
    }

    const assetId = resolveMainActorAssetId({
      actorNftId,
      actorCollectionId,
      actorTokenId,
    });

    if (!assetId) {
      throw new Error(i18n.t('角色 NFT assetId 无效，请刷新后重试'));
    }

    if (actorCollectionId === undefined) {
      throw new Error(i18n.t('角色合集 assetId 无效，请刷新后重试'));
    }

    const collectionAssetId =
      readSnowflakeId(actorCollectionId) ?? String(actorCollectionId);

    const sig64 = decodeDelegatorSigBase64(sigBase64);
    const msgHash = await sha256CanonicalPayloadUtf8(canonicalPayload);
    const orderHash = await resolveRefillOrderHash(orderNo);

    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPublicKey = new PublicKey(solanaAddress);
    const feePayer = new PublicKey(spenderAddress);

    const ownerSigner = {
      address: solanaAddress as Address,
    } as TransactionSigner<string>;
    const sponorSigner = {
      address: spenderAddress as Address,
    } as TransactionSigner<string>;

    const payTokenMintKey = new PublicKey(payTokenMint);
    const treasuryKey = new PublicKey(treasury);
    const [treasuryPayAccount, payerPayAccount] = await Promise.all([
      getAssociatedTokenAddress(payTokenMintKey, treasuryKey, true),
      getAssociatedTokenAddress(payTokenMintKey, userPublicKey),
    ]);

    const [collectionInfoPda] = await findCollectionInfoPda(
      { assetId: collectionAssetId },
      { programAddress: storyProgramId },
    );

    console.log(`${logPrefix} 签名与 payload`, {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      assetId,
      collectionAssetId,
      orderNo,
      feePayer: feePayer.toBase58(),
      sponor: sponorSigner.address,
    });

    const kitInstruction = await getRefillActorStaminaInstructionAsync(
      {
        user: ownerSigner,
        sponor: sponorSigner,
        collectionInfo: collectionInfoPda,
        payTokenMint,
        payerPayAccount: payerPayAccount.toBase58() as Address,
        treasury: treasuryPayAccount.toBase58() as Address,
        assetId,
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

    const refillIx = new TransactionInstruction({
      programId: new PublicKey(kitInstruction.programAddress),
      keys,
      data: Buffer.from(kitInstruction.data),
    });

    const ed25519Ix = await createDelegatorEd25519Instruction({
      delegator,
      canonicalPayload,
      sig64,
    });

    const payerPayAccountIx =
      await buildSponsorPayerPayAccountInstructionIfNeeded({
        connection,
        feePayer,
        user: userPublicKey,
        payTokenMint: payTokenMintKey,
        payerPayAccount,
      });

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');

    const messageV0 = new TransactionMessage({
      payerKey: feePayer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...(payerPayAccountIx ? [payerPayAccountIx] : []),
        ed25519Ix,
        refillIx,
      ],
    }).compileToV0Message();
    const versionedTx = new VersionedTransaction(messageV0);

    const serializedBytes = getVersionedTransactionSerializedBytes(versionedTx);
    if (serializedBytes > SOLANA_TRANSACTION_MAX_BYTES) {
      throw new Error(
        `Transaction too large: ${serializedBytes} > ${SOLANA_TRANSACTION_MAX_BYTES}`,
      );
    }

    console.log(`${logPrefix} 请求用户签名 message`, {
      feePayer: feePayer.toBase58(),
      fromAddress: solanaAddress,
      assetId,
      orderNo,
    });

    const messageBytes = versionedTx.message.serialize();
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

    console.log(`${logPrefix} 提交代付 API`, { sponsorUrl });

    const txHash = await submitSponsorTransaction(
      sponsorUrl,
      signedTransactionBase64,
      'Sponsor refill_actor_stamina request failed',
    );

    await confirmSolanaTransaction({
      signature: txHash,
      action: 'refill_actor_stamina',
    });

    console.log(`${logPrefix} complete`, { txHash });

    return { txHash };
  };

  return {
    isReady,
    executeSponsorRefillActorStamina,
  };
}
