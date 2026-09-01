export type BuildActorBatchCanonicalPayloadParams = {
  actorCollectionId: string;
  walletAddress: string;
  mintCount: number;
  totalAmount: string | number | bigint;
  orderNo: string | number | bigint;
  expiresAt: string | number | bigint;
};

/** batch_mint_actor_nft 的 canonical_payload。 */
export function buildActorBatchCanonicalPayload(
  params: BuildActorBatchCanonicalPayloadParams,
): string {
  return [
    'actor_batch',
    params.actorCollectionId.trim(),
    params.walletAddress.trim(),
    String(params.mintCount),
    String(params.totalAmount),
    String(params.orderNo),
    String(params.expiresAt),
  ].join('|');
}
