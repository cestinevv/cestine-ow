# 0720 Story 合约改动文档实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 基于 `src/abis/Story.json` 与 `pnpm generate:solana` 生成产物，完成 `src/solana/0720合约改动.md` 的合约变化与前端对接方案文档。

**Architecture:** 本任务只生成文档，不改业务代码。先用结构化脚本对比当前 IDL 与 `HEAD` 版本，再读取 generated 产物确认账户 meta、类型和错误码变化，最后把结论写入目标 Markdown。

**Tech Stack:** React / TypeScript 项目、Anchor IDL JSON、Codama generated TypeScript、Markdown 文档。

---

### Task 1: 收集 IDL 与 generated 差异

**Files:**
- Read: `src/abis/Story.json`
- Read: `src/solana/generated/story/src/generated/instructions/batchMintActorNft.ts`
- Read: `src/solana/generated/story/src/generated/accounts/globalConfig.ts`
- Read: `src/solana/generated/story/src/generated/errors/story.ts`

- [x] **Step 1: 对比 IDL 顶层和指令**

Run:

```bash
node <<'NODE'
const fs = require('fs');
const cp = require('child_process');
const oldJson = JSON.parse(cp.execSync('git show HEAD:src/abis/Story.json', { encoding: 'utf8' }));
const newJson = JSON.parse(fs.readFileSync('src/abis/Story.json', 'utf8'));
const byName = (arr = []) => Object.fromEntries(arr.map((x) => [x.name, x]));
const compactAccounts = (accounts = []) => accounts.map((a) => ({
  name: a.name,
  writable: !!a.writable,
  signer: !!a.signer,
  address: a.address,
  pda: a.pda,
}));
console.log('address', oldJson.address, '=>', newJson.address);
const oldIx = byName(oldJson.instructions);
const newIx = byName(newJson.instructions);
console.log('instructions old/new', Object.keys(oldIx).length, Object.keys(newIx).length);
for (const name of Object.keys(newIx).filter((key) => oldIx[key])) {
  const oldItem = oldIx[name];
  const newItem = newIx[name];
  const docsChanged = JSON.stringify(oldItem.docs || []) !== JSON.stringify(newItem.docs || []);
  const argsChanged = JSON.stringify(oldItem.args || []) !== JSON.stringify(newItem.args || []);
  const accountsChanged = JSON.stringify(compactAccounts(oldItem.accounts)) !== JSON.stringify(compactAccounts(newItem.accounts));
  if (docsChanged || argsChanged || accountsChanged) {
    console.log(name, { docsChanged, argsChanged, accountsChanged });
  }
}
NODE
```

Expected: 输出 Program ID 变化，且指令数量保持 18；重点变化包含 `batch_mint_actor_nft`。

- [x] **Step 2: 对比类型和错误码**

Run:

```bash
node <<'NODE'
const fs = require('fs');
const cp = require('child_process');
const oldJson = JSON.parse(cp.execSync('git show HEAD:src/abis/Story.json', { encoding: 'utf8' }));
const newJson = JSON.parse(fs.readFileSync('src/abis/Story.json', 'utf8'));
const byName = (arr = []) => Object.fromEntries(arr.map((x) => [x.name, x]));
const oldTypes = byName(oldJson.types);
const newTypes = byName(newJson.types);
console.log('changed types');
for (const name of Object.keys(newTypes).filter((key) => oldTypes[key])) {
  if (JSON.stringify(oldTypes[name]) !== JSON.stringify(newTypes[name])) {
    console.log('-', name);
  }
}
const oldErrors = byName(oldJson.errors);
const newErrors = byName(newJson.errors);
console.log('added errors', Object.keys(newErrors).filter((key) => !oldErrors[key]));
console.log('removed errors', Object.keys(oldErrors).filter((key) => !newErrors[key]));
NODE
```

Expected: 输出 `GlobalConfig`、`ProposeConfigUpdateParams`、`ActorNftUpgradeEvent` 等变化，以及新增 `OrderNoStale` 等错误。

- [x] **Step 3: 查看 generated 关键文件差异**

Run:

```bash
git diff -- src/solana/generated/story/src/generated/instructions/batchMintActorNft.ts \
  src/solana/generated/story/src/generated/accounts/globalConfig.ts \
  src/solana/generated/story/src/generated/errors/story.ts
```

Expected: 确认 `batchMintActorNft.config` 为 writable，`GlobalConfig.rollbackUntil` 变为 `latestOrderNo`。

### Task 2: 编写 0720 合约改动文档

**Files:**
- Modify: `src/solana/0720合约改动.md`

- [x] **Step 1: 写入文档结构**

文档必须包含以下章节：

```markdown
# 0720 Story 合约改动与前端对接计划

## 执行计划
## 变更摘要
## IDL 变化明细
## Generated 产物变化
## 错误码变化
## 前端对接方案
## Todo
## 联调关注点
## 本次不处理范围
```

Expected: 目标文件存在且结构完整。

- [x] **Step 2: 写入核心结论**

文档必须明确写出：

```text
Program ID: CJEnSe9eJ3s8qLQNdWrcHQpp6199s4NohcBBHZ3UeRQL -> 6w1itXjxKn79S6WzR3tY6nkF7rx5DDJbYkH12a7uFyTk
batch_mint_actor_nft payload 新增 orderNo
batch_mint_actor_nft config 从 readonly 变为 writable
GlobalConfig.rollback_until 变为 latest_order_no
propose_config_update 删除 new_story_token_mint
新增 OrderNoStale 错误
短剧 mint 和 stake / unstake 本次不需要主动改动
```

Expected: 文档可直接指导后续前端对接。

### Task 3: 复查输出

**Files:**
- Read: `src/solana/0720合约改动.md`
- Read: `docs/superpowers/plans/2026-07-20-story-contract-change-doc.md`

- [x] **Step 1: 检查目标文档关键字**

Run:

```bash
rg -n "orderNo|latest_order_no|config.*writable|OrderNoStale|6w1itX" src/solana/0720合约改动.md
```

Expected: 每个关键变化都有命中。

- [x] **Step 2: 检查工作区状态**

Run:

```bash
git status --short
```

Expected: 看到新增计划文件和 `src/solana/0720合约改动.md`，不提交代码。
