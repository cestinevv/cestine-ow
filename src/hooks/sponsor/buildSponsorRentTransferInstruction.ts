import {
  type PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from '@solana/web3.js';

/**
 * 首次 mint 时 user 端需要支付的链上租金（lamports）一次性下限。
 *
 * 覆盖 `mint_series_nft` / `mint_actor_nft` 内 Anchor `init` / `init_if_needed`
 * 用 `payer = creator(user)` 创建的全部账户（按 2026-05 链上 simulation 日志反推校准）：
 *  - drama_mint / actor_mint PDA（SPL Token Mint，82 字节，≈1_461_600）
 *  - 用户 ATA（165 字节，≈2_039_280）
 *  - nft_info PDA（Anchor 实际尺寸，≈3_814_080）
 *  - Metaplex metadata 账户（Create Metadata v3，≈15_115_600，日志实测）
 *  - Metaplex master_edition 账户（≈2_853_600）
 *
 * 合计 ≈25.3M lamports；按 0.03 SOL 取整 + 冗余防 Anchor 字段增长 / Metaplex 协议升级 rent 上浮。
 *
 * 备注：本数额仅在 mint 指令内部 `init` / `init_if_needed` 命中且账户尚不存在时实际消耗；
 * 已存在则被复用为 user 的链上余额，账户被关闭时可回收。
 */
export const SPONSOR_FIRST_TIME_MINT_RENT_LAMPORTS = 30_000_000;

/**
 * 首次 stake 时 user 端需要支付的链上租金（lamports）一次性下限。
 *
 * 覆盖 `stake_nft` 内 Anchor `init` / `init_if_needed` 用 `payer = owner(user)` 创建的账户
 *（按 2026-05 链上 simulation 日志反推校准）：
 *  - stake_info PDA（按 (mint, owner) 派生，首次质押某个 mint 时 init）
 *  - user_stake_account PDA（按 owner 派生，user 首次质押任意 mint 时 init，size 较大 ≈12.7M）
 *
 * 合计 ≈14.3M lamports；按 15M 取整 + 冗余防 Anchor 字段增长。
 *
 * 备注：仅在用户首次质押该 mint（或首次质押任意资产）时实际消耗；
 * 后续重复质押已存在的 stake_info / user_stake_account 不会再次扣 rent。
 */
export const SPONSOR_FIRST_TIME_STAKE_RENT_LAMPORTS = 15_000_000;

/**
 * Core `batch_mint_actor_nft`：creator 在 MPL Core CPI 内为每枚 Asset 付 rent-exempt 押金。
 * 按 devnet simulation 粗估每枚 ≈2–3M lamports；代付路径按 `mintCount` 线性叠加并略留冗余。
 */
export const SPONSOR_CORE_ACTOR_MINT_RENT_PER_NFT_LAMPORTS = 3_000_000;

/**
 * Core `create_actor_collection`：creator 在 MPL Core CPI 内创建 Collection + CollectionInfo，
 * 并可能从 creatorPayAccount 扣 USDC 创建费。
 */
export const SPONSOR_CORE_CREATE_ACTOR_COLLECTION_RENT_LAMPORTS = 30_000_000;

/**
 * Core `mint_series_nft`：单枚短剧 Asset 创建 rent 预算（与演员单枚 mint 同量级）。
 */
export const SPONSOR_CORE_DRAMA_MINT_RENT_LAMPORTS =
  SPONSOR_CORE_ACTOR_MINT_RENT_PER_NFT_LAMPORTS;

/**
 * 由 sponsor（feePayer）向 user 预付一笔 SOL，仅用于覆盖紧随其后的链上指令
 * 在程序内部用 `payer = creator/owner` 创建账户时所需 rent-exempt 押金。
 *
 * 使用场景：
 *  - mint 账户在本笔 tx 内才会被 init（如短剧首次 mint、演员 NFT 首次 mint）：
 *    不能用 `createAssociatedTokenAccountIdempotentInstruction` 提前建 ATA
 *    （此时 mint 尚未具备 SPL Token 身份，ATA 校验会以 `IncorrectProgramId` 失败）。
 *  - 质押指令内部 init `stake_info` / `user_stake_account` PDA（与 mint 同理，user 0-SOL 时 CPI Transfer 失败）。
 *
 * 调用方可通过 `lamports` 显式指定（mint 用 30M、stake 用 15M）；缺省按首次 mint 预算。
 */
export function buildSponsorRentTransferInstruction(params: {
  feePayer: PublicKey;
  user: PublicKey;
  lamports?: number;
}): TransactionInstruction {
  const lamports = params.lamports ?? SPONSOR_FIRST_TIME_MINT_RENT_LAMPORTS;

  return SystemProgram.transfer({
    fromPubkey: params.feePayer,
    toPubkey: params.user,
    lamports,
  });
}
