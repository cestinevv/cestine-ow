# Story 07202315 合约改动文档执行计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 基于 `src/abis/Story.json` 与 `pnpm generate:solana` 生成产物的当前差异，编写 `src/solana/07202315合约改动.md`，明确合约变化、前端影响面与后续对接 Todo。

**架构：** 本次是文档交付，不改业务代码。先从 IDL 与 generated 产物确认新增、删除和保留的合约接口，再把变化映射到现有前端 hooks、页面入口和旧文档，形成可执行的后续改造清单。

**技术栈：** React、TypeScript、Solana Web3、Codama generated client、Anchor IDL、Markdown。

---

### Task 1: 对比 IDL 与 generated 产物

**Files:**
- Read: `src/abis/Story.json`
- Read: `src/solana/generated/story/src/generated/**`
- Read: `src/hooks/**`
- Read: `src/features/**`

- [x] **Step 1: 读取当前 IDL 指令、账户、类型与错误码**

Run:

```bash
node - <<'NODE'
const fs = require('fs');
const idl = JSON.parse(fs.readFileSync('src/abis/Story.json', 'utf8'));
console.log(idl.address);
console.log(idl.instructions.map((item) => item.name));
console.log((idl.accounts || []).map((item) => item.name));
console.log((idl.types || []).map((item) => item.name));
NODE
```

Expected: 输出当前合约地址、14 个 instruction、4 个 account 与当前 types。

- [x] **Step 2: 对比 HEAD 与当前 IDL 差异**

Run:

```bash
node - <<'NODE'
const { execSync } = require('child_process');
const fs = require('fs');
const oldIdl = JSON.parse(execSync('git show HEAD:src/abis/Story.json', { encoding: 'utf8' }));
const newIdl = JSON.parse(fs.readFileSync('src/abis/Story.json', 'utf8'));
const names = (items) => new Set((items || []).map((item) => item.name));
const removed = (before, after) => [...before].filter((item) => !after.has(item)).sort();
console.log({
  oldAddress: oldIdl.address,
  newAddress: newIdl.address,
  oldInstructions: oldIdl.instructions.length,
  newInstructions: newIdl.instructions.length,
  removedInstructions: removed(names(oldIdl.instructions), names(newIdl.instructions)),
  removedAccounts: removed(names(oldIdl.accounts), names(newIdl.accounts)),
  removedTypes: removed(names(oldIdl.types), names(newIdl.types)),
});
NODE
```

Expected: 确认 program address 不变，instruction 从 18 个变为 14 个，删除 `get_user_token_stake`、`set_story_token_mint`、`stake_token`、`unstake_token`。

- [x] **Step 3: 查找前端仍引用已删除 generated API 的位置**

Run:

```bash
rg -n "stakeToken|unstakeToken|getUserTokenStake|setStoryTokenMint|UserTokenStake|findUserTokenStakePda" src/hooks src/features src/solana -g '!src/solana/generated/**'
```

Expected: 找到 staking hooks、收入页赎回弹窗和旧合约文档中的引用位置。

### Task 2: 编写合约变化与对接文档

**Files:**
- Create: `src/solana/07202315合约改动.md`

- [x] **Step 1: 写入变更摘要**

记录 program address 不变、公开 instruction 删除 4 个、账户和类型删除 `UserTokenStake` 相关产物、mint/collection/actor 能力未新增。

- [x] **Step 2: 写入 generated 产物变化**

记录删除的 generated 文件、index export 变化、program helper/parse/identify 分支变化。

- [x] **Step 3: 写入前端影响与 Todo**

记录现有 `useSubmitStakeToken`、`useSubmitUnstakeToken`、sponsor staking hooks、`IncomeUnstakeStoryDialog` 会因 generated 路径删除而不再可编译，并列出后续禁用、删除或迁移到后端接口的 Todo。

### Task 3: 定向检查文档内容

**Files:**
- Read: `src/solana/07202315合约改动.md`

- [x] **Step 1: 检查关键术语完整性**

Run:

```bash
rg -n "18.*14|get_user_token_stake|set_story_token_mint|stake_token|unstake_token|UserTokenStake|UserTokenStakeView|useSubmitStakeToken|useSubmitUnstakeToken|TokenStakedEvent" src/solana/07202315合约改动.md
```

Expected: 文档包含 instruction 数量变化、删除 API、影响 hooks 和残留 event 说明。

- [x] **Step 2: 检查工作区状态**

Run:

```bash
git status --short
```

Expected: 看到新增计划文档和新增 `src/solana/07202315合约改动.md`，以及用户已有的 IDL/generated 改动。

### Task 4: 执行前端最小对接

**Files:**
- Modify: `src/hooks/solana/useSubmitStakeToken.ts`
- Modify: `src/hooks/solana/useSubmitUnstakeToken.ts`
- Modify: `src/hooks/sponsor/useSponsorSubmitStakeToken.ts`
- Modify: `src/hooks/sponsor/useSponsorSubmitUnstakeToken.ts`
- Modify: `src/features/income/components/IncomeTokenEarningsTable.tsx`
- Modify: `src/features/income/components/IncomeEarningsMobileList.tsx`

- [x] **Step 1: 隔离 direct staking hooks**

保留 `useSubmitStakeToken` 与 `useSubmitUnstakeToken` 的导出类型和返回结构，删除对 `stakeToken` / `unstakeToken` generated 文件的引用，执行函数改为明确抛出当前合约不支持。

- [x] **Step 2: 隔离 sponsor staking hooks**

保留 `useSponsorSubmitStakeToken` 与 `useSponsorSubmitUnstakeToken` 的导出类型和返回结构，删除对 `stakeToken` / `unstakeToken` generated 文件的引用，执行函数改为明确抛出当前合约不支持。

- [x] **Step 3: 禁用 STORY token 收益操作按钮**

桌面端 `IncomeTokenEarningsTable` 禁用质押 / 解质押按钮；移动端 `IncomeEarningsMobileList` 增加 `actionsDisabled` 参数，并由 token 表传入。

- [x] **Step 4: 定向检查 deleted generated import**

Run:

```bash
rg -n "getStakeTokenInstructionAsync|getUnstakeTokenInstructionAsync|getGetUserTokenStakeInstructionAsync|getSetStoryTokenMintInstructionAsync|findUserTokenStakePda" src/hooks src/features -g '!src/solana/generated/**'
```

Expected: 无输出。
