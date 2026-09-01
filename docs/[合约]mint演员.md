# mint 演员合约联调总结

## 结论

本次 `mint actor` 的最终可用路径是：

```text
后端 mint digest -> 组装 batch_mint_actor_nft -> simulateTransaction
-> Privy useSignTransaction 钱包签名 -> connection.sendRawTransaction
-> connection.confirmTransaction -> 查询首个 mint account 验证上链
```

之前失败的核心不是合约执行错误，而是 Privy / 钱包的 `useSignAndSendTransaction` 在发送阶段失败：

```text
[mintActorNftOnChain] signAndSend.failed
He: Unexpected error
at solana.js
```

当时 `mintQuantity = 1`，交易体积约 `1192 bytes`，小于 Solana raw transaction 上限 `1232 bytes`，但只剩约 `40 bytes` 空间。`useSignAndSendTransaction` 同时负责签名和发送，错误被钱包扩展或 Privy SDK 包装成 `Unexpected error`，拿不到真实 RPC / 链上日志。改成 `useSignTransaction + sendRawTransaction` 后，把签名、发送、预检、确认拆开，问题消失，失败时也能拿到更明确的阶段日志。

## 相关文件

| 文件 | 作用 |
|---|---|
| `src/hooks/solana/useMintActorNftOnChain.ts` | 直连钱包 mint 演员 NFT 主流程 |
| `src/hooks/sponsor/actorMint/useSponsorMintActorNft.ts` | sponsor mint 演员 NFT 流程 |
| `src/hooks/solana/actorMint/resolveBatchMintActorNftAccounts.ts` | 解析 `batch_mint_actor_nft` 所需 PDA 与 remaining accounts |
| `src/hooks/solana/actorMint/buildMintActorNftWeb3Instruction.ts` | 按 IDL 账户顺序组装 `batch_mint_actor_nft` 指令 |
| `src/hooks/solana/actorMint/buildActorBatchCanonicalPayload.ts` | fallback 构造 `actor_batch` canonical payload |
| `src/hooks/solana/delegatorSignature.ts` | 解码后端 delegator 签名并构造 Ed25519 校验指令 |
| `src/solana/STORY_CONTRACT_API.md` | Story 合约账户、PDA、payload 文档 |

## 合约调用改动点

### 1. 演员 NFT mint PDA 改为 actor mint PDA

`batch_mint_actor_nft` 中每个 Actor NFT 的 mint PDA 必须使用：

```ts
findGetActorNftInfoMintPda({ assetId })
```

seed 是：

```text
[actor_mint, assetId]
```

不要使用：

```ts
findMintPda({ assetId })
```

`findMintPda` 在当前 generated 里是 actor collection mint，seed 是：

```text
[collection_mint, assetId]
```

这两个 PDA 语义不同。之前如果把 Actor NFT mint 当成 collection mint 推导，会导致链上账户和合约期望不一致。

### 2. PDA helper 返回 tuple，需要正确解构

Codama 生成的 PDA helper 返回值是：

```ts
[address, bump]
```

因此解析 Actor NFT mint / nft info 时必须这样写：

```ts
const [[mintPda], [nftInfoPda]] = await Promise.all([
  findGetActorNftInfoMintPda({ assetId }, { programAddress: storyProgramId }),
  findNftInfoPda({ assetId }, { programAddress: storyProgramId }),
]);
```

不能把整个 tuple 直接传给 `new PublicKey(...)`。之前出现的 `11111111111111111111111111111115P`、`11111111111111111111111111111115N` 这类地址，就是 tuple 被错误传入 `PublicKey` 后编码出来的异常地址。

### 3. remaining accounts 顺序必须严格匹配合约

`batch_mint_actor_nft` 固定账户之后，需要追加 remaining accounts：

```text
每个 Actor NFT 依次追加：
mint, nft_info, metadata, master_edition

最后追加每个 Actor NFT 的用户 ATA：
ATA(creator, mint_1), ATA(creator, mint_2), ...
```

前端实际顺序：

```text
actor[0].mint
actor[0].nftInfo
actor[0].metadata
actor[0].masterEdition
...
actor[n].mint
actor[n].nftInfo
actor[n].metadata
actor[n].masterEdition
actor[0].tokenAccount
...
actor[n].tokenAccount
```

本次给 remaining accounts 增加了 `label`，方便在 console 中确认账户顺序是否正确。

### 4. canonical payload 使用后端返回值优先

`batch_mint_actor_nft` 的 payload 口径是：

```text
actor_batch|{actorCollectionId}|{walletAddress}|{quantity}|{totalAmount}|{expiresAt}
```

前端优先使用后端返回的 `canonicalPayload` 和 `sig`，不要重新拼接后覆盖后端 payload。只有后端没有返回 canonical payload 时，才 fallback 到前端按同样规则拼接。

`totalAmount` 是签名支付上限；链上实际扣款按 bonding curve 计算。事件中：

```text
pay_amount   = 链上实际支付金额
total_amount = 签名 payload 中的支付上限
```

### 5. delegator 签名解码更宽容

后端 `sig` 可能以不同编码返回。当前解码支持：

```text
hex
base64
base64url
base58
```

最终必须解码成 Ed25519 原始 `64 bytes`。如果不是 64 字节，前端直接报错，避免把错误签名塞进 Ed25519Program 指令。

## 为什么 useSignAndSendTransaction 不行

旧流程：

```ts
const result = await signAndSendTransaction({
  transaction: serializedTransaction,
  wallet: selectedWallet,
  chain: privyChain,
});
```

这个 API 把三件事包在一起：

```text
钱包签名
交易发送
RPC preflight / 广播
```

当其中任意阶段失败时，Privy 或钱包扩展只返回：

```text
He: Unexpected error
```

前端无法判断失败点是：

```text
签名失败
交易格式被钱包拒绝
RPC preflight 失败
链上合约执行失败
交易体积接近上限导致钱包内部校验失败
```

这次交易 `mintQuantity = 1` 时序列化体积约 `1192 bytes`，没有超过 `1232 bytes`，但距离上限很近。`useSignAndSendTransaction` 的内部实现还会做钱包侧校验和发送包装，错误没有透出真实 RPC logs，所以表现为黑盒 `Unexpected error`。

## 为什么 useSignTransaction 可以

新流程把黑盒拆开：

```ts
const simulation = await connection.simulateTransaction(versionedTx, {
  sigVerify: false,
  replaceRecentBlockhash: false,
});

const { signedTransaction } = await signTransaction({
  transaction: serializedTransaction,
  wallet: selectedWallet,
  chain: privyChain,
});

const signature = await connection.sendRawTransaction(signedTransaction, {
  skipPreflight: false,
  maxRetries: 3,
});

const confirmation = await connection.confirmTransaction(
  {
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  },
  'confirmed',
);
```

这样每一层都有明确日志：

| 日志 | 含义 |
|---|---|
| `transaction.beforeSend` | 交易发送前结构快照 |
| `simulate.failed` | 未签名模拟阶段已出现链上错误 |
| `simulate.ok` | 链上预检逻辑通过 |
| `sign.failed` | Privy / 钱包签名失败 |
| `sign.ok` | 钱包已返回签名后的 raw transaction |
| `sendRaw.failed` | RPC preflight / 广播失败，可查看 `logs` |
| `tx.sent` | RPC 已返回交易签名 |
| `confirm.failed` | 交易已发送但确认结果有链上错误 |
| `confirm.ok` | 交易 confirmed |
| `tx.onChain` | 查询链上交易详情与 logs |

实际修复后 mint 成功，说明之前的主因不是 `InvalidNftType`、CU 不够或账户 owner 错，而是 `signAndSendTransaction` 的发送阶段黑盒失败。

## 当前发送前关键 console

`transaction.beforeSend` 会输出：

```text
txLen
rawLimitBytes
rawRemainingBytes
messageVersion
recentBlockhash
latestBlockhash
blockhashMatchesLatest
feePayer
walletAddress
selectedWalletAddress
feePayerMatchesWallet
selectedWalletMatchesWallet
requiredSignerCount
requiredSigners
requiredSignerHasWallet
signatureSlots
staticAccountKeyCount
privyChain
rpcEndpoint
mintCount
```

正常情况下重点看：

```text
blockhashMatchesLatest = true
feePayerMatchesWallet = true
selectedWalletMatchesWallet = true
requiredSignerHasWallet = true
requiredSignerCount = 1
privyChain = solana:devnet 或 solana:mainnet
txLen < 1232
```

如果这些都正常，但 `sign.failed`，优先排查 Privy / 钱包状态、链 ID、钱包连接和用户取消签名。

如果 `simulate.failed` 或 `sendRaw.failed`，优先看 logs，这时才是合约或 RPC preflight 方向。

## 常见错误定位

### 1. 出现 `11111111111111111111111111111115P` / `15N`

原因：PDA helper 返回 `[address, bump]`，前端把整个 tuple 传给 `new PublicKey(...)`。

修复：正确解构：

```ts
const [[mintPda], [nftInfoPda]] = await Promise.all([...]);
```

### 2. `InvalidNftType` / `ActorMintAddressMismatch`

优先排查：

```text
assetId 是否为 {collection_asset_id}_{mint_index}
mint_index 是否从正确位置开始
Actor NFT mint 是否使用 findGetActorNftInfoMintPda
nft_info 是否使用 findNftInfoPda
remaining accounts 顺序是否正确
Program ID / 网络是否一致
```

### 3. `Unexpected error` 出现在 `solana.js`

如果堆栈位于：

```text
signAndSendTransaction
chrome-extension://.../solana.js
```

通常不是合约错误，而是 Privy / 钱包发送阶段失败。优先改成：

```text
simulateTransaction -> useSignTransaction -> sendRawTransaction
```

### 4. 交易体积接近上限

Solana raw transaction 上限：

```text
1232 bytes
```

`batch_mint_actor_nft` 每多 mint 1 个 Actor NFT，会增加：

```text
mint
nft_info
metadata
master_edition
token_account
```

因此数量变大时交易很容易接近或超过上限。当前 1 个 mint 曾达到约 `1192 bytes`，已经接近上限。后续如果需要稳定支持多枚 mint，应考虑：

```text
限制单次 mint 数量
接入 storyActorMintLookupTable
拆分交易
减少指令或账户体积
```

## 最终判断口径

这次 actor mint 能成功的关键不是修改合约，而是前端合约调用方式修正：

```text
PDA 正确
remaining accounts 顺序正确
后端 SignedParams 正确
交易发送从 signAndSend 黑盒改为 sign + sendRaw 分段
```

以后遇到同类问题，先用分段日志判断失败位置，不要直接把 `Unexpected error` 当作合约执行失败。
