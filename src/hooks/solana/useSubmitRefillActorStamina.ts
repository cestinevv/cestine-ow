import {
  useSignAndSendTransaction,
  useWallets,
} from '@privy-io/react-auth/solana';
import type { Address, TransactionSigner } from '@solana/kit';
import { AccountRole } from '@solana/kit';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import {
  Connection,
  MessageV0,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

import {
  resolveMainActorAssetId,
  resolveRefillOrderHash,
} from '@/features/game/constants/gameActorNft';
import {
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
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import i18n from '@/i18n';
import { getCurrentChain, toPrivySolanaChain } from '@/solana/chainConfig';
import { getRefillActorStaminaInstructionAsync } from '@/solana/generated/story/src/generated/instructions/refillActorStamina';
import { findCollectionInfoPda } from '@/solana/generated/story/src/generated/pdas/collectionInfo';
import { readSnowflakeId } from '@/utils/snowflakeId';

export type ExecuteRefillActorStaminaParams = {
  actorNftId: string;
  actorTokenId?: number;
  actorCollectionId?: string | number;
  orderNo: string;
  canonicalPayload: string;
  sigBase64: string;
  payTokenMint: Address;
};

export type RefillActorStaminaResult = {
  txHash: string;
};

export function useSubmitRefillActorStamina() {
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { solanaAddress } = useAppPrivyAccount();
  const { chainlinks } = useGlobalConfig();

  const executeRefillActorStamina = async (
    params: ExecuteRefillActorStaminaParams,
  ): Promise<RefillActorStaminaResult> => {
    const {
      actorNftId,
      actorTokenId,
      actorCollectionId,
      orderNo,
      canonicalPayload,
      sigBase64,
      payTokenMint,
    } = params;

    if (!solanaAddress) {
      throw new Error('Solana wallet not connected');
    }

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

    const selectedWallet =
      wallets.find((wallet) => wallet.address === solanaAddress) ?? wallets[0];
    if (!selectedWallet) {
      throw new Error('No available Solana wallet');
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

    console.log('[useSubmitRefillActorStamina] 签名与 payload', {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      assetId,
      collectionAssetId,
      orderNo,
    });

    const ownerSigner = {
      address: solanaAddress as Address,
    } as TransactionSigner<string>;

    const payTokenMintKey = new PublicKey(payTokenMint);
    const treasuryKey = new PublicKey(treasury);
    const treasuryPayAccount = await getAssociatedTokenAddress(
      payTokenMintKey,
      treasuryKey,
      true,
    );

    const [collectionInfoPda] = await findCollectionInfoPda(
      {
        assetId: collectionAssetId,
      },
      { programAddress: storyProgramId },
    );

    const refillInstructionInput = {
      user: ownerSigner,
      sponor: ownerSigner,
      collectionInfo: collectionInfoPda,
      payTokenMint,
      payerPayAccount: (
        await getAssociatedTokenAddress(
          payTokenMintKey,
          new PublicKey(solanaAddress),
        )
      ).toBase58() as Address,
      treasury: treasuryPayAccount.toBase58() as Address,
      assetId,
      orderHash,
      params: {
        canonicalPayload,
        sig: sig64,
      },
    };

    console.log(
      '[useSubmitRefillActorStamina] getRefillActorStaminaInstructionAsync input',
      {
        user: ownerSigner.address,
        sponor: ownerSigner.address,
        collectionInfo: collectionInfoPda,
        collectionAssetId,
        payTokenMint,
        treasuryWallet: treasury,
        treasuryPayAccount: treasuryPayAccount.toBase58(),
        assetId,
        orderHash: Buffer.from(orderHash).toString('hex'),
        params: {
          canonicalPayload,
          sigBase64: Buffer.from(sig64).toString('base64'),
          sigHex: Buffer.from(sig64).toString('hex'),
        },
        programAddress: storyProgramId,
      },
    );

    const kitInstruction = await getRefillActorStaminaInstructionAsync(
      refillInstructionInput,
      { programAddress: storyProgramId },
    );

    // biome-ignore lint/suspicious/noExplicitAny: kit type
    const keys = kitInstruction.accounts.map((acc: any, index: number) => {
      const isSigner =
        index === 0 || // user is always the first account and must be a signer
        index === 1 || // sponor is the second account and must be a signer
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

    const connection = new Connection(rpcEndpoint, 'confirmed');
    const latestBlockhashResult =
      await connection.getLatestBlockhash('confirmed');
    const latestBlockhash = latestBlockhashResult.blockhash;

    const messageV0 = MessageV0.compile({
      payerKey: new PublicKey(solanaAddress),
      recentBlockhash: latestBlockhash,
      instructions: [ed25519Ix, refillIx],
    });

    const versionedTx = new VersionedTransaction(messageV0);

    const simulation = await connection.simulateTransaction(
      versionedTx,
      buildDirectWalletSimulationConfig(new PublicKey(solanaAddress)),
    );

    assertDirectWalletSimulationSucceeded(
      '[useSubmitRefillActorStamina]',
      simulation,
    );

    const transactionBytes = versionedTx.serialize();

    const privyChain = toPrivySolanaChain(getCurrentChain());

    console.log('[useSubmitRefillActorStamina] privy.signAndSend.start', {
      privyChain,
      serializedByteLength: transactionBytes.length,
      walletAddress: selectedWallet.address,
    });

    let signature: string;
    try {
      const result = await signAndSendTransaction({
        transaction: transactionBytes,
        wallet: selectedWallet,
        chain: privyChain,
      });
      signature = bs58.encode(result.signature);
      console.log('[useSubmitRefillActorStamina] privy.signAndSend.success', {
        signature,
      });
    } catch (error) {
      console.error('[useSubmitRefillActorStamina] privy.signAndSend.failed', {
        privyChain,
        walletAddress: selectedWallet.address,
        error,
      });
      rethrowFormattedSolanaError(error);
    }

    await confirmSolanaTransaction({
      signature,
      action: 'refill_actor_stamina',
    });

    console.log('[useSubmitRefillActorStamina] complete', {
      txHash: signature,
    });

    return { txHash: signature };
  };

  const isReady = Boolean(solanaAddress);

  return {
    isReady,
    executeRefillActorStamina,
  };
}

export type RefillActorStaminaContextMissingField =
  | 'rpcEndpoint'
  | 'delegator'
  | 'treasury';

export function getRefillActorStaminaContextMissingFields(
  chainlinks: ChainlinksMap | null,
): RefillActorStaminaContextMissingField[] {
  const chain = getCurrentChain();
  const missing: RefillActorStaminaContextMissingField[] = [];

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

export function resolveRefillActorStaminaContext(
  chainlinks: ChainlinksMap | null,
) {
  if (getRefillActorStaminaContextMissingFields(chainlinks).length > 0) {
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
