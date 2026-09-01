import type { Address, TransactionSigner } from '@solana/kit';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  type TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

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
import { formatSimulationFailure } from '@/hooks/solana/dramaMint/formatSolanaTransactionError';
import { buildUpgradeActorNftWeb3Instruction } from '@/hooks/solana/upgrade/buildUpgradeActorNftWeb3Instruction';
import { assertUpgradeBurnAssetIdsMatchPayload } from '@/hooks/solana/upgrade/validateUpgradeActorNftBurnAssetIds';
import {
  type ExecuteUpgradeActorNftParams,
  resolveUpgradeActorNftContext,
  type UpgradeActorNftResult,
} from '@/hooks/solana/useSubmitUpgradeActorNft';
import { serializePartiallySignedVersionedTransaction } from '@/hooks/sponsor/serializePartiallySignedVersionedTransaction';
import { submitSponsorTransaction } from '@/hooks/sponsor/sponsorSubmitResult';
import { useSponsorUnlockConfig } from '@/hooks/sponsor/unlock/useSponsorUnlockConfig';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';

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
 * 邮箱登录 · 演员 NFT 升级代付：fee payer = spender，用户 signMessage，POST sponsor。
 * 签名前 simulate（sigVerify: false）预检指令与账户状态，便于提前暴露链上失败原因。
 */
export function useSponsorSubmitUpgradeActorNft() {
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

  const executeSponsorUpgradeActorNft = async (
    params: ExecuteUpgradeActorNftParams,
  ): Promise<UpgradeActorNftResult> => {
    const logPrefix = '[useSponsorSubmitUpgradeActorNft]';

    if (!isEmbeddedLogin) {
      throw new Error(
        'Sponsor upgrade is only available for email login users',
      );
    }

    if (!solanaAddress || !solanaWallet) {
      throw new Error('Solana wallet not connected');
    }

    if (!spenderAddress || !sponsorUrl || !depositConfig?.rpc) {
      throw new Error('Sponsor configuration is incomplete');
    }

    const {
      mainAssetId,
      burnAssetIds,
      actorCollectionId,
      canonicalPayload,
      sigBase64,
      payTokenMint,
    } = params;

    const context = resolveUpgradeActorNftContext(chainlinks);
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

    const sig64 = decodeDelegatorSigBase64(sigBase64);
    const msgHash = await sha256CanonicalPayloadUtf8(canonicalPayload);

    assertUpgradeBurnAssetIdsMatchPayload({ canonicalPayload, burnAssetIds });

    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPublicKey = new PublicKey(solanaAddress);
    const feePayer = new PublicKey(spenderAddress);

    const ownerSigner = {
      address: solanaAddress as Address,
    } as TransactionSigner<string>;

    const {
      upgradeIx,
      collectionAssetId,
      normalizedMainAssetId,
      burnAssetPdas,
      payerPayAccount,
      kitFixedAccountCount,
    } = await buildUpgradeActorNftWeb3Instruction({
      storyProgramId,
      ownerAddress: solanaAddress as Address,
      ownerSigner,
      treasuryWallet: treasury,
      mainAssetId,
      burnAssetIds,
      actorCollectionId,
      payTokenMint,
      canonicalPayload,
      sig64,
    });

    console.log(`${logPrefix} 签名与 payload`, {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      mainAssetId: normalizedMainAssetId,
      burnAssetIds,
      collectionAssetId,
      feePayer: feePayer.toBase58(),
    });

    console.log(`${logPrefix} upgrade_actor_nft accounts`, {
      fixedAccountCount: kitFixedAccountCount,
      remainingBurnAccountCount: burnAssetPdas.length,
      keys: upgradeIx.keys.map((key, index) => ({
        index,
        pubkey: key.pubkey.toBase58(),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
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
        payTokenMint: new PublicKey(payTokenMint),
        payerPayAccount,
      });

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');

    const messageV0 = new TransactionMessage({
      payerKey: feePayer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...(payerPayAccountIx ? [payerPayAccountIx] : []),
        ed25519Ix,
        upgradeIx,
      ],
    }).compileToV0Message();
    const versionedTx = new VersionedTransaction(messageV0);

    const serializedBytes = getVersionedTransactionSerializedBytes(versionedTx);
    if (serializedBytes > SOLANA_TRANSACTION_MAX_BYTES) {
      throw new Error(
        `Transaction too large: ${serializedBytes} > ${SOLANA_TRANSACTION_MAX_BYTES}`,
      );
    }

    const simulation = await connection.simulateTransaction(versionedTx, {
      sigVerify: false,
    });

    if (simulation.value.err) {
      console.error(`${logPrefix} simulate.failed`, {
        err: simulation.value.err,
        logs: simulation.value.logs,
        unitsConsumed: simulation.value.unitsConsumed,
        feePayer: feePayer.toBase58(),
        serializedBytes,
      });
      throw new Error(formatSimulationFailure(simulation));
    }

    console.log(`${logPrefix} simulate.ok`, {
      unitsConsumed: simulation.value.unitsConsumed,
      logs: simulation.value.logs,
      serializedBytes,
    });

    console.log(`${logPrefix} 请求用户签名 message`, {
      feePayer: feePayer.toBase58(),
      fromAddress: solanaAddress,
      mainAssetId: normalizedMainAssetId,
      burnAssetCount: burnAssetIds.length,
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
      'Sponsor upgrade_actor_nft request failed',
    );

    await confirmSolanaTransaction({
      signature: txHash,
      action: 'upgrade_actor_nft',
    });

    console.log(`${logPrefix} complete`, { txHash });

    return { txHash };
  };

  return {
    isReady,
    executeSponsorUpgradeActorNft,
  };
}
