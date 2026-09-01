/** SPL / 链上代币元数据（如 chainlinks.tokens.usdc） */
export interface Token {
  icon: string;
  symbol: string;
  address: string;
  decimals: number;
  fullSymbol: string;
}

/** 按资产 key 索引的代币表，如 `{ usdc: Token }` */
export type TokenMap = Record<string, Token>;
