export type BuildCreateActorCollectionCanonicalPayloadParams = {
  actorCollectionId: string;
  creatorAddress: string;
  metadataUrl: string;
  totalSupply: number;
  feeAmount: string | number | bigint;
  initialPriceAmount: string | number | bigint;
  r: string | number | bigint;
  expiresAt: number;
};

/** create_actor_collection 的 canonical_payload。 */
export function buildCreateActorCollectionCanonicalPayload(
  params: BuildCreateActorCollectionCanonicalPayloadParams,
): string {
  return [
    'actor_collection',
    params.actorCollectionId,
    params.creatorAddress,
    params.metadataUrl,
    String(params.totalSupply),
    String(params.feeAmount),
    String(params.initialPriceAmount),
    String(params.r),
    String(params.expiresAt),
  ].join('|');
}
