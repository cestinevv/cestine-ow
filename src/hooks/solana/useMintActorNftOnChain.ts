import { reportError } from '@amazing-socrates/telemetry-kit';
import { useSignTransaction, useWallets } from '@privy-io/react-auth/solana';
import type { Address } from '@solana/kit';
import type { VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { ActorNftMintDigestResponse } from '@/api/__generated__/story/model/actorNftMintDigestResponse';
import { ACTOR_MINT_BLOCKHASH_COMMITMENT } from '@/hooks/solana/actorMint/actorMintTransactionPolicy';
import { buildActorBatchCanonicalPayload } from '@/hooks/solana/actorMint/buildActorBatchCanonicalPayload';
import {
  buildMintActorNftExecutionContext,
  logMintActorNftExecutionContext,
} from '@/hooks/solana/actorMint/buildMintActorNftExecutionContext';
import {
  buildMintActorNftVersionedTransaction,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/actorMint/buildMintActorNftVersionedTransaction';
import {
  buildExplorerTxUrl,
  type ChainlinksMap,
  getChainExplorer,
  getStoryDelegator,
  getStoryProgramId,
  getStoryTreasury,
} from '@/hooks/solana/chainRpcConfig';
import { confirmSolanaTransaction } from '@/hooks/solana/confirmSolanaTx';
import { sha256CanonicalPayloadUtf8 } from '@/hooks/solana/delegatorSignature';
import { assertDirectWalletSimulationSucceeded } from '@/hooks/solana/directWallet';
import { buildDirectWalletSimulationConfig } from '@/hooks/solana/directWallet/assertSimulation';
import { resolveDirectWalletInsufficientSolError } from '@/hooks/solana/directWallet/notify';
import { rethrowFormattedSolanaError } from '@/hooks/solana/dramaMint/formatSolanaTransactionError';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import i18n from '@/i18n';
import { getCurrentChain, toPrivySolanaChain } from '@/solana/chainConfig';
import type { ChainExplorer } from '@/stores/config';
import { readSnowflakeId } from '@/utils/snowflakeId';
import { MPL_CORE_PROGRAM_ID } from './storyCoreInstructionAccounts';

export type ExecuteMintActorNftOnChainParams = {
  digest: ActorNftMintDigestResponse;
  actor: ActorCollectionResponse;
  /** 与后端签名一致的 canonical_payload（优先后端返回值） */
  canonicalPayload: string;
  /** 支付代币 SPL mint（与 canonical 第 7 段 payToken 一致） */
  payTokenMint: Address;
  rpcEndpoint: string;
  storyProgramId: Address;
  collectionMint: Address;
  collectionAssetId: string;
  mintCount: number;
  feeAmount: string | number | bigint;
  delegator: Address;
  treasury: Address;
  explorer?: ChainExplorer;
};

export type MintActorNftOnChainResult = {
  txHash: string;
  mintAddress: string;
  mintAddresses: string[];
};

function readErrorLogs(error: unknown): unknown {
  if (!error || typeof error !== 'object' || !('logs' in error)) {
    return undefined;
  }

  return (error as { logs?: unknown }).logs;
}

function logActorMintTransactionBeforeSend(params: {
  transaction: VersionedTransaction;
  serializedTransaction: Uint8Array;
  walletAddress: string;
  selectedWalletAddress?: string;
  privyChain: string;
  rpcEndpoint: string;
  latestBlockhash: string;
  mintCount: number;
}): void {
  const { transaction, serializedTransaction } = params;
  const requiredSignerCount = transaction.message.header.numRequiredSignatures;
  const staticAccountKeys = transaction.message.staticAccountKeys.map((key) =>
    key.toBase58(),
  );
  const requiredSigners = staticAccountKeys.slice(0, requiredSignerCount);
  const feePayer = staticAccountKeys[0];
  const rawRemainingBytes =
    SOLANA_TRANSACTION_MAX_BYTES - serializedTransaction.length;

  console.log('[mintActorNftOnChain] transaction.beforeSend', {
    txLen: serializedTransaction.length,
    rawLimitBytes: SOLANA_TRANSACTION_MAX_BYTES,
    rawRemainingBytes,
    messageVersion: transaction.message.version,
    recentBlockhash: transaction.message.recentBlockhash,
    latestBlockhash: params.latestBlockhash,
    blockhashMatchesLatest:
      transaction.message.recentBlockhash === params.latestBlockhash,
    feePayer,
    walletAddress: params.walletAddress,
    selectedWalletAddress: params.selectedWalletAddress,
    feePayerMatchesWallet: feePayer === params.walletAddress,
    selectedWalletMatchesWallet:
      params.selectedWalletAddress === params.walletAddress,
    requiredSignerCount,
    requiredSigners,
    requiredSignerHasWallet: requiredSigners.includes(params.walletAddress),
    signatureSlots: transaction.signatures.length,
    staticAccountKeyCount: staticAccountKeys.length,
    privyChain: params.privyChain,
    rpcEndpoint: params.rpcEndpoint,
    mintCount: params.mintCount,
  });
}

export function readActorDigestFeeAmount(
  digest: ActorNftMintDigestResponse,
): string {
  const feeAmount = (
    digest as ActorNftMintDigestResponse & {
      feeAmount?: string | number | bigint;
    }
  ).feeAmount;

  return feeAmount === undefined || feeAmount === null
    ? '0'
    : String(feeAmount).trim() || '0';
}

export function readActorDigestCurrentSupply(
  digest: ActorNftMintDigestResponse,
): bigint {
  const currentSupply = (
    digest as ActorNftMintDigestResponse & {
      currentSupply?: string | number | bigint;
    }
  ).currentSupply;

  if (currentSupply === undefined || currentSupply === null) {
    return 0n;
  }

  const currentSupplyText = String(currentSupply).trim();
  if (!/^\d+$/.test(currentSupplyText)) {
    throw new Error(i18n.t('角色当前供应量无效，请刷新后重试'));
  }

  return BigInt(currentSupplyText);
}

export function readActorDigestOrderNo(
  digest: ActorNftMintDigestResponse,
): string {
  const orderNo = (
    digest as ActorNftMintDigestResponse & {
      orderNo?: string | number | bigint;
    }
  ).orderNo;

  if (orderNo === undefined || orderNo === null) {
    throw new Error('orderNo is required to build canonical_payload');
  }

  const orderNoText = String(orderNo).trim();
  if (!/^\d+$/.test(orderNoText)) {
    throw new Error('orderNo is invalid');
  }

  return orderNoText;
}

export function resolveActorCollectionAssetId(params: {
  digest: ActorNftMintDigestResponse;
  actor?: ActorCollectionResponse;
  collectionAssetId?: string;
}): string {
  const { digest, actor, collectionAssetId } = params;
  const digestActorCollectionId = readSnowflakeId(digest.actorCollectionId);
  if (digestActorCollectionId) {
    return digestActorCollectionId;
  }

  const explicitCollectionAssetId = collectionAssetId?.trim();
  if (explicitCollectionAssetId) {
    return explicitCollectionAssetId;
  }

  const actorCollectionId = readSnowflakeId(actor?.id);
  if (actorCollectionId) {
    return actorCollectionId;
  }

  const digestAssetId = digest.assetId?.trim();
  if (digestAssetId) {
    return digestAssetId;
  }

  const actorAssetId = actor?.assetId?.trim();
  if (actorAssetId) {
    return actorAssetId;
  }

  throw new Error(i18n.t('角色合集 assetId 为空，请刷新后重试'));
}

export function buildMintActorCanonicalPayloadFromContext(params: {
  digest: ActorNftMintDigestResponse;
  actor?: ActorCollectionResponse;
  walletAddress: string;
}): string {
  const { digest, actor, walletAddress } = params;

  const actorCollectionId =
    readSnowflakeId(digest.actorCollectionId) || readSnowflakeId(actor?.id);
  if (!actorCollectionId) {
    throw new Error('actorCollectionId is required to build canonical_payload');
  }

  const expiresAt = digest.expiresAt;
  if (expiresAt === undefined || expiresAt === null) {
    throw new Error('expiresAt is required to build canonical_payload');
  }

  const mintCount = digest.quantity;
  if (mintCount === undefined || mintCount === null) {
    throw new Error('mintQuantity is required to build canonical_payload');
  }

  const totalAmount = digest.totalPriceWithSlippage ?? digest.totalPrice;
  if (totalAmount === undefined || totalAmount === null) {
    throw new Error('totalAmount is required to build canonical_payload');
  }

  return buildActorBatchCanonicalPayload({
    actorCollectionId,
    walletAddress,
    mintCount,
    totalAmount,
    orderNo: readActorDigestOrderNo(digest),
    expiresAt,
  });
}

export function useMintActorNftOnChain() {
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();

  const executeMintActorNftOnChain = async (
    params: ExecuteMintActorNftOnChainParams,
  ): Promise<MintActorNftOnChainResult> => {
    if (isEmbeddedLogin) {
      throw new Error('Email login users must use sponsor mint actor NFT flow');
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
    } = params;

    if (!solanaAddress) {
      throw new Error('Solana wallet not connected');
    }

    const selectedWallet =
      wallets.find((wallet) => wallet.address === solanaAddress) ?? wallets[0];
    if (!selectedWallet) {
      throw new Error('No available Solana wallet');
    }

    const executionContext = await buildMintActorNftExecutionContext({
      solanaAddress,
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

    logMintActorNftExecutionContext('[mintActorNftOnChain]', {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      sig64: executionContext.sig64,
      context: executionContext,
      delegator,
      payTokenMint,
      feePayer: executionContext.userPublicKey.toBase58(),
    });

    const latestBlockhash =
      await executionContext.connection.getLatestBlockhash(
        ACTOR_MINT_BLOCKHASH_COMMITMENT,
      );

    const versionedTx = buildMintActorNftVersionedTransaction({
      payer: executionContext.userPublicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...executionContext.computeBudgetIxs,
        executionContext.ed25519Ix,
        executionContext.mintActorNftIx,
      ],
    });

    const serializedTransaction = versionedTx.serialize();

    const privyChain = toPrivySolanaChain(getCurrentChain());
    logActorMintTransactionBeforeSend({
      transaction: versionedTx,
      serializedTransaction,
      walletAddress: solanaAddress,
      selectedWalletAddress: selectedWallet.address,
      privyChain,
      rpcEndpoint,
      latestBlockhash: latestBlockhash.blockhash,
      mintCount: executionContext.mintCount,
    });

    const simulation = await executionContext.connection.simulateTransaction(
      versionedTx,
      buildDirectWalletSimulationConfig(executionContext.userPublicKey),
    );

    assertDirectWalletSimulationSucceeded('[mintActorNftOnChain]', simulation);

    console.log('[mintActorNftOnChain] simulate.ok', {
      unitsConsumed: simulation.value.unitsConsumed,
      logs: simulation.value.logs,
      messageVersion: versionedTx.message.version,
      blockhashCommitment: ACTOR_MINT_BLOCKHASH_COMMITMENT,
    });

    let signedTransaction: Uint8Array;
    try {
      const result = await signTransaction({
        transaction: serializedTransaction,
        wallet: selectedWallet,
        chain: privyChain,
      });
      signedTransaction = result.signedTransaction;

      console.log('[mintActorNftOnChain] sign.ok', {
        signedTxLen: signedTransaction.length,
        txLen: serializedTransaction.length,
        walletAddress: solanaAddress,
        selectedWalletAddress: selectedWallet.address,
        privyChain,
      });
    } catch (error) {
      console.error('[mintActorNftOnChain] sign.failed', {
        error,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        txLen: serializedTransaction.length,
        walletAddress: solanaAddress,
        selectedWalletAddress: selectedWallet.address,
        privyChain,
        rpcEndpoint,
      });
      reportError(error, { category: 'js' });

      rethrowFormattedSolanaError(error);
    }

    let signature: string;
    try {
      signature = await executionContext.connection.sendRawTransaction(
        signedTransaction,
        {
          skipPreflight: false,
          maxRetries: 3,
        },
      );
    } catch (error) {
      const insufficientSolError =
        resolveDirectWalletInsufficientSolError(error);
      if (insufficientSolError) {
        throw insufficientSolError;
      }

      console.error('[mintActorNftOnChain] sendRaw.failed', {
        error,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        logs: readErrorLogs(error),
        signedTxLen: signedTransaction.length,
        txLen: serializedTransaction.length,
        walletAddress: solanaAddress,
        selectedWalletAddress: selectedWallet.address,
        privyChain,
        rpcEndpoint,
      });

      rethrowFormattedSolanaError(error);
    }

    const txExplorerUrl =
      buildExplorerTxUrl(params.explorer, signature) ?? signature;

    console.log('[mintActorNftOnChain] tx.sent', {
      txHash: signature,
      txExplorerUrl,
      privyChain,
      rpcEndpoint,
    });

    try {
      // WSS + HTTP 竞速确认：钱包全屏后 tab hidden 常会掐死 WS，不能只靠 confirmTransaction
      await confirmSolanaTransaction({
        signature,
        action: 'batch_mint_actor_nft',
      });
    } catch (error) {
      console.error('[mintActorNftOnChain] confirm.failed', {
        txHash: signature,
        error,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    console.log('[mintActorNftOnChain] confirm.ok', {
      txHash: signature,
    });

    const parsedTx = await executionContext.connection.getTransaction(
      signature,
      {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      },
    );

    console.log('[mintActorNftOnChain] tx.onChain', {
      txHash: signature,
      txExplorerUrl,
      err: parsedTx?.meta?.err ?? null,
      fee: parsedTx?.meta?.fee,
      computeUnitsConsumed: parsedTx?.meta?.computeUnitsConsumed,
      logMessages: parsedTx?.meta?.logMessages,
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
      throw new Error('Actor Core asset account not found after transaction');
    }
    if (!assetAccount.owner.equals(MPL_CORE_PROGRAM_ID)) {
      throw new Error('Actor Core asset account owner is invalid');
    }

    const result = {
      txHash: signature,
      mintAddress: firstAsset.toBase58(),
      mintAddresses: executionContext.batchAccounts.items.map((item) =>
        item.asset.toBase58(),
      ),
    };

    console.log('[mintActorNftOnChain] complete', {
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
    executeMintActorNftOnChain,
  };
}

export type MintActorOnChainContextMissingField =
  | 'rpcEndpoint'
  | 'delegator'
  | 'treasury';

export function getMintActorOnChainContextMissingFields(
  chainlinks: ChainlinksMap | null,
): MintActorOnChainContextMissingField[] {
  const chain = getCurrentChain();
  const missing: MintActorOnChainContextMissingField[] = [];

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

export function resolveMintActorOnChainContext(
  chainlinks: ChainlinksMap | null,
) {
  if (getMintActorOnChainContextMissingFields(chainlinks).length > 0) {
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
