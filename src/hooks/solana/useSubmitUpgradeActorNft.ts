import {
  useSignAndSendTransaction,
  useWallets,
} from '@privy-io/react-auth/solana';
import type { Address, TransactionSigner } from '@solana/kit';
import {
  Connection,
  MessageV0,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import {
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/actorMint/buildMintActorNftVersionedTransaction';
import { buildStoryNftMintComputeBudgetInstructions } from '@/hooks/solana/buildStoryNftMintComputeBudget';
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
import { buildUpgradeActorNftWeb3Instruction } from '@/hooks/solana/upgrade/buildUpgradeActorNftWeb3Instruction';
import { assertUpgradeBurnAssetIdsMatchPayload } from '@/hooks/solana/upgrade/validateUpgradeActorNftBurnAssetIds';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import { getCurrentChain, toPrivySolanaChain } from '@/solana/chainConfig';

export type ExecuteUpgradeActorNftParams = {
  mainAssetId: string;
  burnAssetIds: string[];
  actorCollectionId?: string | number;
  canonicalPayload: string;
  sigBase64: string;
  payTokenMint: Address;
};

export type UpgradeActorNftResult = {
  txHash: string;
};

export function useSubmitUpgradeActorNft() {
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { solanaAddress } = useAppPrivyAccount();
  const { chainlinks } = useGlobalConfig();

  const executeUpgradeActorNft = async (
    params: ExecuteUpgradeActorNftParams,
  ): Promise<UpgradeActorNftResult> => {
    const {
      mainAssetId,
      burnAssetIds,
      actorCollectionId,
      canonicalPayload,
      sigBase64,
      payTokenMint,
    } = params;

    if (!solanaAddress) {
      throw new Error('Solana wallet not connected');
    }

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

    const selectedWallet =
      wallets.find((wallet) => wallet.address === solanaAddress) ?? wallets[0];
    if (!selectedWallet) {
      throw new Error('No available Solana wallet');
    }

    const sig64 = decodeDelegatorSigBase64(sigBase64);
    const msgHash = await sha256CanonicalPayloadUtf8(canonicalPayload);

    assertUpgradeBurnAssetIdsMatchPayload({ canonicalPayload, burnAssetIds });

    const ownerSigner = {
      address: solanaAddress as Address,
    } as TransactionSigner<string>;

    const {
      upgradeIx,
      collectionAssetId,
      normalizedMainAssetId,
      burnAssetPdas,
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

    console.log('[useSubmitUpgradeActorNft] 签名与 payload', {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      mainAssetId: normalizedMainAssetId,
      burnAssetIds,
      collectionAssetId,
    });

    console.log('[useSubmitUpgradeActorNft] upgrade_actor_nft accounts', {
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

    const computeBudgetIxs = buildStoryNftMintComputeBudgetInstructions({
      mintCount: Math.max(burnAssetIds.length, 1),
    });

    const connection = new Connection(rpcEndpoint, 'confirmed');
    const latestBlockhashResult =
      await connection.getLatestBlockhash('confirmed');
    const latestBlockhash = latestBlockhashResult.blockhash;

    const messageV0 = MessageV0.compile({
      payerKey: new PublicKey(solanaAddress),
      recentBlockhash: latestBlockhash,
      instructions: [...computeBudgetIxs, ed25519Ix, upgradeIx],
    });

    const versionedTx = new VersionedTransaction(messageV0);

    const serializedBytes = getVersionedTransactionSerializedBytes(versionedTx);
    if (serializedBytes > SOLANA_TRANSACTION_MAX_BYTES) {
      throw new Error(
        `Transaction too large: ${serializedBytes} > ${SOLANA_TRANSACTION_MAX_BYTES}`,
      );
    }

    const simulation = await connection.simulateTransaction(
      versionedTx,
      buildDirectWalletSimulationConfig(new PublicKey(solanaAddress)),
    );

    assertDirectWalletSimulationSucceeded(
      '[useSubmitUpgradeActorNft]',
      simulation,
      { serializedBytes, burnAssetIds, canonicalPayload },
    );

    console.log('[useSubmitUpgradeActorNft] simulate.ok', {
      unitsConsumed: simulation.value.unitsConsumed,
      serializedBytes,
    });

    const transactionBytes = versionedTx.serialize();

    const privyChain = toPrivySolanaChain(getCurrentChain());

    console.log('[useSubmitUpgradeActorNft] privy.signAndSend.start', {
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
      console.log('[useSubmitUpgradeActorNft] privy.signAndSend.success', {
        signature,
      });
    } catch (error) {
      console.error('[useSubmitUpgradeActorNft] privy.signAndSend.failed', {
        privyChain,
        walletAddress: selectedWallet.address,
        error,
      });
      rethrowFormattedSolanaError(error);
    }

    await confirmSolanaTransaction({
      signature,
      action: 'upgrade_actor_nft',
    });

    console.log('[useSubmitUpgradeActorNft] complete', { txHash: signature });

    return { txHash: signature };
  };

  const isReady = Boolean(solanaAddress);

  return {
    isReady,
    executeUpgradeActorNft,
  };
}

export type UpgradeActorNftContextMissingField =
  | 'rpcEndpoint'
  | 'delegator'
  | 'treasury';

export function getUpgradeActorNftContextMissingFields(
  chainlinks: ChainlinksMap | null,
): UpgradeActorNftContextMissingField[] {
  const chain = getCurrentChain();
  const missing: UpgradeActorNftContextMissingField[] = [];

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

export function resolveUpgradeActorNftContext(
  chainlinks: ChainlinksMap | null,
) {
  if (getUpgradeActorNftContextMissingFields(chainlinks).length > 0) {
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
