import {
  useSignAndSendTransaction,
  useWallets,
} from '@privy-io/react-auth/solana';
import type { Address } from '@solana/kit';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import type { DramaDetailResponse } from '@/api/__generated__/story/model/dramaDetailResponse';
import type { DramaNftMintDigestResponse } from '@/api/__generated__/story/model/dramaNftMintDigestResponse';
import {
  buildStoryMintVersionedTransaction,
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/buildStoryMintVersionedTransaction';
import {
  buildExplorerTxUrl,
  type ChainlinksMap,
  getChainExplorer,
  getStoryDelegator,
  getStoryProgramId,
  getStoryTreasury,
} from '@/hooks/solana/chainRpcConfig';
import { confirmSolanaTransaction } from '@/hooks/solana/confirmSolanaTx';
import {
  createDelegatorEd25519Instruction,
  decodeDelegatorSigBase64,
  sha256CanonicalPayloadUtf8,
} from '@/hooks/solana/delegatorSignature';
import { assertDirectWalletSimulationSucceeded } from '@/hooks/solana/directWallet';
import { buildDirectWalletSimulationConfig } from '@/hooks/solana/directWallet/assertSimulation';
import { buildDramaCanonicalPayload } from '@/hooks/solana/dramaMint/buildDramaCanonicalPayload';
import {
  buildMintSeriesNftComputeBudgetInstructions,
  MINT_SERIES_NFT_COMPUTE_UNIT_LIMIT,
} from '@/hooks/solana/dramaMint/buildMintSeriesNftComputeBudget';
import { buildMintSeriesNftWeb3Instruction } from '@/hooks/solana/dramaMint/buildMintSeriesNftWeb3Instruction';
import { rethrowFormattedSolanaError } from '@/hooks/solana/dramaMint/formatSolanaTransactionError';
import { resolveMintSeriesNftAccounts } from '@/hooks/solana/dramaMint/resolveMintSeriesNftAccounts';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { getCurrentChain, toPrivySolanaChain } from '@/solana/chainConfig';
import { findConfigPda } from '@/solana/generated/story/src/generated/pdas/config';
import type { ChainExplorer } from '@/stores/config';
import { readSnowflakeId, toDramaIdBigInt } from '@/utils/snowflakeId';
import { MPL_CORE_PROGRAM_ID } from './storyCoreInstructionAccounts';

export type ExecuteMintDramaNftOnChainParams = {
  digest: DramaNftMintDigestResponse;
  drama: DramaDetailResponse;
  /** 与后端签名一致的 canonical_payload（优先后端返回值） */
  canonicalPayload: string;
  rpcEndpoint: string;
  storyProgramId: Address;
  delegator: Address;
  /** 支付代币 SPL mint（合约用编译期 PAY_TOKEN_MINT 校验，不进入 payload） */
  payTokenMint: Address;
  treasury: Address;
  explorer?: ChainExplorer;
};

export type MintDramaNftOnChainResult = {
  txHash: string;
  mintAddress: string;
};

export function buildMintDramaCanonicalPayloadFromContext(params: {
  digest: DramaNftMintDigestResponse;
  drama: DramaDetailResponse;
  walletAddress: string;
}): string {
  const { digest, drama, walletAddress } = params;
  const dramaId = readSnowflakeId(digest.dramaId ?? drama.id);

  if (!dramaId) {
    throw new Error('dramaId is required to build canonical_payload');
  }

  const metadataUrl = digest.metadataUrl?.trim();
  if (!metadataUrl) {
    throw new Error('metadataUrl is required to build canonical_payload');
  }

  const expiresAt = digest.expiresAt;
  if (expiresAt === undefined || expiresAt === null) {
    throw new Error('expiresAt is required to build canonical_payload');
  }

  return buildDramaCanonicalPayload({
    dramaId,
    walletAddress,
    metadataUrl,
    feeAmount: digest.feeAmount?.trim() || '0',
    expiresAt,
  });
}

export function useMintDramaNftOnChain() {
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();

  const executeMintDramaNftOnChain = async (
    params: ExecuteMintDramaNftOnChainParams,
  ): Promise<MintDramaNftOnChainResult> => {
    if (isEmbeddedLogin) {
      throw new Error('Email login users must use sponsor mint drama NFT flow');
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
    } = params;

    if (!solanaAddress) {
      throw new Error('Solana wallet not connected');
    }

    if (
      !rpcEndpoint.startsWith('http://') &&
      !rpcEndpoint.startsWith('https://')
    ) {
      throw new Error('Solana RPC endpoint is invalid');
    }

    const selectedWallet =
      wallets.find((wallet) => wallet.address === solanaAddress) ?? wallets[0];
    if (!selectedWallet) {
      throw new Error('No available Solana wallet');
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
    const programId = new PublicKey(storyProgramId);
    const payTokenMintKey = new PublicKey(payTokenMint);
    const treasuryKey = new PublicKey(treasury);

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
      sponor: userPublicKey,
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

    const chain = getCurrentChain();
    const mintSeriesNftAccounts = {
      storyProgramId: programId.toBase58(),
      creator: userPublicKey.toBase58(),
      config: String(configPda),
      asset: resolvedAccounts.asset.toBase58(),
      dramaCollectionInfo: resolvedAccounts.collectionInfo.toBase58(),
      collectionMint: resolvedAccounts.collectionMint.toBase58(),
      payTokenMint: payTokenMintKey.toBase58(),
      creatorPayAccount: resolvedAccounts.creatorPayAccount.toBase58(),
      treasuryTokenAccount: resolvedAccounts.treasuryTokenAccount.toBase58(),
      delegator,
    };

    console.log('[mintDramaNftOnChain] 签名与 payload', {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      sigBase64,
      sigHex: Buffer.from(sig64).toString('hex'),
      dramaId: dramaIdBigInt.toString(),
    });

    console.log(
      '[mintDramaNftOnChain] mint_series_nft 账户',
      mintSeriesNftAccounts,
    );

    const mintInstructions = [
      ...buildMintSeriesNftComputeBudgetInstructions(),
      ed25519Ix,
      mintSeriesNftIx,
    ];

    console.log('[mintDramaNftOnChain] 交易指令顺序', [
      {
        index: 0,
        program: 'ComputeBudget',
        limit: `${MINT_SERIES_NFT_COMPUTE_UNIT_LIMIT} CU`,
      },
      { index: 1, program: 'Ed25519Program', delegator },
      {
        index: 2,
        program: 'mint_series_nft',
        dataBase64: Buffer.from(mintSeriesNftIx.data).toString('base64'),
      },
    ]);

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');

    const versionedTx = buildStoryMintVersionedTransaction({
      payer: userPublicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: mintInstructions,
    });
    const serializedBytes = getVersionedTransactionSerializedBytes(versionedTx);
    if (serializedBytes > SOLANA_TRANSACTION_MAX_BYTES) {
      throw new Error(
        `Transaction too large: ${serializedBytes} > ${SOLANA_TRANSACTION_MAX_BYTES}`,
      );
    }
    const serializedTransaction = versionedTx.serialize();

    const simulation = await connection.simulateTransaction(
      versionedTx,
      buildDirectWalletSimulationConfig(userPublicKey),
    );

    assertDirectWalletSimulationSucceeded('[mintDramaNftOnChain]', simulation, {
      serializedBytes,
    });

    console.log('[mintDramaNftOnChain] simulate.ok', {
      unitsConsumed: simulation.value.unitsConsumed,
      logs: simulation.value.logs,
      messageVersion: versionedTx.message.version,
    });

    const privyChain = toPrivySolanaChain(chain);

    let signature: string;
    try {
      const result = await signAndSendTransaction({
        transaction: new Uint8Array(serializedTransaction),
        wallet: selectedWallet,
        chain: privyChain,
      });
      signature = bs58.encode(result.signature);
    } catch (error) {
      console.error('[mintDramaNftOnChain] signAndSend.failed', error);

      rethrowFormattedSolanaError(error);
    }

    const txExplorerUrl =
      buildExplorerTxUrl(params.explorer, signature) ?? signature;

    console.log('[mintDramaNftOnChain] tx.sent', {
      txHash: signature,
      txExplorerUrl,
      privyChain,
      rpcEndpoint,
    });

    await confirmSolanaTransaction({
      signature,
      action: 'mint_series_nft',
    });

    console.log('[mintDramaNftOnChain] confirm.ok', {
      txHash: signature,
    });

    const parsedTx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    console.log('[mintDramaNftOnChain] tx.onChain', {
      txHash: signature,
      txExplorerUrl,
      err: parsedTx?.meta?.err ?? null,
      fee: parsedTx?.meta?.fee,
      computeUnitsConsumed: parsedTx?.meta?.computeUnitsConsumed,
      logMessages: parsedTx?.meta?.logMessages,
    });

    const assetAccount = await connection.getAccountInfo(
      resolvedAccounts.asset,
      'confirmed',
    );
    if (!assetAccount) {
      throw new Error('Drama Core asset account not found after transaction');
    }
    if (!assetAccount.owner.equals(MPL_CORE_PROGRAM_ID)) {
      throw new Error('Drama Core asset account owner is invalid');
    }

    const result = {
      txHash: signature,
      mintAddress: resolvedAccounts.asset.toBase58(),
    };

    console.log('[mintDramaNftOnChain] complete', {
      ...result,
      txExplorerUrl,
      assetAccountOwner: assetAccount.owner.toBase58(),
      assetAccountDataLength: assetAccount.data.length,
    });

    return result;
  };

  const isReady = Boolean(solanaAddress && !isEmbeddedLogin);

  return {
    isReady,
    executeMintDramaNftOnChain,
  };
}

export type MintDramaOnChainContextMissingField =
  | 'rpcEndpoint'
  | 'delegator'
  | 'treasury';

export function getMintDramaOnChainContextMissingFields(
  chainlinks: ChainlinksMap | null,
): MintDramaOnChainContextMissingField[] {
  const chain = getCurrentChain();
  const missing: MintDramaOnChainContextMissingField[] = [];

  if (!chainlinks?.[chain]) {
    return ['rpcEndpoint', 'delegator', 'treasury'];
  }

  if (!chainlinks[chain]?.rpc?.http?.trim()) {
    missing.push('rpcEndpoint');
  }

  if (!getStoryDelegator(chainlinks, chain)) {
    missing.push('delegator');
  }

  if (!getStoryTreasury(chainlinks, chain)) {
    missing.push('treasury');
  }

  return missing;
}

export function resolveMintDramaOnChainContext(
  chainlinks: ChainlinksMap | null,
) {
  if (getMintDramaOnChainContextMissingFields(chainlinks).length > 0) {
    return undefined;
  }

  const chain = getCurrentChain();
  const rpcEndpoint = chainlinks?.[chain]?.rpc?.http?.trim() as string;
  const storyProgramId = getStoryProgramId(chainlinks, chain);
  const delegator = getStoryDelegator(chainlinks, chain) as Address;
  const treasury = getStoryTreasury(chainlinks, chain) as Address;
  const explorer = getChainExplorer(chainlinks, chain);

  return {
    chain,
    rpcEndpoint,
    storyProgramId,
    delegator,
    treasury,
    explorer,
  };
}
