import { reportError } from '@amazing-socrates/telemetry-kit';
import {
  useSignAndSendTransaction,
  useWallets,
} from '@privy-io/react-auth/solana';
import type { Address } from '@solana/kit';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import type { ActorCollectionMintDigestResponse } from '@/api/__generated__/story/model/actorCollectionMintDigestResponse';
import { buildCreateActorCollectionCanonicalPayload } from '@/hooks/solana/actorCollection/buildCreateActorCollectionCanonicalPayload';
import { buildCreateActorCollectionWeb3Instruction } from '@/hooks/solana/actorCollection/buildCreateActorCollectionWeb3Instruction';
import { resolveCreateActorCollectionAccounts } from '@/hooks/solana/actorCollection/resolveCreateActorCollectionAccounts';
import {
  buildStoryMintVersionedTransaction,
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/buildStoryMintVersionedTransaction';
import {
  buildStoryNftMintComputeBudgetInstructions,
  STORY_NFT_MINT_COMPUTE_UNIT_LIMIT,
} from '@/hooks/solana/buildStoryNftMintComputeBudget';
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
import { rethrowFormattedSolanaError } from '@/hooks/solana/dramaMint/formatSolanaTransactionError';
import { isTransactionTooLargeError } from '@/hooks/solana/logLegacyTransactionSizeBreakdown';
import { MPL_CORE_PROGRAM_ID } from '@/hooks/solana/storyCoreInstructionAccounts';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import i18n from '@/i18n';
import { getCurrentChain, toPrivySolanaChain } from '@/solana/chainConfig';
import { getCollectionInfoDecoder } from '@/solana/generated/story/src/generated/accounts/collectionInfo';
import { findConfigPda } from '@/solana/generated/story/src/generated/pdas/config';
import type { ChainExplorer } from '@/stores/config';
import { readSnowflakeId } from '@/utils/snowflakeId';

export type ExecuteCreateActorCollectionOnChainParams = {
  digest: ActorCollectionMintDigestResponse;
  canonicalPayload?: string;
  rpcEndpoint: string;
  storyProgramId: Address;
  delegator: Address;
  treasury: Address;
  explorer?: ChainExplorer;
};

export type CreateActorCollectionOnChainResult = {
  txHash: string;
  collectionMintAddress: string;
};

function readRequiredText(value: string | undefined, message: string): string {
  const text = value?.trim();
  if (!text) {
    throw new Error(message);
  }

  return text;
}

function readRequiredNumber(
  value: number | undefined | null,
  message: string,
): number {
  if (value === undefined || value === null || Number.isNaN(value)) {
    throw new Error(message);
  }

  return value;
}

function readCreateActorCollectionCurveRate(
  digest: ActorCollectionMintDigestResponse,
): string {
  const value = (digest as ActorCollectionMintDigestResponse & { r?: unknown })
    .r;
  if (value === undefined || value === null) {
    throw new Error('r 为空');
  }

  const text = String(value).trim();
  if (!text) {
    throw new Error('r 为空');
  }

  return text;
}

export function assertCreateActorCollectionCanonicalPayloadHasCurveRate(
  canonicalPayload: string,
) {
  const parts = canonicalPayload.split('|');
  if (parts[0] !== 'actor_collection') {
    return;
  }

  if (parts.length !== 9) {
    throw new Error('create_actor_collection canonical_payload 缺少 r 参数');
  }
}

export function buildCreateActorCollectionCanonicalPayloadFromDigest(params: {
  digest: ActorCollectionMintDigestResponse;
  walletAddress: string;
}): string {
  const { digest, walletAddress } = params;
  const actorCollectionId = readSnowflakeId(digest.actorCollectionId);
  if (!actorCollectionId) {
    throw new Error('actorCollectionId 为空或已丢失精度');
  }

  const metadataUrl = readRequiredText(
    (digest as ActorCollectionMintDigestResponse & { metadataUrl?: unknown })
      .metadataUrl as string | undefined,
    'metadataUrl 为空',
  );
  const totalSupply = readRequiredNumber(
    digest.totalSupply,
    'totalSupply 为空',
  );
  const expiresAt = readRequiredNumber(digest.expiresAt, 'expiresAt 为空');

  return buildCreateActorCollectionCanonicalPayload({
    actorCollectionId,
    creatorAddress: digest.creatorAddress?.trim() || walletAddress,
    metadataUrl,
    totalSupply,
    feeAmount: digest.feeAmount?.trim() || '0',
    initialPriceAmount: digest.initialPriceAmount?.trim() || '0',
    r: readCreateActorCollectionCurveRate(digest),
    expiresAt,
  });
}

export function useCreateActorCollectionOnChain() {
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();

  const executeCreateActorCollectionOnChain = async (
    params: ExecuteCreateActorCollectionOnChainParams,
  ): Promise<CreateActorCollectionOnChainResult> => {
    const { digest, rpcEndpoint, storyProgramId, delegator, treasury } = params;

    if (isEmbeddedLogin) {
      throw new Error(
        'Email login users must use sponsor create actor collection flow',
      );
    }

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
    const payToken = readRequiredText(digest.payToken, 'payToken 为空');
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
    const programId = new PublicKey(storyProgramId);
    const payTokenMintKey = new PublicKey(payToken);
    const treasuryKey = new PublicKey(treasury);

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
      sponor: userPublicKey,
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

    const chain = getCurrentChain();
    const createActorCollectionAccounts = {
      storyProgramId: programId.toBase58(),
      creator: userPublicKey.toBase58(),
      config: String(configPda),
      collection: resolvedAccounts.collection.toBase58(),
      collectionInfo: String(resolvedAccounts.collectionInfo),
      payTokenMint: payTokenMintKey.toBase58(),
      creatorPayAccount: resolvedAccounts.creatorPayAccount.toBase58(),
      treasuryTokenAccount: resolvedAccounts.treasuryTokenAccount.toBase58(),
      delegator,
    };

    console.log('[createActorCollectionOnChain] 签名与 payload', {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      sigBase64,
      sigHex: Buffer.from(sig64).toString('hex'),
      assetId,
      payToken,
    });

    console.log(
      '[createActorCollectionOnChain] create_actor_collection 账户',
      createActorCollectionAccounts,
    );

    console.log('[createActorCollectionOnChain] 交易指令顺序', [
      {
        index: 0,
        program: 'ComputeBudget',
        limit: `${STORY_NFT_MINT_COMPUTE_UNIT_LIMIT} CU`,
      },
      { index: 1, program: 'Ed25519Program', delegator },
      {
        index: 2,
        program: 'create_actor_collection',
        dataBase64: Buffer.from(createActorCollectionIx.data).toString(
          'base64',
        ),
      },
    ]);

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const versionedTx = buildStoryMintVersionedTransaction({
      payer: userPublicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...buildStoryNftMintComputeBudgetInstructions(),
        ed25519Ix,
        createActorCollectionIx,
      ],
    });

    const serializedTransaction = versionedTx.serialize();
    const serializedBytes = getVersionedTransactionSerializedBytes(versionedTx);
    const overLimitBytes = serializedBytes - SOLANA_TRANSACTION_MAX_BYTES;

    console.log('[createActorCollectionOnChain] versionedTransaction.size', {
      serializedBytes,
      limitBytes: SOLANA_TRANSACTION_MAX_BYTES,
      overLimitBytes,
      messageVersion: versionedTx.message.version,
    });

    if (overLimitBytes > 0) {
      const tooLargeMessage = `Transaction too large: ${serializedBytes} > ${SOLANA_TRANSACTION_MAX_BYTES}`;
      console.error(
        '[createActorCollectionOnChain] transaction.tooLarge.beforePrivy',
        {
          errorMessage: tooLargeMessage,
          serializedBytes,
          limitBytes: SOLANA_TRANSACTION_MAX_BYTES,
          overLimitBytes,
          canonicalPayload,
          createActorCollectionAccounts,
          instructionDataBytes: createActorCollectionIx.data.length,
        },
      );
      throw new Error(tooLargeMessage);
    }

    const simulation = await connection.simulateTransaction(
      versionedTx,
      buildDirectWalletSimulationConfig(userPublicKey),
    );

    assertDirectWalletSimulationSucceeded(
      '[createActorCollectionOnChain]',
      simulation,
    );

    console.log('[createActorCollectionOnChain] simulate.ok', {
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
      console.error('[createActorCollectionOnChain] signAndSend.failed', error);
      reportError(error, { category: 'js' });

      if (isTransactionTooLargeError(error)) {
        console.error(
          '[createActorCollectionOnChain] transaction.tooLarge.privy',
          {
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            serializedBytes,
            limitBytes: SOLANA_TRANSACTION_MAX_BYTES,
            overLimitBytes: serializedBytes - SOLANA_TRANSACTION_MAX_BYTES,
            canonicalPayload,
            createActorCollectionAccounts,
            privyChain,
            rpcEndpoint,
          },
        );
      }

      rethrowFormattedSolanaError(error);
    }

    const txExplorerUrl =
      buildExplorerTxUrl(params.explorer, signature) ?? signature;

    console.log('[createActorCollectionOnChain] tx.sent', {
      txHash: signature,
      txExplorerUrl,
      privyChain,
      rpcEndpoint,
    });

    await confirmSolanaTransaction({
      signature,
      action: 'create_actor_collection',
    });

    console.log('[createActorCollectionOnChain] confirm.ok', {
      txHash: signature,
    });

    const parsedTx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    console.log('[createActorCollectionOnChain] tx.onChain', {
      txHash: signature,
      txExplorerUrl,
      err: parsedTx?.meta?.err ?? null,
      fee: parsedTx?.meta?.fee,
      computeUnitsConsumed: parsedTx?.meta?.computeUnitsConsumed,
      logMessages: parsedTx?.meta?.logMessages,
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

    const result = {
      txHash: signature,
      collectionMintAddress: resolvedAccounts.collection.toBase58(),
    };

    console.log('[createActorCollectionOnChain] complete', {
      ...result,
      txExplorerUrl,
      collectionAccountOwner: collectionAccount.owner.toBase58(),
      collectionAccountDataLength: collectionAccount.data.length,
      collectionInfoAddress: String(resolvedAccounts.collectionInfo),
      collectionInfoOwner: collectionInfoAccount.owner.toBase58(),
    });

    return result;
  };

  const isReady = Boolean(solanaAddress && !isEmbeddedLogin);

  return {
    isReady,
    executeCreateActorCollectionOnChain,
  };
}

export type CreateActorCollectionOnChainContextMissingField =
  | 'rpcEndpoint'
  | 'delegator'
  | 'treasury';

export function getCreateActorCollectionOnChainContextMissingFields(
  chainlinks: ChainlinksMap | null,
): CreateActorCollectionOnChainContextMissingField[] {
  const chain = getCurrentChain();
  const missing: CreateActorCollectionOnChainContextMissingField[] = [];

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

export function resolveCreateActorCollectionOnChainContext(
  chainlinks: ChainlinksMap | null,
) {
  if (
    getCreateActorCollectionOnChainContextMissingFields(chainlinks).length > 0
  ) {
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
