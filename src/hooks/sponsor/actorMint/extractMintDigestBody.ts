import type { mintActorNftResponse } from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { ActorNftMintDigestResponse } from '@/api/__generated__/story/model/actorNftMintDigestResponse';

/** 从 mintActorNft 响应体中取出摘要对象（兼容 BaseResponse 包裹）。 */
export function extractMintDigestBody(
  res: mintActorNftResponse | undefined,
): ActorNftMintDigestResponse | undefined {
  if (res?.status !== 200) {
    return undefined;
  }

  const outer = res.data as unknown;
  if (!outer || typeof outer !== 'object') {
    return undefined;
  }

  const record = outer as Record<string, unknown>;
  const inner = record.data;
  if (inner && typeof inner === 'object') {
    return inner as ActorNftMintDigestResponse;
  }

  return record as ActorNftMintDigestResponse;
}
