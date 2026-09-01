import type { Address } from '@solana/kit';

import type { MintActorNftRequestPayMethod } from '@/api/__generated__/story/model/mintActorNftRequestPayMethod';
import type { MintDramaNftRequestPayMethod } from '@/api/__generated__/story/model/mintDramaNftRequestPayMethod';
import {
  type ChainlinksMap,
  findChainTokenByAsset,
  getChainTokenAddress,
} from '@/hooks/solana/chainRpcConfig';
import type { SupportedChain } from '@/solana/chainConfig';

export type StoryPayToken =
  | MintActorNftRequestPayMethod
  | MintDramaNftRequestPayMethod;

const PAY_TOKEN_SYMBOL: Record<StoryPayToken, 'USDC' | 'USDT' | 'STORY'> = {
  usdc: 'USDC',
  usdt: 'USDT',
  point: 'STORY',
};

/** 将 Story 支付方式枚举解析为链上 SPL mint 地址。 */
export function resolveStoryPayTokenMint(
  chainlinks: ChainlinksMap | null | undefined,
  chain: SupportedChain,
  payToken: StoryPayToken,
): Address | undefined {
  if (payToken === 'usdc' || payToken === 'point') {
    const asset = payToken === 'usdc' ? 'USDC' : 'STORY';
    const token = findChainTokenByAsset(chainlinks, chain, asset);
    const address = token?.address?.trim();
    return address && address.length > 0 ? (address as Address) : undefined;
  }

  return getChainTokenAddress(chainlinks, chain, PAY_TOKEN_SYMBOL[payToken]);
}
