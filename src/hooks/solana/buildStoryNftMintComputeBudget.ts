import {
  ComputeBudgetProgram,
  type TransactionInstruction,
} from '@solana/web3.js';

/**
 * 单枚 Core Asset mint 的默认计算预算。
 */
export const STORY_NFT_MINT_COMPUTE_UNIT_LIMIT = 400_000;
export const STORY_CORE_BATCH_MINT_COMPUTE_UNIT_LIMIT = 1_400_000;
export const STORY_CORE_BATCH_MINT_HEAP_FRAME_BYTES = 256 * 1024;

/** 须放在交易最前（Ed25519 / mint 指令之前）。 */
export function buildStoryNftMintComputeBudgetInstructions(
  options: { mintCount?: number } = {},
): TransactionInstruction[] {
  const isBatchMint = (options.mintCount ?? 1) > 1;
  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: isBatchMint
        ? STORY_CORE_BATCH_MINT_COMPUTE_UNIT_LIMIT
        : STORY_NFT_MINT_COMPUTE_UNIT_LIMIT,
    }),
  ];

  if (isBatchMint) {
    instructions.push(
      ComputeBudgetProgram.requestHeapFrame({
        bytes: STORY_CORE_BATCH_MINT_HEAP_FRAME_BYTES,
      }),
    );
  }

  return instructions;
}
