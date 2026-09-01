export const ACTOR_BONDING_CURVE_BASE = 5;

export const ACTOR_PRICING_MODE = {
  FIXED: 'FIXED',
  BONDING_CURVE: 'BONDING_CURVE',
} as const;

export type ActorPricingMode =
  (typeof ACTOR_PRICING_MODE)[keyof typeof ACTOR_PRICING_MODE];

export function normalizeActorPricingMode(
  pricingMode: string | null | undefined,
): ActorPricingMode {
  return pricingMode === ACTOR_PRICING_MODE.FIXED
    ? ACTOR_PRICING_MODE.FIXED
    : ACTOR_PRICING_MODE.BONDING_CURVE;
}

export function isFixedActorPricingMode(
  pricingMode: string | null | undefined,
): boolean {
  return normalizeActorPricingMode(pricingMode) === ACTOR_PRICING_MODE.FIXED;
}

export function getActorPricingModeLabel(
  pricingMode: string | null | undefined,
): '固定价格' | '曲线价格' {
  return isFixedActorPricingMode(pricingMode) ? '固定价格' : '曲线价格';
}

export function getActorBondingCurvePrice(
  initialPrice: number,
  signedCount: number,
  maxSupply: number,
) {
  if (initialPrice <= 0 || maxSupply <= 0) {
    return 0;
  }

  const normalizedSignedCount = Math.floor(
    Math.min(Math.max(0, signedCount), maxSupply),
  );
  const stepMultiplier = ACTOR_BONDING_CURVE_BASE ** (1 / maxSupply);
  let price = initialPrice;

  for (let index = 0; index < normalizedSignedCount; index += 1) {
    price = truncateActorPrice(price * stepMultiplier);
  }

  return price;
}

export function getActorBondingCurveTailPrice(
  initialPrice: number,
  maxSupply: number,
) {
  return getActorBondingCurvePrice(
    initialPrice,
    Math.max(0, maxSupply - 1),
    maxSupply,
  );
}

export function resolveActorDisplayCurrentPrice({
  pricingMode,
  initialPrice,
  currentPrice,
  signedCount,
  maxSupply,
}: {
  pricingMode: string | null | undefined;
  initialPrice: number;
  currentPrice: number | undefined;
  signedCount: number;
  maxSupply: number;
}) {
  if (currentPrice !== undefined && currentPrice > 0) {
    return currentPrice;
  }

  if (isFixedActorPricingMode(pricingMode)) {
    return initialPrice;
  }

  return getActorBondingCurvePrice(initialPrice, signedCount, maxSupply);
}

function truncateActorPrice(price: number) {
  return Math.trunc(price * 1_000_000) / 1_000_000;
}
