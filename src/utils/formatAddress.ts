import { PublicKey } from '@solana/web3.js';

/**
 * 格式化钱包地址为 0x1234...5678 格式
 */
export function formatAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4,
): string {
  if (!address) return '';
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/** 判断是否为有效 Solana 钱包地址 */
export function isSolanaAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    new PublicKey(trimmed);
    return true;
  } catch {
    return false;
  }
}

/** 创作者展示名：地址则缩写，否则原样（不含 @） */
export function formatCreatorDisplayName(raw: string): string {
  const handle = raw.replace(/^@/, '').trim();
  if (!handle) {
    return '';
  }

  if (isSolanaAddress(handle)) {
    return formatAddress(handle);
  }

  return handle;
}

/** 卡片 @handle：地址则 @缩写，否则 @昵称 */
export function formatCreatorAtHandle(raw: string): string {
  const display = formatCreatorDisplayName(raw);
  if (!display) {
    return '';
  }

  return `@${display}`;
}

/** 超出 maxLength 时在末尾追加省略号 */
export function truncateWithEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}
