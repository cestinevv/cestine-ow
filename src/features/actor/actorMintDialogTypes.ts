/** 角色广场 / 详情 Mint 弹窗步骤（单一事实来源，禁止散落字符串）。 */
export enum ActorMintDialogStep {
  Closed = 'closed',
  Confirm = 'confirm',
  Success = 'success',
}

export type ActorMintDialogViewModel = {
  /** 雪花 ID 字符串，用于 API 路径 */
  actorId: string;
  name: string;
  imageUrl?: string;
  pricingMode: 'FIXED' | 'BONDING_CURVE';
  pricingModeLabel: string;
  mintPriceUsdc: number;
  mintedSupply: number;
  totalSupply: number;
  initialPriceUsdc: number;
  currentPriceUsdc: number;
  tailPriceUsdc: number;
  mintQuantity: number;
  availableMint: number;
  /** Actor SNFT mint（contractAddress / nftId） */
  nftContractAddress?: string;
  nftSeriesLabel?: string;
};
