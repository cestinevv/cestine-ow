import type { ClusterUrl } from '@solana/kit';
import { createClient } from '@solana/kit';
import { solanaRpc } from '@solana/kit-plugin-rpc';
import { generatedPayer } from '@solana/kit-plugin-signer';

import { storyProgram } from '@/solana/generated/story/src/generated/programs/story';

/** Codama Story 插件挂载完成后的 Kit 客户端类型 */
export type StoryKitClient = Awaited<ReturnType<typeof createStoryKitClient>>;

/**
 * 构建带 Story 程序插件的 Kit 客户端（含 RPC、交易规划/发送与占位 payer）。
 * payer 仅满足 `solanaRpc` 插件契约；用户真实签名应走 Privy / 业务侧传入的 `TransactionSigner`。
 */
export async function createStoryKitClient(endpoint: ClusterUrl) {
  return await createClient()
    .use(generatedPayer())
    .use(solanaRpc({ rpcUrl: endpoint }))
    .use(storyProgram());
}
