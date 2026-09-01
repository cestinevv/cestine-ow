import Decimal from 'decimal.js';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { PageDtoActorCollectionResponse } from '@/api/__generated__/story/model/pageDtoActorCollectionResponse';
import type { PageDtoDramaListItemResponse } from '@/api/__generated__/story/model/pageDtoDramaListItemResponse';
import type { ActorMintDialogViewModel } from '@/features/actor/actorMintDialogTypes';
import {
  getActorBondingCurveTailPrice,
  getActorPricingModeLabel,
  normalizeActorPricingMode,
  resolveActorDisplayCurrentPrice,
} from '@/features/actor/actorPricing';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { formatActorNftLabel } from '@/features/narrator/narratorStakeFormat';
import { formatNumber } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

export { unwrapOrvalPayload };

/** 路由 / 接口路径使用的角色雪花 ID（禁止转 number，避免丢精度）。 */
export function parseActorId(actorId: string): string | undefined {
  return readSnowflakeId(actorId);
}

export function formatActorIpDisplay(actorId: string | null | undefined) {
  const text = actorId?.trim();
  if (!text) {
    return '-';
  }
  if (text.length <= 8) {
    return text;
  }
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

const ACTOR_NFT_TOKEN_STANDARD_LABELS = {
  CORE_ASSET: 'Core Asset',
  CORE_COLLECTION: 'Core Collection',
} as const;

/** 角色 IP 详情页 Token 标准展示（未命中映射时返回接口原值）。 */
export function formatActorNftTokenStandard(
  nftTokenStandard?: string | null,
): string {
  const raw = nftTokenStandard?.trim();
  if (!raw) {
    return '-';
  }

  const mapped =
    ACTOR_NFT_TOKEN_STANDARD_LABELS[
      raw as keyof typeof ACTOR_NFT_TOKEN_STANDARD_LABELS
    ];

  return mapped ?? raw;
}

const ACTOR_MARK_END = '-1';

function getCursorMarkNextPageParam(
  pageData:
    | PageDtoActorCollectionResponse
    | PageDtoDramaListItemResponse
    | null
    | undefined,
): string | undefined {
  if (!pageData?.hasMore) {
    return undefined;
  }
  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }
  if (String(pageData.mark) === ACTOR_MARK_END) {
    return undefined;
  }
  return String(pageData.mark);
}

export function getActorCursorNextPageParam(lastPage: {
  data?: unknown;
}): string | undefined {
  const pageData = unwrapOrvalPayload<PageDtoActorCollectionResponse>(lastPage);
  return getCursorMarkNextPageParam(pageData);
}

export function getActorCastDramasCursorNextPageParam(lastPage: {
  data?: unknown;
}): string | undefined {
  const pageData = unwrapOrvalPayload<PageDtoDramaListItemResponse>(lastPage);
  return getCursorMarkNextPageParam(pageData);
}

function readActorPlazaNumericField(
  source: Record<string, unknown>,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const raw = source[key];
    if (raw === undefined || raw === null || raw === '') {
      continue;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

export function readActorCollectionNumber(
  source: ActorCollectionResponse,
  keys: readonly string[],
  fallback = 0,
): number {
  return (
    readActorPlazaNumericField(source as Record<string, unknown>, keys) ??
    fallback
  );
}

const TOTAL_ACTOR_REVENUE_FIELD_KEYS = [
  'totalRevenue',
  'total',
  'amount',
  'revenue',
  'revenueShareUsdc',
] as const;

/** GET /api/reward/totalActorRevenue 的 data 解析为 USDC 数值 */
export function parseTotalActorRevenuePayload(
  response: { data?: unknown } | undefined,
): number | undefined {
  const payload = unwrapOrvalPayload<unknown>(response);
  if (payload === undefined || payload === null) {
    return undefined;
  }

  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return payload;
  }

  if (typeof payload === 'string') {
    const parsed = Number(payload);
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    return undefined;
  }

  if (typeof payload === 'object') {
    return readActorPlazaNumericField(
      payload as Record<string, unknown>,
      TOTAL_ACTOR_REVENUE_FIELD_KEYS,
    );
  }

  return undefined;
}

function resolveActorNftContractAddress(
  source: ActorCollectionResponse,
): string | undefined {
  return source.nftMintAddress?.trim() || undefined;
}

export function resolveActorAvatarUrl(
  source: ActorCollectionResponse,
): string | undefined {
  return source.avatarUrl?.trim() || undefined;
}

/** 已铸造数量：优先使用接口直出，缺失时用发行总量和可 Mint 数推导。 */
function resolveActorMintedSupply(
  actor: ActorCollectionResponse,
): number | undefined {
  const mintedSupply = readActorPlazaNumericField(
    actor as Record<string, unknown>,
    ['mintedSupply'],
  );
  if (mintedSupply !== undefined) {
    return mintedSupply;
  }

  const totalSupply = readActorPlazaNumericField(
    actor as Record<string, unknown>,
    ['totalSupply'],
  );
  const availableSupply = readActorPlazaNumericField(
    actor as Record<string, unknown>,
    ['availableSupply'],
  );
  if (totalSupply !== undefined && availableSupply !== undefined) {
    return Math.max(0, totalSupply - availableSupply);
  }

  return undefined;
}

const ACTOR_FLOOR_PRICE_FIELD_KEYS = [
  'floorPriceUsdc',
  'floorPrice',
  'lowestListingPriceUsdc',
] as const;

/** 二级市场地板价（接口字段未生成前兼容扩展字段）。 */
export function resolveActorFloorPriceUsdc(
  item: ActorCollectionResponse,
): number | undefined {
  return readActorPlazaNumericField(
    item as Record<string, unknown>,
    ACTOR_FLOOR_PRICE_FIELD_KEYS,
  );
}

/** 地板价展示：无有效值时返回 `-- USDC`。 */
export function formatActorFloorPriceDisplay(
  floorPriceUsdc: number | undefined,
): string {
  if (floorPriceUsdc === undefined || floorPriceUsdc <= 0) {
    return '-- USDC';
  }

  return `${formatNumber(floorPriceUsdc, 2)} USDC`;
}

export function formatActorPriceCeilDisplay(priceUsdc: number): string {
  if (!Number.isFinite(priceUsdc) || priceUsdc <= 0) {
    return '0';
  }

  const roundedUpPrice = new Decimal(priceUsdc).toDecimalPlaces(
    2,
    Decimal.ROUND_UP,
  );

  return formatNumber(roundedUpPrice, 2);
}

export const formatActorTailPriceDisplay = formatActorPriceCeilDisplay;

/** 角色广场 / Mint 弹窗展示口径（仅使用中心化接口字段）。 */
export function getActorPlazaCardDisplay(item: ActorCollectionResponse) {
  const initialPriceUsdc = readActorCollectionNumber(
    item,
    ['initialPriceUsdc', 'initialPriceUsd'],
    0,
  );
  const apiCurrentPriceUsdc = readActorPlazaNumericField(
    item as Record<string, unknown>,
    ['currentPriceUsdc', 'currentPriceUsd'],
  );
  const minted = resolveActorMintedSupply(item) ?? 0;
  const totalSupply = readActorCollectionNumber(item, ['totalSupply'], 0);
  const pricingMode = normalizeActorPricingMode(item.pricingMode);
  const currentPriceUsdc = resolveActorDisplayCurrentPrice({
    pricingMode,
    initialPrice: initialPriceUsdc,
    currentPrice: apiCurrentPriceUsdc,
    signedCount: minted,
    maxSupply: totalSupply,
  });

  return {
    minted,
    availableMint: readActorCollectionNumber(item, ['availableSupply'], 0),
    creatorReserved: 0,
    totalSupply,
    initialPriceUsdc,
    currentPriceUsdc,
    tailPriceUsdc: getActorBondingCurveTailPrice(initialPriceUsdc, totalSupply),
    mintPriceUsdc: currentPriceUsdc,
    pricingMode,
    pricingModeLabel: getActorPricingModeLabel(pricingMode),
    isFixedPricing: pricingMode === 'FIXED',
  };
}

export function getActorCollectionCurrentPriceUsdc(
  item: ActorCollectionResponse,
) {
  return getActorPlazaCardDisplay(item).currentPriceUsdc;
}

export function getActorCollectionPricingModeLabel(
  item: ActorCollectionResponse,
) {
  return getActorPricingModeLabel(item.pricingMode);
}

export function getActorCollectionTailPriceUsdc(item: ActorCollectionResponse) {
  const initialPriceUsdc = readActorCollectionNumber(
    item,
    ['initialPriceUsdc', 'initialPriceUsd'],
    0,
  );
  const totalSupply = readActorCollectionNumber(item, ['totalSupply'], 0);

  return getActorBondingCurveTailPrice(initialPriceUsdc, totalSupply);
}

/** 角色 Mint 确认弹窗展示口径（广场卡 / 详情页共用）。 */
export function getActorMintDialogViewModel(
  source: ActorCollectionResponse,
  options?: { mintQuantity?: number; availableMint?: number },
): ActorMintDialogViewModel {
  const plaza = getActorPlazaCardDisplay(source);
  const nftContractAddress = resolveActorNftContractAddress(source);
  const nftSeriesLabel = nftContractAddress
    ? formatActorNftLabel(nftContractAddress)
    : undefined;

  const actorId = readSnowflakeId(source.id);

  return {
    actorId: actorId ?? '',
    name: source.name?.trim() || '-',
    imageUrl: resolveActorAvatarUrl(source),
    mintPriceUsdc: plaza.mintPriceUsdc,
    mintedSupply: plaza.minted,
    initialPriceUsdc: plaza.initialPriceUsdc,
    currentPriceUsdc: plaza.currentPriceUsdc,
    tailPriceUsdc: plaza.tailPriceUsdc,
    pricingMode: plaza.pricingMode,
    pricingModeLabel: plaza.pricingModeLabel,
    totalSupply: plaza.totalSupply,
    mintQuantity: options?.mintQuantity ?? 1,
    availableMint: options?.availableMint ?? plaza.availableMint,
    nftContractAddress: nftContractAddress || undefined,
    nftSeriesLabel,
  };
}
