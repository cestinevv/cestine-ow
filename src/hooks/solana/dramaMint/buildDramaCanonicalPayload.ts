export type BuildDramaCanonicalPayloadParams = {
  dramaId: string | number | bigint;
  walletAddress: string;
  metadataUrl: string;
  feeAmount: string | number | bigint;
  expiresAt: string | number | bigint;
};

/**
 * 短剧 mint_series_nft 的 canonical_payload。
 * 须与后端 Ed25519 签名时拼装的字符串逐字节一致。
 */
export function buildDramaCanonicalPayload(
  params: BuildDramaCanonicalPayloadParams,
): string {
  return [
    'drama',
    String(params.dramaId),
    params.walletAddress.trim(),
    params.metadataUrl.trim(),
    String(params.feeAmount),
    String(params.expiresAt),
  ].join('|');
}
