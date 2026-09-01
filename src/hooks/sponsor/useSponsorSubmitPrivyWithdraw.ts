import { reportError } from '@amazing-socrates/telemetry-kit';
import { useSignMessage, useWallets } from '@privy-io/react-auth/solana';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { useMemo } from 'react';

import { appAxiosInstance } from '@/api/appRequest';
import {
  getVersionedTransactionSerializedBytes,
  SOLANA_TRANSACTION_MAX_BYTES,
} from '@/hooks/solana/actorMint/buildMintActorNftVersionedTransaction';
import { confirmSolanaTransaction } from '@/hooks/solana/confirmSolanaTx';
import { serializePartiallySignedVersionedTransaction } from '@/hooks/sponsor/serializePartiallySignedVersionedTransaction';
import type { SponsorSubmitResult } from '@/hooks/sponsor/sponsorSubmitResult';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useConfigStore } from '@/stores/config';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

export type ExecuteSponsorPrivyWithdrawParams = {
  /** 接收方的钱包地址（Base58 格式） */
  toAddress: string;
  /** 转账代币数量，以该代币的最小单位表示（例如 USDC 的精度是 6，转账 1 USDC 这里就是 "1000000"） */
  amount: string;
  /** 转账代币的 Mint 地址（例如 USDC Mint 地址） */
  tokenAddress: string;
  /** 代币精度（用于构建 transferChecked 指令时的 decimals） */
  tokenDecimals: number;
};

/**
 * 邮箱登录去中心化提现 Hook
 * 获取当前用户的内置 Solana 钱包及相关 Sponsor 配置，发起去中心化的代币转账。
 * 流程：
 * 1. 构建发件人和收件人的 ATA。
 * 2. 若目标地址不存在 ATA，添加由代付账户支付 Gas 和租金的 ATA 创建指令。
 * 3. 添加对应的 transferChecked 指令。
 * 4. 使用内置钱包完成交易签名，并将带有签名的交易体发送到代付网关。
 */
export function useSponsorSubmitPrivyWithdraw() {
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();
  const { signMessage } = useSignMessage();
  const { wallets } = useWallets();
  const { chainlinks, currentChain, initConfig } = useConfigStore();

  // 匹配当前嵌入式登录账户的 Privy 钱包实例
  const solanaWallet = useMemo(() => {
    if (!solanaAddress) return undefined;
    return wallets.find((wallet) => wallet.address === solanaAddress);
  }, [solanaAddress, wallets]);

  const chainData = chainlinks?.[currentChain];

  // 提取代付网关的 URL，通常与充值的 API 保持一致
  const sponsorUrl = useMemo(() => {
    return (
      initConfig?.deposit?.find((item) => item.chain === currentChain)?.api ||
      ''
    );
  }, [currentChain, initConfig?.deposit]);

  // 从配置中获取平台代付账户（Spender）的地址和当前链的 RPC 节点地址
  const spenderAddress = chainData?.contracts?.spender?.trim() ?? '';
  const rpcEndpoint = chainData?.rpc?.http?.trim() ?? '';

  console.log('sponsorUrl', sponsorUrl);
  console.log('spenderAddress', spenderAddress);
  console.log('rpcEndpoint', rpcEndpoint);
  console.log('solanaAddress', solanaAddress);
  console.log('solanaWallet', solanaWallet);
  console.log('chainData', chainData);
  console.log('isEmbeddedLogin', isEmbeddedLogin);

  // 判定依赖配置和钱包环境是否均已加载完毕
  const isReady = useMemo(() => {
    const ready = !!(
      isEmbeddedLogin &&
      !!solanaAddress &&
      !!solanaWallet &&
      chainData?.chainType === 'svm' &&
      !!spenderAddress &&
      !!sponsorUrl &&
      !!rpcEndpoint
    );

    if (!ready) {
      console.log(
        '[useSponsorSubmitPrivyWithdraw] isReady is false, check dependencies:',
        {
          isEmbeddedLogin,
          solanaAddress,
          hasSolanaWallet: !!solanaWallet,
          chainType: chainData?.chainType,
          spenderAddress,
          sponsorUrl,
          rpcEndpoint,
        },
      );
    }

    return ready;
  }, [
    chainData?.chainType,
    isEmbeddedLogin,
    rpcEndpoint,
    solanaAddress,
    solanaWallet,
    spenderAddress,
    sponsorUrl,
  ]);

  /**
   * 执行去中心化提现代付转账的主逻辑
   */
  const executeSponsorPrivyWithdraw = async (
    params: ExecuteSponsorPrivyWithdrawParams,
  ): Promise<{ txHash: string }> => {
    const logPrefix = '[useSponsorSubmitPrivyWithdraw]';

    if (!isEmbeddedLogin) {
      throw new Error(
        'Sponsor withdraw is only available for email login users',
      );
    }

    if (!solanaAddress || !solanaWallet) {
      throw new Error('Solana wallet not connected');
    }

    if (!spenderAddress || !sponsorUrl || !rpcEndpoint) {
      throw new Error('Sponsor configuration is incomplete');
    }

    const { toAddress, amount, tokenAddress, tokenDecimals } = params;

    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      throw new Error('Withdraw amount must be greater than 0');
    }

    // 建立连接及实例化各地址
    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPublicKey = new PublicKey(solanaAddress);
    const feePayer = new PublicKey(spenderAddress);
    const mintPublicKey = new PublicKey(tokenAddress);
    const destinationPublicKey = new PublicKey(toAddress);

    // 获取发件人和收件人的 ATA (Associated Token Account)
    const sourceAta = await getAssociatedTokenAddress(
      mintPublicKey,
      userPublicKey,
    );

    const destinationAta = await getAssociatedTokenAddress(
      mintPublicKey,
      destinationPublicKey,
    );

    const instructions = [];

    // 添加创建接收方 ATA 的指令（幂等），此时 Gas 及租金由 spender 支付
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      feePayer, // Spender pays for ATA creation
      destinationAta,
      destinationPublicKey,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    instructions.push(createAtaIx);

    // 添加代币转账指令
    const transferIx = createTransferCheckedInstruction(
      sourceAta,
      mintPublicKey,
      destinationAta,
      userPublicKey, // Owner of source ATA
      amountBigInt,
      tokenDecimals,
      [],
      TOKEN_PROGRAM_ID,
    );
    instructions.push(transferIx);

    // 获取最新区块哈希，并使用 feePayer（代付方）构建交易消息
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');

    const messageV0 = new TransactionMessage({
      payerKey: feePayer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(messageV0);

    // 检查交易体积是否超限，Solana 的交易体积限制通常为 1232 字节
    const serializedBytes = getVersionedTransactionSerializedBytes(versionedTx);
    if (serializedBytes > SOLANA_TRANSACTION_MAX_BYTES) {
      throw new Error(
        `Transaction too large: ${serializedBytes} > ${SOLANA_TRANSACTION_MAX_BYTES}`,
      );
    }

    console.log(`${logPrefix} 请求用户签名`, {
      feePayer: feePayer.toBase58(),
      fromAddress: solanaAddress,
      toAddress,
      amount,
      tokenAddress,
    });

    // 拉起钱包对交易进行签名
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

    console.log(`${logPrefix} 提交至代付 API`, { sponsorUrl });

    // 通过代付网关提交已签名的交易信息，让代付方完成上链广播
    const submitResponse = await appAxiosInstance<{
      data: SponsorSubmitResult;
    }>(sponsorUrl, {
      method: 'POST',
      body: JSON.stringify({ transaction: signedTransactionBase64 }),
    });
    const submitResult = submitResponse.data;

    const isSuccess = submitResult.code === 100000;
    const txHash = submitResult.data?.trim();

    if (!isSuccess || !txHash) {
      const error = new Error(
        submitResult.msg || 'Sponsor withdraw request failed',
      );
      reportError(error, { category: 'js' });
      throw error;
    }

    await confirmSolanaTransaction({
      signature: txHash,
      action: 'privy_withdraw',
    });

    console.log(`${logPrefix} 交易完成`, { txHash });

    return { txHash };
  };

  return {
    isReady,
    executeSponsorPrivyWithdraw,
  };
}
