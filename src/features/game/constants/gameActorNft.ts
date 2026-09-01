import { readSnowflakeId } from '@/utils/snowflakeId';

/** 角色 NFT 链上 assetId：`{collection_asset_id}_{mint_index}` */
export function buildActorAssetId(
  collectionId: string | number,
  tokenId: number | string,
): string {
  return `${String(collectionId)}_${tokenId}`;
}

/** 从 actor_nft_id 提取 collection assetId；无法解析时回退 actorCollectionId。 */
export function resolveCollectionAssetIdFromActorNftId(
  actorNftId: string,
  actorCollectionId?: string | number,
): string | undefined {
  const trimmed = actorNftId.trim().replace(/^#/, '');
  const underscoreIndex = trimmed.lastIndexOf('_');

  if (underscoreIndex > 0) {
    return trimmed.slice(0, underscoreIndex);
  }

  return readSnowflakeId(actorCollectionId);
}

/** 主 NFT 链上 assetId：优先完整 actorNftId（`{collection}_{index}`），否则回退拼装。 */
export function resolveMainActorAssetId(params: {
  actorNftId?: string;
  actorCollectionId?: string | number;
  actorTokenId?: number;
}): string | undefined {
  const { actorNftId, actorCollectionId, actorTokenId } = params;
  const trimmedNftId = actorNftId?.trim().replace(/^#/, '');

  if (trimmedNftId?.includes('_')) {
    return trimmedNftId;
  }

  const collectionAssetId = resolveCollectionAssetIdFromActorNftId(
    trimmedNftId ?? '',
    actorCollectionId,
  );

  if (!collectionAssetId || actorTokenId === undefined) {
    return undefined;
  }

  return buildActorAssetId(collectionAssetId, actorTokenId);
}

/** 补充体力订单 hash：SHA-256(UTF-8 orderNo)，32 字节。 */
export async function resolveRefillOrderHash(
  orderNo: string,
): Promise<Uint8Array> {
  const data = new TextEncoder().encode(orderNo.trim());

  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

/** 演员详情路由 ID：collection 雪花；优先 actorCollectionId，否则从 actorNftId 解析 */
export function resolveActorDetailRouteId(params: {
  actorNftId?: string;
  actorCollectionId?: string | number;
}): string | undefined {
  return (
    readSnowflakeId(params.actorCollectionId) ??
    resolveCollectionAssetIdFromActorNftId(
      params.actorNftId?.trim() ?? '',
      params.actorCollectionId,
    )
  );
}
