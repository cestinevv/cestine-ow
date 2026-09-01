import type { MintActorNftRequestPayMethod } from '@/api/__generated__/story/model/mintActorNftRequestPayMethod';
import { resolveStoryPayTokenMint } from '@/hooks/solana/resolveStoryPayTokenMint';

export type ActorPayToken = MintActorNftRequestPayMethod;

/** 将演员 mint / supplement API 的 payToken 枚举解析为链上 SPL mint 地址。 */
export const resolveActorPayTokenMint = resolveStoryPayTokenMint;
