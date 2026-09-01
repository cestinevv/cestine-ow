# Story 演员与短剧 Solana 合约接入实施计划

> **给执行代理：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行。步骤使用 checkbox（`- [ ]`）跟踪。

**Goal:** 完成演员创建、演员列表/详情页 mint 弹窗的合约读写接入，并同步短剧列表 mint drama NFT 的 `mint_series_nft` 合约接口改动。

**Architecture:** 演员列表与演员详情的基础数据只读后端接口，避免列表页批量 RPC 读导致 429；只有用户确认 mint 前，才读取链上 `get_actor_mint_price` 并构造 `batch_mint_actor_nft`。短剧 mint 继续走 `mint_series_nft`，补齐新版 IDL 所需账户、payload 和支付字段。

**Tech Stack:** React, TypeScript, TanStack Query, Solana Web3.js, `@solana/kit`, SPL Token, Privy Solana wallet, Codama generated Story client.

---

## 执行状态

- [x] 完成 `mint_series_nft` 的新版 payload、支付账户和普通/代付交易组装。
- [x] 完成 `get_actor_mint_price` 链上读价 helper。
- [x] 完成 `batch_mint_actor_nft` 的 payload、账户推导、remaining accounts 和普通/代付交易组装。
- [x] 演员列表与详情页继续只读后端数据，成功后不再刷新 actor plaza 链上 supply query。
- [x] 旧 `mint_actor_snft` / `mint_actor_nft` 合约写入入口已从业务交易流程迁移；后端 `mintActorNft` API 仍作为签名摘要接口保留。
- [ ] `ConfirmMintActorNftDialog` 尚未新增“链上确认价格中 / 当前链上价格”展示态；当前是在确认后、发送交易前读价并校验。
- [ ] 未做浏览器实链联调；本轮只做代码接入与静态定向验证。

## 文件结构

- Modify: `src/hooks/solana/dramaMint/buildDramaCanonicalPayload.ts`
  - 对齐 `mint_series_nft` 的 canonical payload 字段。
- Modify: `src/hooks/solana/dramaMint/buildMintSeriesNftWeb3Instruction.ts`
  - 对齐新版 generated `mintSeriesNft` 账户顺序和入参。
- Modify: `src/hooks/solana/useMintDramaNftOnChain.ts`
  - 补齐 `payTokenMint`、`creatorPayAccount`、`treasuryTokenAccount`、`feeAmount` 等上下文。
- Modify: `src/hooks/sponsor/dramaMint/useSponsorMintDramaNft.ts`
  - 同步代付 mint drama NFT 的新版账户与 payload。
- Create: `src/hooks/solana/actorMint/buildActorBatchCanonicalPayload.ts`
  - 构造 `actor_batch|{walletAddress}|{payToken}|{mintCount}|{feeAmount}|{expiresAt}`。
- Create: `src/hooks/solana/actorMint/fetchActorMintPrice.ts`
  - 调用 `get_actor_mint_price` 读取 `ActorMintPriceView`。
- Create: `src/hooks/solana/actorMint/resolveBatchMintActorNftAccounts.ts`
  - 推导 collection、payment、actor NFT PDA、metadata、master edition、creator ATA 和 `remaining_accounts`。
- Modify: `src/hooks/solana/actorMint/buildMintActorNftWeb3Instruction.ts`
  - 从旧 `mint_actor_nft` 改为 `batch_mint_actor_nft`。
- Modify: `src/hooks/solana/actorMint/buildMintActorNftVersionedTransaction.ts`
  - 支持 batch mint 的 compute budget、remaining accounts 和交易体积检查。
- Modify: `src/hooks/solana/useMintActorNftOnChain.ts`
  - 执行流程改为确认 mint 前读取 `get_actor_mint_price`，再执行 `batch_mint_actor_nft`。
- Modify: `src/hooks/sponsor/actorMint/useSponsorMintActorNft.ts`
  - 代付流程同步 `get_actor_mint_price` + `batch_mint_actor_nft`。
- Modify: `src/features/actor/components/ActorMintDialogs.tsx`
  - 移除列表/详情弹窗对链上列表统计的依赖；确认 mint 时触发链上读价。
- Modify: `src/features/actor/components/ConfirmMintActorNftDialog.tsx`
  - UI 展示“链上确认价格中 / 当前链上价格 / 总支付预估”，避免把后端列表价格当成最终链上价格。
- Modify: `src/features/actor/ActorPlazaView.tsx`
  - 确认演员列表只读后端列表，不挂接批量链上 supply 查询。
- Modify: `src/features/actor/ActorDetailView.tsx`
  - 详情基础数据只读后端；只有 mint 弹窗确认前读链上价格。
- Review/Remove: `src/hooks/solana/nftInfoBatch/actorPlaza/*`
  - 若仍被演员列表调用，移除列表调用；文件可保留给其他页面，但不能在演员列表触发。

---

### Task 1: 确认现有调用面和旧引用

**Files:**
- Inspect: `src/hooks/solana/useMintDramaNftOnChain.ts`
- Inspect: `src/hooks/sponsor/dramaMint/useSponsorMintDramaNft.ts`
- Inspect: `src/hooks/solana/useMintActorNftOnChain.ts`
- Inspect: `src/hooks/sponsor/actorMint/useSponsorMintActorNft.ts`
- Inspect: `src/features/actor/components/ActorMintDialogs.tsx`
- Inspect: `src/features/actor/ActorPlazaView.tsx`
- Inspect: `src/features/actor/ActorDetailView.tsx`

- [ ] **Step 1: 搜索旧生成指令引用**

Run:

```bash
rg -n "mintActorNft|mintActorSnft|getSnftInfo|findMintPda\\(\\s*\\{ actorId|findNftInfoPda\\(\\s*\\{ actorId" src --glob '*.{ts,tsx}'
```

Expected: 列出所有仍引用旧 actor 指令/PDA 参数的文件。

- [ ] **Step 2: 搜索演员列表链上批量读取调用**

Run:

```bash
rg -n "actor-plaza-list-on-chain-supply|useActorPlazaListOnChainSupply|fetchActorPlazaListOnChainSupply|nftInfoBatch/actorPlaza" src --glob '*.{ts,tsx}'
```

Expected: 找到演员列表是否还会触发链上批量查询。

- [ ] **Step 3: 标记必须迁移的旧入口**

迁移清单：

```text
mintActorNft -> batchMintActorNft
mintActorSnft -> batchMintActorNft 或删除入口
getSnftInfo -> getActorNftInfo
findMintPda({ actorId }) -> findMintPda({ assetId })
findNftInfoPda({ actorId }) -> findNftInfoPda({ assetId })
```

### Task 2: 完成 `mint_series_nft` 的改动点

**Files:**
- Modify: `src/hooks/solana/dramaMint/buildDramaCanonicalPayload.ts`
- Modify: `src/hooks/solana/dramaMint/buildMintSeriesNftWeb3Instruction.ts`
- Modify: `src/hooks/solana/useMintDramaNftOnChain.ts`
- Modify: `src/hooks/sponsor/dramaMint/useSponsorMintDramaNft.ts`

- [ ] **Step 1: 对照 generated 指令确认账户顺序**

Run:

```bash
sed -n '1,260p' src/solana/generated/story/src/generated/instructions/mintSeriesNft.ts
```

Expected: 明确新版 `mint_series_nft` 账户包含 `payTokenMint`、`creatorPayAccount`、`treasury`，并确认参数仍是 `dramaId` + `SignedParams`。

- [ ] **Step 2: 对齐 drama canonical payload**

目标格式：

```text
drama|{dramaId}|{walletAddress}|{metadataUrl}|{payToken}|{feeAmount}|{expiresAt}
```

实现要求：

```ts
export type BuildDramaCanonicalPayloadParams = {
  dramaId: string | number | bigint;
  walletAddress: string;
  metadataUrl: string;
  payToken: string;
  feeAmount: string | number | bigint;
  expiresAt: string | number | bigint;
};
```

- [ ] **Step 3: 更新普通钱包短剧 mint 上下文**

在 `useMintDramaNftOnChain` 中保证：

```text
payTokenMint = resolveStoryPayToken(...)
creatorPayAccount = ATA(user, payTokenMint)
treasuryTokenAccount = ATA(config.treasury, payTokenMint)
feeAmount = digest.feeAmount 或前端约定默认值
```

- [ ] **Step 4: 更新代付短剧 mint 上下文**

在 `useSponsorMintDramaNft` 中保持和普通钱包一致的账户推导与 canonical payload。代付只改变交易提交方式，不改变合约 instruction 账户。

- [ ] **Step 5: 定向验证 drama mint 类型引用**

Run:

```bash
pnpm exec biome check src/hooks/solana/dramaMint src/hooks/solana/useMintDramaNftOnChain.ts src/hooks/sponsor/dramaMint/useSponsorMintDramaNft.ts
```

Expected: 本次涉及文件无 Biome 错误。

### Task 3: 新增演员 batch mint payload 和链上读价 helper

**Files:**
- Create: `src/hooks/solana/actorMint/buildActorBatchCanonicalPayload.ts`
- Create: `src/hooks/solana/actorMint/fetchActorMintPrice.ts`

- [ ] **Step 1: 新增 actor batch canonical builder**

目标 API：

```ts
export type BuildActorBatchCanonicalPayloadParams = {
  walletAddress: string;
  payToken: string;
  mintCount: number;
  feeAmount: string | number | bigint;
  expiresAt: string | number | bigint;
};

export function buildActorBatchCanonicalPayload(
  params: BuildActorBatchCanonicalPayloadParams,
): string {
  return [
    'actor_batch',
    params.walletAddress,
    params.payToken,
    String(params.mintCount),
    String(params.feeAmount),
    String(params.expiresAt),
  ].join('|');
}
```

- [ ] **Step 2: 新增 `get_actor_mint_price` 读取 helper**

目标行为：

```text
input: rpcEndpoint, storyProgramId, collectionInfo
output: ActorMintPriceView
```

实现要求：

```ts
getGetActorMintPriceInstruction({ collectionInfo })
```

通过当前项目已有的 Solana RPC 调用方式模拟只读 instruction；如果项目没有统一 helper，先封装在 actorMint 目录内，不引入全局抽象。

- [ ] **Step 3: 读价错误处理**

错误文案：

```text
演员链上价格读取失败，请稍后重试
演员已售罄
Mint 数量超过单次上限
```

- [ ] **Step 4: 定向验证 helper**

Run:

```bash
pnpm exec biome check src/hooks/solana/actorMint/buildActorBatchCanonicalPayload.ts src/hooks/solana/actorMint/fetchActorMintPrice.ts
```

Expected: PASS。

### Task 4: 实现 `batch_mint_actor_nft` 账户推导与 instruction builder

**Files:**
- Create: `src/hooks/solana/actorMint/resolveBatchMintActorNftAccounts.ts`
- Modify: `src/hooks/solana/actorMint/buildMintActorNftWeb3Instruction.ts`
- Modify: `src/hooks/solana/actorMint/buildMintActorNftVersionedTransaction.ts`

- [ ] **Step 1: 推导 collection 固定账户**

输入：

```ts
type ResolveBatchMintActorNftAccountsParams = {
  creator: PublicKey;
  storyProgramId: Address;
  collectionAssetId: string;
  collectionMint: PublicKey;
  payTokenMint: PublicKey;
  treasury: PublicKey;
  mintStartIndex: bigint;
  mintCount: number;
};
```

输出必须包含：

```text
collectionInfo
collectionMint
collectionMetadata
collectionMasterEdition
creatorPayAccount
treasuryTokenAccount
actor remaining account metas
```

- [ ] **Step 2: 推导 actor asset id**

使用当前 IDL 注释约定：

```ts
function buildActorAssetId(collectionAssetId: string, mintIndex: bigint): string {
  return `${collectionAssetId}_${mintIndex.toString()}`;
}
```

注意：执行前如合约确认格式不同，先改这里，不要散落在组件内。

- [ ] **Step 3: 构造 remaining accounts**

每个 actor 顺序：

```text
mint
nftInfo
metadata
masterEdition
```

批量末尾追加：

```text
ATA(creator, mint_1)
ATA(creator, mint_2)
...
```

- [ ] **Step 4: 替换 instruction data encoder**

从旧：

```ts
getMintActorNftInstructionDataEncoder()
```

改为：

```ts
getBatchMintActorNftInstructionDataEncoder()
```

参数：

```ts
{
  mintCount,
  params: {
    canonicalPayload,
    sig: sig64,
  },
}
```

- [ ] **Step 5: 定向验证 instruction builder**

Run:

```bash
pnpm exec biome check src/hooks/solana/actorMint/resolveBatchMintActorNftAccounts.ts src/hooks/solana/actorMint/buildMintActorNftWeb3Instruction.ts src/hooks/solana/actorMint/buildMintActorNftVersionedTransaction.ts
```

Expected: PASS。

### Task 5: 改造普通钱包演员 mint 流程

**Files:**
- Modify: `src/hooks/solana/useMintActorNftOnChain.ts`
- Modify: `src/features/actor/components/ActorMintDialogs.tsx`

- [ ] **Step 1: 修改执行参数**

`ExecuteMintActorNftOnChainParams` 需要包含：

```ts
type ExecuteMintActorNftOnChainParams = {
  digest: ActorNftMintDigestResponse;
  actor: ActorCollectionResponse;
  canonicalPayload: string;
  payTokenMint: Address;
  mintCount: number;
  feeAmount: string | number | bigint;
  rpcEndpoint: string;
  storyProgramId: Address;
  collectionAssetId: string;
  collectionMint: Address;
  delegator: Address;
  treasury: Address;
  lookupTableAddress: Address;
  explorer?: ChainExplorer;
};
```

- [ ] **Step 2: 确认 mint 前读取链上价格**

执行顺序必须是：

```text
用户点击确认
后端返回签名 digest
读取 get_actor_mint_price
校验 soldOut / mintCount / 余额
构造 actor_batch canonical payload
构造 Ed25519 ix
构造 batch_mint_actor_nft ix
签名发送交易
确认交易
刷新后端列表/详情缓存
```

- [ ] **Step 3: 禁止演员列表自动链上读**

`ActorMintDialogs` 只能在 `handleConfirmMint` 中触发 `get_actor_mint_price`。不要在 `ActorPlazaView`、卡片渲染、列表 query 里调用 actor 链上读价或 batch supply。

- [ ] **Step 4: 钱包余额校验改用链上读价结果**

余额校验使用：

```text
estimatedPayAmount = sum from chain preview 或 nextMintPrice * mintCount 的临时预估
```

如果 helper 只能读下一枚价格，前端用于余额预校验时只做保守展示；最终扣款仍以合约执行为准。

- [ ] **Step 5: 定向验证普通钱包 actor mint**

Run:

```bash
pnpm exec biome check src/hooks/solana/useMintActorNftOnChain.ts src/features/actor/components/ActorMintDialogs.tsx
```

Expected: PASS。

### Task 6: 改造代付演员 mint 流程

**Files:**
- Modify: `src/hooks/sponsor/actorMint/useSponsorMintActorNft.ts`
- Optional Modify: `src/hooks/sponsor/actorMint/extractMintDigestBody.ts`

- [ ] **Step 1: 同步普通钱包参数与账户推导**

代付流程仍需要：

```text
get_actor_mint_price
actor_batch canonical payload
Ed25519 verify ix
batch_mint_actor_nft ix
partial tx
submit sponsor request
```

- [ ] **Step 2: 保持 sponsor 只改变提交方式**

不要为 sponsor 单独实现一套 actor PDA 规则。普通钱包和 sponsor 共享：

```text
buildActorBatchCanonicalPayload
resolveBatchMintActorNftAccounts
buildMintActorNftWeb3Instruction
buildMintActorNftVersionedTransaction
```

- [ ] **Step 3: 定向验证 sponsor actor mint**

Run:

```bash
pnpm exec biome check src/hooks/sponsor/actorMint/useSponsorMintActorNft.ts src/hooks/sponsor/actorMint/extractMintDigestBody.ts
```

Expected: PASS；如果 `extractMintDigestBody.ts` 未改，只检查 `useSponsorMintActorNft.ts`。

### Task 7: 调整演员列表和详情页读策略

**Files:**
- Modify: `src/features/actor/ActorPlazaView.tsx`
- Modify: `src/features/actor/ActorDetailView.tsx`
- Modify: `src/features/actor/components/ActorPlazaCard.tsx`
- Modify: `src/features/actor/components/ActorDetailIssueSection.tsx`
- Review/Remove usage: `src/hooks/solana/nftInfoBatch/actorPlaza/useActorPlazaListOnChainSupply.ts`

- [ ] **Step 1: 演员列表只读后端**

`ActorPlazaView` 的列表数据来源只能是：

```text
listActorCollections / 后端 actor list API
```

禁止在列表首屏或滚动分页中调用：

```text
useActorPlazaListOnChainSupply
fetchActorPlazaListOnChainSupply
getNftInfoBatch
get_actor_mint_price
```

- [ ] **Step 2: 演员详情基础信息只读后端**

`ActorDetailView` 的详情基础信息只读：

```text
actorCollectionDetail / 后端 actor detail API
```

链上读价只允许在确认 mint 前触发。

- [ ] **Step 3: 弹窗展示链上价格读取状态**

`ConfirmMintActorNftDialog` 增加状态：

```ts
type ActorMintPriceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; nextMintPrice: string; soldOut: boolean }
  | { status: 'error'; message: string };
```

- [ ] **Step 4: 定向验证页面读策略**

Run:

```bash
rg -n "useActorPlazaListOnChainSupply|fetchActorPlazaListOnChainSupply|getActorMintPrice|fetchActorMintPrice" src/features/actor src/hooks/solana/nftInfoBatch/actorPlaza
```

Expected: `fetchActorMintPrice` 只出现在确认 mint 流程，不出现在列表渲染或列表 query hook 中。

### Task 8: 缓存刷新和成功态

**Files:**
- Modify: `src/features/actor/components/ActorMintDialogs.tsx`
- Modify: `src/features/actor/components/MintActorNftSuccessDialog.tsx`
- Modify: `src/features/narrator/components/MintDramaNftDialog.tsx`

- [ ] **Step 1: actor mint 成功后只刷新后端缓存**

成功后刷新：

```text
getListActorCollectionsQueryKey()
getActorPublicDetailQueryKey(actorId)
用户持有 NFT / 钱包资产相关 query
```

不要刷新 actor plaza 链上列表 supply query。

- [ ] **Step 2: drama mint 成功后刷新短剧相关缓存**

成功后刷新：

```text
短剧列表/详情
用户持有 drama NFT
钱包余额
```

- [ ] **Step 3: 成功弹窗展示 tx hash 和 mint 地址**

如果 batch mint 返回多个 mint 地址，成功弹窗先展示首个 mint 地址和 tx hash；后续需要多 NFT 展示时再扩展，不在本次引入复杂列表。

### Task 9: 最小验证

**Files:**
- All modified files from previous tasks.

- [ ] **Step 1: 禁止旧生成指令引用残留**

Run:

```bash
rg -n "mintActorNft|mintActorSnft|getSnftInfo|getMintActorNftInstructionDataEncoder|getMintActorSnftInstructionDataEncoder" src --glob '*.{ts,tsx}'
```

Expected: 不再有业务代码引用旧 actor 指令；生成目录历史文件名不应存在。

- [ ] **Step 2: 定向 Biome**

Run:

```bash
pnpm exec biome check src/hooks/solana/dramaMint src/hooks/solana/actorMint src/hooks/solana/useMintDramaNftOnChain.ts src/hooks/solana/useMintActorNftOnChain.ts src/hooks/sponsor/dramaMint src/hooks/sponsor/actorMint src/features/actor src/features/narrator/components/MintDramaNftDialog.tsx
```

Expected: 本次涉及文件通过。

- [ ] **Step 3: diff 空白检查**

Run:

```bash
git diff --check
```

Expected: 无输出。

- [ ] **Step 4: TypeScript 定向检查**

Run:

```bash
pnpm exec tsc --noEmit --pretty false
```

Expected: 如果全仓仍有历史错误，只记录与本次涉及文件相关的新错误并修复；不扩大修复历史问题。

## 自检

- 覆盖 `mint_series_nft` 改动点：Task 2。
- 覆盖演员列表弹窗和演员详情弹窗确认 mint 前必须读 `get_actor_mint_price`：Task 5、Task 7。
- 覆盖 `batch_mint_actor_nft` 合约调用：Task 4、Task 5、Task 6。
- 覆盖演员列表全部读后端列表，避免 RPC 429：Task 7。
- 覆盖普通钱包和 sponsor 两条提交路径：Task 2、Task 5、Task 6。
