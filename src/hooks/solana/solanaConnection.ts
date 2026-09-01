import { Connection } from '@solana/web3.js';

const connectionCache = new Map<string, Connection>();

export function getSolanaChainConnection(
  http: string,
  wss?: string,
): Connection {
  const cacheKey = `${http}|${wss ?? ''}`;

  if (connectionCache.has(cacheKey)) {
    const cached = connectionCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const connection = new Connection(http, {
    commitment: 'confirmed',
    wsEndpoint: wss,
  });

  connectionCache.set(cacheKey, connection);
  return connection;
}
