import { isSolanaAddress } from '@/utils/formatAddress';

function extractAddressCandidate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.toLowerCase().startsWith('solana:')) {
    const withoutScheme = trimmed.slice('solana:'.length);
    const addressPart = withoutScheme.split(/[?#]/)[0]?.trim();
    if (addressPart && isSolanaAddress(addressPart)) {
      return addressPart;
    }
  }

  if (isSolanaAddress(trimmed)) {
    return trimmed;
  }

  return null;
}

/** 将 QR 解码文本解析为 Solana 钱包地址；无法识别时返回 null。 */
export function parseSolanaAddressFromQr(raw: string): string | null {
  const direct = extractAddressCandidate(raw);
  if (direct) {
    return direct;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const keys = ['address', 'wallet', 'recipient'] as const;

    for (const key of keys) {
      const value = parsed[key];
      if (typeof value === 'string') {
        const candidate = extractAddressCandidate(value);
        if (candidate) {
          return candidate;
        }
      }
    }
  } catch {
    // 非 JSON 格式，忽略
  }

  return null;
}
