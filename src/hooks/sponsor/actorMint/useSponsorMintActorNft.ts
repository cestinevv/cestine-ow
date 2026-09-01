import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

import {
  buildMintActorNftExecutionContext,
  logMintActorNftExecutionContext,
} from '@/hooks/solana/actorMint/buildMintActorNftExecutionContext';
import {
  buildMintActorNftVersionedTransaction,
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/actorMint/buildMintActorNftVersionedTransaction';
import { buildExplorerTxUrl } from '@/hooks/solana/chainRpcConfig';
import { confirmSolanaTransaction } from '@/hooks/solana/confirmSolanaTx';
import { sha256CanonicalPayloadUtf8 } from '@/hooks/solana/delegatorSignature';
import { MPL_CORE_PROGRAM_ID } from '@/hooks/solana/storyCoreInstructionAccounts';
import type { ExecuteMintActorNftOnChainParams } from '@/hooks/solana/useMintActorNftOnChain';
import { serializePartiallySignedVersionedTransaction } from '@/hooks/sponsor/serializePartiallySignedVersionedTransaction';
import { submitSponsorTransaction } from '@/hooks/sponsor/sponsorSubmitResult';
import { useSponsorMintConfig } from '@/hooks/sponsor/useSponsorMintConfig';
import type { ChainExplorer } from '@/stores/config';

export type ExecuteSponsorMintActorNftParams = ExecuteMintActorNftOnChainParams;

export type SponsorMintActorNftResult = {
  txHash: string;
  mintAddress: string;
  mintAddresses: string[];
};

/**
 * 邮箱登录用户演员 NFT 铸造代付 Hook。
 * 流程：与钱包直连共用 batch_mint_actor_nft 组装 → 用户 signMessage → POST sponsor API 由后端代付 Gas。
 */
export function useSponsorMintActorNft() {
  const {
    isEmbeddedLogin,
    isReady,
    solanaAddress,
    solanaWallet,
    signMessage,
    sponsorUrl,
    spenderAddress,
  } = useSponsorMintConfig();

  const executeSponsorMintActorNft = async (
    params: ExecuteSponsorMintActorNftParams,
  ): Promise<SponsorMintActorNftResult> => {
    const logPrefix = '[useSponsorMintActorNft]';

    if (!isEmbeddedLogin) {
      throw new Error('Sponsor mint is only available for email login users');
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
      explorer,
    } = params;

    const feePayer = new PublicKey(spenderAddress);
    const executionContext = await buildMintActorNftExecutionContext({
      solanaAddress,
      sponor: feePayer,
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
    });

    const msgHash = await sha256CanonicalPayloadUtf8(canonicalPayload);

    console.log(`${logPrefix} ========== 开始代付铸造 ==========`, {
      collectionAssetId: executionContext.resolvedCollectionAssetId,
      mintCount: executionContext.mintCount,
      sponsorUrl,
      feePayer: feePayer.toBase58(),
      fromAddress: solanaAddress,
    });

    logMintActorNftExecutionContext(logPrefix, {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      sig64: executionContext.sig64,
      context: executionContext,
      delegator,
      payTokenMint,
      feePayer: feePayer.toBase58(),
    });

    const latestBlockhash =
      await executionContext.connection.getLatestBlockhash('confirmed');

    const versionedTx = buildMintActorNftVersionedTransaction({
      payer: feePayer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...executionContext.computeBudgetIxs,
        executionContext.ed25519Ix,
        executionContext.mintActorNftIx,
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
        executionContext.userPublicKey,
        signResult.signature,
      );

    console.log(`${logPrefix} 用户签名完成，提交代付 API...`, {
      sponsorUrl,
      fromAddress: solanaAddress,
      latestBlockhash: latestBlockhash.blockhash,
    });

    const txHash = await submitSponsorTransaction(
      sponsorUrl,
      signedTransactionBase64,
      'Sponsor batch_mint_actor_nft request failed',
    );

    console.log(`${logPrefix} 代付交易已提交`, { txHash });

    await confirmSolanaTransaction({
      signature: txHash,
      action: 'batch_mint_actor_nft',
    });

    const firstAsset = executionContext.batchAccounts.items[0]?.asset;
    if (!firstAsset) {
      throw new Error('Actor Core asset account not resolved');
    }
    const assetAccount = await executionContext.connection.getAccountInfo(
      firstAsset,
      'confirmed',
    );
    if (!assetAccount) {
      throw new Error('Actor Core asset account not found after sponsor mint');
    }
    if (!assetAccount.owner.equals(MPL_CORE_PROGRAM_ID)) {
      throw new Error('Actor Core asset account owner is invalid');
    }

    const txExplorerUrl =
      buildExplorerTxUrl(explorer as ChainExplorer | undefined, txHash) ??
      txHash;

    console.log(`${logPrefix} complete`, {
      txHash,
      txExplorerUrl,
      mintAddress: firstAsset.toBase58(),
    });

    return {
      txHash,
      mintAddress: firstAsset.toBase58(),
      mintAddresses: executionContext.batchAccounts.items.map((item) =>
        item.asset.toBase58(),
      ),
    };
  };

  return {
    isReady,
    sponsorUrl,
    executeSponsorMintActorNft,
  };
}
