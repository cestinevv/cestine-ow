import type { mintDramaNftResponse } from '@/api/__generated__/story/create-drama/create-drama';
import type { DramaNftMintDigestResponse } from '@/api/__generated__/story/model/dramaNftMintDigestResponse';

/** 从 mintDramaNft 响应体中取出摘要对象（兼容 BaseResponse 包裹）。 */
export function extractMintDigestBody(
  res: mintDramaNftResponse | undefined,
): DramaNftMintDigestResponse | undefined {
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
    return inner as DramaNftMintDigestResponse;
  }

  return record as DramaNftMintDigestResponse;
}
