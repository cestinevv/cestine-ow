import type { Address } from '@solana/kit';
import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

import {
  buildStoryMintVersionedTransaction,
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/buildStoryMintVersionedTransaction';
import { buildExplorerTxUrl } from '@/hooks/solana/chainRpcConfig';
import { confirmSolanaTransaction } from '@/hooks/solana/confirmSolanaTx';
import {
  createDelegatorEd25519Instruction,
  decodeDelegatorSigBase64,
  sha256CanonicalPayloadUtf8,
} from '@/hooks/solana/delegatorSignature';
import { buildMintSeriesNftComputeBudgetInstructions } from '@/hooks/solana/dramaMint/buildMintSeriesNftComputeBudget';
import { buildMintSeriesNftWeb3Instruction } from '@/hooks/solana/dramaMint/buildMintSeriesNftWeb3Instruction';
import { resolveMintSeriesNftAccounts } from '@/hooks/solana/dramaMint/resolveMintSeriesNftAccounts';
import { MPL_CORE_PROGRAM_ID } from '@/hooks/solana/storyCoreInstructionAccounts';
import type { ExecuteMintDramaNftOnChainParams } from '@/hooks/solana/useMintDramaNftOnChain';
import { serializePartiallySignedVersionedTransaction } from '@/hooks/sponsor/serializePartiallySignedVersionedTransaction';
import { submitSponsorTransaction } from '@/hooks/sponsor/sponsorSubmitResult';
import { useSponsorMintConfig } from '@/hooks/sponsor/useSponsorMintConfig';
import { findConfigPda } from '@/solana/generated/story/src/generated/pdas/config';
import type { ChainExplorer } from '@/stores/config';
import { readSnowflakeId, toDramaIdBigInt } from '@/utils/snowflakeId';

export type ExecuteSponsorMintDramaNftParams = ExecuteMintDramaNftOnChainParams;

export type SponsorMintDramaNftResult = {
  txHash: string;
  mintAddress: string;
};

/**
 * 邮箱登录用户短剧 NFT 铸造代付 Hook。
 * 流程：拼装 mint_series_nft 交易 → 用户 signMessage → POST sponsor API 由后端代付 Gas。
 */
export function useSponsorMintDramaNft() {
  const {
    isEmbeddedLogin,
    isReady,
    solanaAddress,
    solanaWallet,
    signMessage,
    sponsorUrl,
    spenderAddress,
  } = useSponsorMintConfig();

  const executeSponsorMintDramaNft = async (
    params: ExecuteSponsorMintDramaNftParams,
  ): Promise<SponsorMintDramaNftResult> => {
    const logPrefix = '[useSponsorMintDramaNft]';

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
      drama,
      canonicalPayload,
      rpcEndpoint,
      storyProgramId,
      delegator,
      payTokenMint,
      treasury,
      explorer,
    } = params;

    if (
      !rpcEndpoint.startsWith('http://') &&
      !rpcEndpoint.startsWith('https://')
    ) {
      throw new Error('Solana RPC endpoint is invalid');
    }

    const dramaId = readSnowflakeId(digest.dramaId ?? drama.id);
    if (!dramaId) {
      throw new Error('dramaId is required for sponsor mint');
    }

    const walletAddress = digest.mintWalletAddress?.trim() || solanaAddress;
    if (walletAddress !== solanaAddress) {
      throw new Error('Mint wallet must match connected Solana wallet');
    }

    const sigBase64 = digest.sig?.trim();
    if (!sigBase64) {
      throw new Error('后端未返回 sig');
    }

    const sig64 = decodeDelegatorSigBase64(sigBase64);
    const msgHash = await sha256CanonicalPayloadUtf8(canonicalPayload);
    const dramaIdBigInt = toDramaIdBigInt(digest.dramaId ?? drama.id);
    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPublicKey = new PublicKey(solanaAddress);
    const feePayer = new PublicKey(spenderAddress);
    const payTokenMintKey = new PublicKey(payTokenMint);
    const treasuryKey = new PublicKey(treasury);

    console.log(`${logPrefix} ========== 开始代付铸造 ==========`, {
      dramaId,
      sponsorUrl,
      feePayer: feePayer.toBase58(),
      fromAddress: solanaAddress,
    });

    const [configPda] = await findConfigPda({ programAddress: storyProgramId });
    const resolvedAccounts = await resolveMintSeriesNftAccounts({
      storyProgramId,
      dramaId: dramaIdBigInt,
      creator: userPublicKey,
      payTokenMint: payTokenMintKey,
      treasury: treasuryKey,
    });

    const ed25519Ix = await createDelegatorEd25519Instruction({
      delegator,
      canonicalPayload,
      sig64,
    });

    const mintSeriesNftIx = buildMintSeriesNftWeb3Instruction({
      storyProgramId,
      creator: userPublicKey,
      sponor: feePayer,
      configPda,
      asset: resolvedAccounts.asset,
      dramaCollectionInfo:
        resolvedAccounts.collectionInfo.toBase58() as Address,
      collectionMint: resolvedAccounts.collectionMint,
      payTokenMint: payTokenMintKey,
      creatorPayAccount: resolvedAccounts.creatorPayAccount,
      treasuryTokenAccount: resolvedAccounts.treasuryTokenAccount,
      dramaId: dramaIdBigInt,
      canonicalPayload,
      sig64,
    });

    console.log(`${logPrefix} 签名与 payload`, {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      sigBase64,
      sigHex: Buffer.from(sig64).toString('hex'),
      dramaId: dramaIdBigInt.toString(),
      feePayer: feePayer.toBase58(),
    });

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');

    const versionedTx = buildStoryMintVersionedTransaction({
      payer: feePayer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...buildMintSeriesNftComputeBudgetInstructions(),
        ed25519Ix,
        mintSeriesNftIx,
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
      'Sponsor mint_series_nft request failed',
    );

    console.log(`${logPrefix} 代付交易已提交`, { txHash });

    await confirmSolanaTransaction({
      signature: txHash,
      action: 'mint_series_nft',
    });

    const assetAccount = await connection.getAccountInfo(
      resolvedAccounts.asset,
      'confirmed',
    );
    if (!assetAccount) {
      throw new Error('Drama Core asset account not found after sponsor mint');
    }
    if (!assetAccount.owner.equals(MPL_CORE_PROGRAM_ID)) {
      throw new Error('Drama Core asset account owner is invalid');
    }

    const txExplorerUrl =
      buildExplorerTxUrl(explorer as ChainExplorer | undefined, txHash) ??
      txHash;

    console.log(`${logPrefix} complete`, {
      txHash,
      txExplorerUrl,
      mintAddress: resolvedAccounts.asset.toBase58(),
    });

    return {
      txHash,
      mintAddress: resolvedAccounts.asset.toBase58(),
    };
  };

  return {
    isReady,
    sponsorUrl,
    executeSponsorMintDramaNft,
  };
}
