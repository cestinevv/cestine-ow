/** actor_upgrade payload 第 5 段：逗号分隔的 burn assetId 列表 */
const ACTOR_UPGRADE_PAYLOAD_BURN_SEGMENT_INDEX = 4;

export function parseBurnAssetIdsFromUpgradeCanonicalPayload(
  canonicalPayload: string,
): string[] {
  const trimmed = canonicalPayload.trim();
  const segments = trimmed.split('|');

  if (segments[0] !== 'actor_upgrade') {
    throw new Error(
      `Invalid upgrade canonical payload prefix: ${segments[0] ?? '(empty)'}`,
    );
  }

  const burnSegment =
    segments[ACTOR_UPGRADE_PAYLOAD_BURN_SEGMENT_INDEX]?.trim();
  if (!burnSegment) {
    throw new Error('Upgrade canonical payload missing burnAssetIds segment');
  }

  if (!burnSegment.includes(',')) {
    return [burnSegment];
  }

  return burnSegment.split(',').map((assetId) => assetId.trim());
}

export function assertUpgradeBurnAssetIdsMatchPayload(params: {
  canonicalPayload: string;
  burnAssetIds: string[];
}): void {
  const payloadBurnAssetIds = parseBurnAssetIdsFromUpgradeCanonicalPayload(
    params.canonicalPayload,
  );

  const localBurnAssetIds = params.burnAssetIds;
  const lengthMatches = payloadBurnAssetIds.length === localBurnAssetIds.length;
  const orderMatches = payloadBurnAssetIds.every(
    (assetId, index) => assetId === localBurnAssetIds[index],
  );

  if (lengthMatches && orderMatches) {
    return;
  }

  console.error('[upgrade_actor_nft] burnAssetIds mismatch', {
    payloadBurnAssetIds,
    localBurnAssetIds,
    canonicalPayload: params.canonicalPayload,
  });

  throw new Error(
    'Upgrade burnAssetIds do not match canonical payload burn list order',
  );
}
