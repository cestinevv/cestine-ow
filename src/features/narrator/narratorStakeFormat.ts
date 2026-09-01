import type { PageDtoActorCollectionResponse as PageDtoStakedActorResponse } from '@/api/__generated__/story/model/pageDtoActorCollectionResponse';
import type { PageDtoDramaDetailResponse as PageDtoStakedDramaResponse } from '@/api/__generated__/story/model/pageDtoDramaDetailResponse';

import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import i18n from '@/i18n';

export { unwrapOrvalPayload };

/** NFT 展示 hash：地址前 8 位。 */
export function formatNftAddressPrefix(address?: string): string {
  return address?.trim().slice(0, 8) || 'Unknown';
}

/** 短剧 NFT 角标 / 弹窗编号：`DramaNFT#` + 合约地址前 8 位 */
export function formatDramaNftLabel(nftContractAddress?: string): string {
  return `DramaNFT#${formatNftAddressPrefix(nftContractAddress)}`;
}

/** 角色 NFT 角标 / 详情系列：`RoleNFT#` + 合约地址前 8 位 */
export function formatActorNftLabel(nftContractAddress?: string): string {
  return i18n.t('角色NFT#{{addressPrefix}}', {
    addressPrefix: formatNftAddressPrefix(nftContractAddress),
  });
}

const STAKED_MARK_END = '-1';

type StakedCursorPage = {
  hasMore?: boolean;
  mark?: string;
};

function getStakedMarkNextPageParam(
  pageData: StakedCursorPage | null | undefined,
): number | undefined {
  if (!pageData?.hasMore) {
    return undefined;
  }
  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }
  if (String(pageData.mark) === STAKED_MARK_END) {
    return undefined;
  }
  return Number(pageData.mark);
}

/** 短剧已质押列表 — 下一页 mark（原样透传接口返回值） */
export function getStakedDramaCursorNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData = unwrapOrvalPayload<PageDtoStakedDramaResponse>(lastPage);
  return getStakedMarkNextPageParam(pageData);
}

/** 角色已质押列表 — 下一页 mark（原样透传接口返回值） */
export function getStakedActorCursorNextPageParam(lastPage: {
  data?: unknown;
}): number | undefined {
  const pageData = unwrapOrvalPayload<PageDtoStakedActorResponse>(lastPage);
  return getStakedMarkNextPageParam(pageData);
}
