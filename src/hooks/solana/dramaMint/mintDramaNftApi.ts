import type { mintDramaNftResponse } from '@/api/__generated__/story/create-drama/create-drama';
import type { MintDramaNftRequest } from '@/api/__generated__/story/model/mintDramaNftRequest';
import { appAxiosInstance } from '@/api/appRequest';

/** 以字符串 dramaId 调用 mint 接口，避免雪花 ID 在 number 路径上丢精度。 */
export function mintDramaNftById(
  dramaId: string,
  body: MintDramaNftRequest,
  options?: RequestInit,
): Promise<mintDramaNftResponse> {
  return appAxiosInstance<mintDramaNftResponse>(
    `/api/mini-drama/creator/dramas/${encodeURIComponent(dramaId)}/nft/mint`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    },
  );
}
