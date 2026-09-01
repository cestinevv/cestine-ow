# Story IDL 生成与合约变化分析实施计划

> **给执行代理：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行。步骤使用 checkbox（`- [ ]`）跟踪。

**目标：** 基于更新后的 `src/abis/Story.json` 重新生成 Solana 合约产物，并输出新版合约变化、旧配置替换/删除建议和前端对接方案文档。

**架构：** 本轮只执行 IDL 生成和文档分析，不写前端对接代码。通过 `pnpm generate:solana` 生成 `src/solana/generated/story`，再对比 IDL、生成产物和当前调用代码，判断账户变更、普通交易模式替代 ALT 的影响，以及 Admin chainlinks 中旧字段的去留。

**技术栈：** TypeScript, Solana Web3.js, `@solana/kit`, Codama, Anchor IDL, pnpm。

---

## 文件结构

- Inspect: `src/abis/Story.json`
  - 查看合约地址、指令账户、payload 文档和 PDA seeds 变化。
- Generate: `src/solana/generated/story/**`
  - 由 `pnpm generate:solana` 根据新版 IDL 重新生成。
- Create: `src/solana/0616合约变化与对接方案.md`
  - 输出合约变化、对接方案、配置替换/删除清单和后续前端改造计划。
- Inspect: `src/hooks/solana/**`
  - 只读取当前调用面，识别未来需要调整的 ALT、collection PDA、config PDA 和账户传参。
- Inspect: `src/stores/config.ts`
  - 梳理 Admin chainlinks `contracts` 字段哪些保留、哪些废弃。

### Task 1: 读取当前变更和生成脚本

- [ ] **Step 1: 查看当前 Git 状态**

Run:

```bash
git status --short
```

Expected: 至少看到 `src/abis/Story.json` 已修改；如出现其他未预期文件，记录到文档风险。

- [ ] **Step 2: 查看生成脚本**

Run:

```bash
jq '.scripts["generate:solana"]' package.json
```

Expected: 输出 `codama run js && tsx scripts/patch-solana-generated.ts`。

- [ ] **Step 3: 查看 IDL 结构化变化**

Run:

```bash
git diff -- src/abis/Story.json
```

Expected: 确认 program address、指令账户、args、events、types 的变化范围。

### Task 2: 生成 Solana 合约产物

- [ ] **Step 1: 执行生成命令**

Run:

```bash
pnpm generate:solana
```

Expected: 命令完成，`src/solana/generated/story` 根据新版 IDL 更新。

- [ ] **Step 2: 查看生成后的文件变化**

Run:

```bash
git status --short
git diff --stat
```

Expected: 能看到 generated story 产物更新；若生成脚本额外修改无关文件，在文档中说明。

### Task 3: 梳理指令和账户变化

- [ ] **Step 1: 查看关键指令生成产物**

Run:

```bash
rg -n "export type .*Instruction|canonical_payload|Account" src/solana/generated/story/src/generated/instructions -g '*.ts'
```

Expected: 找到 `mintSeriesNft`、`batchMintActorNft`、`getActorMintPrice` 等关键指令账户顺序。

- [ ] **Step 2: 对比当前调用代码中的旧账户依赖**

Run:

```bash
rg -n "lookupTable|storyActorMintLookupTable|storyDramaMintLookupTable|collectionMint|collectionInfo|collectionMetadata|collectionMasterEdition|canonicalPayload|name" src/hooks/solana src/hooks/sponsor src/features -g '*.{ts,tsx}'
```

Expected: 列出后续代码对接中要替换的 ALT、collection PDA 和 payload 字段。

### Task 4: 梳理合约配置去留

- [ ] **Step 1: 对比旧 contracts 与新部署信息**

旧 contracts 包含：

```text
story
vault
inVault
spender
outVault
storyAdmin
storyTreasury
storyAuthority
storyConfigPDA
storyDelegator
storyActorMintLookupTable
storyDramaMintLookupTable
storyActorCollectionInfoPDA
storyActorCollectionMintPDA
storyDramaCollectionInfoPDA
storyDramaCollectionMintPDA
```

新部署信息包含：

```text
Config PDA
Admin
Mint PDA
CollectionInfo PDA
Metadata PDA
```

Expected: 文档中明确 `story`、`storyAdmin`、`storyConfigPDA`、collection 相关 PDA 的替换关系；明确 ALT 字段后续普通交易模式下可删除。

- [ ] **Step 2: 标记无法仅凭当前信息确定的字段**

需要在文档中明确：

```text
storyDelegator
storyTreasury
vault / inVault / outVault / spender
storyAuthority
```

Expected: 不臆造新地址；对需要后端或部署方补充的信息列为待确认。

### Task 5: 生成对接方案文档

- [ ] **Step 1: 创建 `src/solana/0616合约变化与对接方案.md`**

文档必须包含：

```text
1. 生成命令和生成结果
2. 合约变化摘要
3. 指令与账户变化
4. canonical payload 变化
5. Admin chainlinks contracts 字段替换/删除/保留清单
6. 前端后续对接方案
7. 风险与待确认项
8. 不在本轮执行的事项
```

Expected: 文档内容使用简体中文，保留合约地址、命令、字段名和指令名英文原文。

### Task 6: 最终复核

- [ ] **Step 1: 查看最终 diff**

Run:

```bash
git diff --stat
git diff -- src/solana/0616合约变化与对接方案.md
```

Expected: 文档可读，生成产物存在，未写前端对接代码。

- [ ] **Step 2: 输出总结**

Expected: 回复用户生成是否完成、文档路径、关键变化、哪些 contracts 需要替换/删除/待确认。

