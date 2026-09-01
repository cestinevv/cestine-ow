import type { ClusterUrl } from '@solana/kit';
import { createSolanaRpcSubscriptions } from '@solana/kit';

const rpcSubscriptionsCache = new Map<
  string,
  ReturnType<typeof createSolanaRpcSubscriptions>
>();

export function getRpcSubscriptions(wssUrl: string) {
  const cached = rpcSubscriptionsCache.get(wssUrl);
  if (cached) {
    return cached;
  }

  const created = createSolanaRpcSubscriptions(wssUrl as ClusterUrl);
  rpcSubscriptionsCache.set(wssUrl, created);
  return created;
}
