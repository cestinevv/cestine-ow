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

import { resolveRefillOrderHash } from '@/features/game/constants/gameActorNft';
import {
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/actorMint/buildMintActorNftVersionedTransaction';
import { buildStoryNftMintComputeBudgetInstructions } from '@/hooks/solana/buildStoryNftMintComputeBudget';
import { confirmSolanaTransaction } from '@/hooks/solana/confirmSolanaTx';
import {
  createDelegatorEd25519Instruction,
  decodeDelegatorSigBase64,
  sha256CanonicalPayloadUtf8,
} from '@/hooks/solana/delegatorSignature';
import { assertDirectWalletSimulationSucceeded } from '@/hooks/solana/directWallet';
import { buildDirectWalletSimulationConfig } from '@/hooks/solana/directWallet/assertSimulation';
import { rethrowFormattedSolanaError } from '@/hooks/solana/dramaMint/formatSolanaTransactionError';
import { buildBatchRefillActorStaminaWeb3Instruction } from '@/hooks/solana/refill/buildBatchRefillActorStaminaWeb3Instruction';
import { resolveRefillActorStaminaContext } from '@/hooks/solana/useSubmitRefillActorStamina';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import { getCurrentChain, toPrivySolanaChain } from '@/solana/chainConfig';

export type ExecuteBatchRefillActorStaminaParams = {
  actorNftIds: string[];
  orderNo: string;
  canonicalPayload: string;
  sigBase64: string;
  payTokenMint: Address;
};

export type BatchRefillActorStaminaResult = {
  txHash: string;
};

export function useSubmitBatchRefillActorStamina() {
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { solanaAddress } = useAppPrivyAccount();
  const { chainlinks } = useGlobalConfig();

  const executeBatchRefillActorStamina = async (
    params: ExecuteBatchRefillActorStaminaParams,
  ): Promise<BatchRefillActorStaminaResult> => {
    const { actorNftIds, orderNo, canonicalPayload, sigBase64, payTokenMint } =
      params;

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

    const sig64 = decodeDelegatorSigBase64(sigBase64);
    const msgHash = await sha256CanonicalPayloadUtf8(canonicalPayload);
    const orderHash = await resolveRefillOrderHash(orderNo);

    const userSigner = {
      address: solanaAddress as Address,
    } as TransactionSigner<string>;

    const { refillIx, actorAssetPdas, kitFixedAccountCount } =
      await buildBatchRefillActorStaminaWeb3Instruction({
        storyProgramId,
        userAddress: solanaAddress as Address,
        userSigner,
        sponorSigner: userSigner,
        treasuryWallet: treasury,
        actorNftIds,
        payTokenMint,
        orderHash,
        canonicalPayload,
        sig64,
      });

    console.log('[useSubmitBatchRefillActorStamina] 签名与 payload', {
      canonicalPayload,
      msgHashHex: Buffer.from(msgHash).toString('hex'),
      actorNftIds,
      orderNo,
      orderHashHex: Buffer.from(orderHash).toString('hex'),
    });

    console.log('[useSubmitBatchRefillActorStamina] batch_refill accounts', {
      fixedAccountCount: kitFixedAccountCount,
      remainingAssetCount: actorAssetPdas.length,
      keys: refillIx.keys.map((key, index) => ({
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
      mintCount: Math.max(actorNftIds.length, 1),
    });

    const connection = new Connection(rpcEndpoint, 'confirmed');
    const latestBlockhashResult =
      await connection.getLatestBlockhash('confirmed');
    const latestBlockhash = latestBlockhashResult.blockhash;

    const messageV0 = MessageV0.compile({
      payerKey: new PublicKey(solanaAddress),
      recentBlockhash: latestBlockhash,
      instructions: [...computeBudgetIxs, ed25519Ix, refillIx],
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
      '[useSubmitBatchRefillActorStamina]',
      simulation,
      { serializedBytes, actorNftIds, canonicalPayload },
    );

    console.log('[useSubmitBatchRefillActorStamina] simulate.ok', {
      unitsConsumed: simulation.value.unitsConsumed,
      serializedBytes,
    });

    const transactionBytes = versionedTx.serialize();
    const privyChain = toPrivySolanaChain(getCurrentChain());

    console.log('[useSubmitBatchRefillActorStamina] privy.signAndSend.start', {
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
      console.log(
        '[useSubmitBatchRefillActorStamina] privy.signAndSend.success',
        {
          signature,
        },
      );
    } catch (error) {
      console.error(
        '[useSubmitBatchRefillActorStamina] privy.signAndSend.failed',
        {
          privyChain,
          walletAddress: selectedWallet.address,
          error,
        },
      );
      rethrowFormattedSolanaError(error);
    }

    await confirmSolanaTransaction({
      signature,
      action: 'batch_refill_actor_stamina',
    });

    console.log('[useSubmitBatchRefillActorStamina] complete', {
      txHash: signature,
    });

    return { txHash: signature };
  };

  const isReady = Boolean(solanaAddress);

  return {
    isReady,
    executeBatchRefillActorStamina,
  };
}
