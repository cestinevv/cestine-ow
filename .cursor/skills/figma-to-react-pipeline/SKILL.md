---
name: figma-to-react-pipeline
description: 高保真 Figma → React 流水线（默认一次性尽最大可能像素级还原；MCP 拉稿、移动端 frame、拆分编排）。触发本技能时须同时遵守 `@.cursor/rules/agent-to-react.mdc` 及全部子规则——`components` / `layout` / `colors-theme` / `typography` / `sizing` / `icons` / `images` / `translation` / `i18n-auto` / `large-design` / `format`。本技能负责工作流、门禁与高保真交付标准，不重复各 `.mdc` 条文；**须与 `@.cursor/rules/agent-to-react-large-design.mdc` 协同**：满足该文件触发条件时强制走「先索引后下钻」+ `planning-with-files`；用户显式要求「精确还原」或声明按 `large-design` 执行时，**即使未命中**数值型触发条件，仍须执行该文件规定的 `get_metadata`、双端拉稿、`findings` 持久化与 2-Action Rule 等全套门禁。
---

# Figma to React Pipeline（Figma 转 React 流水线）

## 相关技能

- **`generate-ui`**（`.cursor/skills/generate-ui/SKILL.md`）：与本文**同一套高保真目标**，额外强调 **UI-only（不接接口）** 与 **最小必要 Figma MCP 调用**；详规仍以本文 + `agent-to-react-*.mdc` 为准。

## 适用场景

用户提供 Figma 链接、节点 ID，或表达「实现这个设计」「还原设计」「Figma 转 React / 页面」等同类意图时，按下列流水线执行。**禁止**不拉稿、不拆结构就直接生成巨型单文件。

## Figma MCP 还原工作流（本技能专责）

以下步骤属于 **流水线 / 技能** 范畴，**不**写入 `agent-to-react-*.mdc` 全局规则；与全局规范分工见下节。

- **前置（脚本写 Figma）**：凡需在 Figma 文件内执行 JS（如 `use_figma`、导出 SVG 字符串等），必须先按系统要求使用 **`figma-use`** 技能，再调用对应工具。
1. 用 Figma MCP 拉设计：`get_design_context(fileKey, nodeId)`（node-id 中 `-` 换为 `:`）。
2. 用 `get_screenshot` 对照视觉；复杂节点可配合 `get_metadata` 再分节点拉取。
3. **移动端强制同步**：除桌面节点外，必须在同一页面定位并拉取对应移动端 frame（通常 375/390/393 宽度）的 `get_design_context + get_screenshot`，不得只按桌面稿交付。
4. 资源图使用 MCP 返回的 URL，勿擅自改域名或占位。
5. 产出代码须按本项目栈与 **`@.cursor/rules/agent-to-react.mdc`** 及**全部子规则**（顺序与入口一致，见下节 **「子规则索引」**）改写。

### 1.4 与 `large-design` 的强制协同（精确还原）

本技能与 **`@.cursor/rules/agent-to-react-large-design.mdc`** 按以下方式绑定，用于保证设计稿还原的可验收性与可追溯性：

- **自动启用**：当目标节点满足该 `.mdc` 中任一**触发条件**时，**必须**完整执行该文件规定的流程（`get_metadata` 先索引、`planning-with-files`、`findings` 按 2-Action Rule 落盘、5 步流水、单文件 ≤200 行等）。
- **显式启用**：当用户在任务中声明须按 **`@.cursor/rules/agent-to-react-large-design.mdc`** 执行、或明确要求「精确还原 / 双端高保真」时，**即使未命中**该 `.mdc` 的数值型触发条件（如高度 >8000px），**仍须**对该任务执行同一套门禁：`get_metadata`（目标节点或最近合理父 frame）→ 子段 `get_design_context` + `get_screenshot` → **桌面与移动端** frame 同步拉取与对照 → `task_plan.md` / `findings.md` / `progress.md` 按 2-Action Rule 持续更新；体量拆分按稿面子 frame 实际需要，**不得**仅凭单次大块 `get_design_context` 凭记忆写 UI。

详规与例外以 **`@.cursor/rules/agent-to-react-large-design.mdc`** 正文为准。

### 1.5 大稿分批模式（Sparse Structure 规避，强制）

当目标节点满足 **`@.cursor/rules/agent-to-react-large-design.mdc`** 中任一**触发条件**（节点高度 > **8000px** / 同级章节 ≥ 5 个 / 表格 ≥ 3 张 / 代码块 ≥ 3 处 / 一次性 `get_design_context` 已现稀疏与截断）时：

1. **必须**先 `get_metadata(parentNodeId)` 拿子节点索引，再按子段做 `get_design_context + get_screenshot`；**禁止**对超大父节点直接 `get_design_context`，会出现稀疏 / 截断 / 占位文本。
2. **必须**同步触发 **`planning-with-files`**，在仓库根维护 `task_plan.md` / `findings.md` / `progress.md`。
3. **每子段**严格执行 5 步流水（fetch → records → implement → self-check → mark complete）+ **2-Action Rule**（每 2 次拉稿即写 findings）。
4. 单 `Chapter*.tsx` ≤ **200 行**，超出按子段（13.1 / 13.2 / ...）继续拆。
5. i18n keys 每章节落代码后**立即**批量写 `en.json` / `zh-CN.json`（中文 key 时 `key === value`）。

详见 **`@.cursor/rules/agent-to-react-large-design.mdc`**；本节仅做触发与门禁提醒。

## 子规则索引（与入口同步）

以下为 `@.cursor/rules/agent-to-react.mdc` **文档结构（速查）**的展开；落地代码时须遵守 **全部适用**子规则。

| 子规则文件 | 职责摘要 |
|------------|----------|
| `agent-to-react-components.mdc` | Shadcn 映射、按需安装、`cn`；禁止原生控件手搓交互 |
| `agent-to-react-layout.mdc` | HTML5 语义化、版心（复用项目实现；稿面与代码/token 事实来源对齐）、`md` 断点、4px 刻度、Scope Splitting、交付验收 |
| `agent-to-react-colors-theme.mdc` | 语义色、全局 token、全局样式入口 / `@theme inline`、深 / 浅色 |
| `agent-to-react-typography.mdc` | 字号行高字距高保真、移动端缩放 0.88 与上下限 |
| `agent-to-react-sizing.mdc` | 尺寸与稿面对齐、4px 边界、**提交前自检清单** |
| `agent-to-react-icons.mdc` | **Icon / 栅格图分流**；矢量 SVG 落盘路径以仓库检索为准、`use_figma` |
| `agent-to-react-images.mdc` | 位图目录与 import 以仓库为准、**2×**、JPG / PNG 选型 |
| `agent-to-react-translation.mdc` | 以 Figma 文案为准、`useTranslation`、locales 键策略 |
| `agent-to-react-large-design.mdc` | **大稿分批**：`get_metadata` 先索引、5 步流水、2-Action Rule、`planning-with-files` 持久化、单文件 ≤200 行 |
| `agent-to-react-format.mdc` | **`package.json` format/lint 脚本**（Biome 等为例示） |

**新增或重命名子规则时**：须先更新 **`agent-to-react.mdc`** 目录与本表，再更新本技能 YAML `description` 与下文 **§3** 列表，避免流水线与入口脱节。

## 与全局规则的分工

| 本技能（流水线） | 全局规则（`agent-to-react*.mdc`） |
|------------------|-----------------------------------|
| `figma-use` 前置、MCP 拉稿、移动端 frame、截图、资源 URL | 上表 **全部子规则** + 入口目录 |
| 编码前拆分规划、单文件体量门禁 | 同上 |
| **首次交付即高保真**（主目标） | 遵守子规则 + 下文 **§4**；交付前完成 **`sizing`** 自检 |
| 用户仍指出遗漏时的补正 | 下文 **§4** 末节 |

若本技能与某 `.mdc` 正文冲突，**以对应 `.mdc` 正文为准**。

## 核心工作流

### 1. 触发与前置数据

严格按 **「Figma MCP 还原工作流」** 执行。未拿到移动端基准前，**不得**声称还原已完成。

### 2. 架构与拆分（编码前）

在写任何实现代码前，先给出 **组件拆分规划**（可与用户确认或严格按规划执行）：

- **参考**：在仓库 **`src`（或页面/feature 根目录）** 内浏览**与目标页面同类的已实现模块**（路由相邻页面、同名 feature 域等），**对齐其目录深度、`View` + `components/` 拆分与命名**，勿依赖固定路径名。
- **View**：`xxxView.tsx` 只做布局、状态提升与组装，不写大块 UI 细节。
- **区块**：Header、Card、List 等拆到同级 `components/`（如 `components/IndexCard.tsx`）。
- **体量**：单文件目标 **≤150–200 行**，过长则继续拆。

### 3. 按规划落地代码

按拆分逐文件实现，并 **完整遵守**上表所列子规则。本技能**不**复述条文；下列仅作 **门禁提醒**（详规在对应 `.mdc`）：

- **`components`**：交互与展示控件用 Shadcn；安装命令以项目为准（常见 `npx shadcn@latest add`，包管理器按仓库选择）。
- **`layout`**：语义标签、版心（检索复用 + token/常量对齐稿面）、Tailwind 类序、`md` + 4px、`layout` 内交付验收。
- **`colors-theme`**：语义色与 token，新色进**全局样式入口** / `@theme inline`（路径以仓库为准）。
- **`typography` + `sizing`**：稿面数值一次落表；交付前做 **`sizing`** 自检（含双端）。
- **`icons` / `images`**：先判 Icon 还是位图；SVG 与 2× 位图分别落盘，禁止长期用 MCP 临时 URL。
- **`translation`**：可见文案走 i18n，键与 Figma 语种一致，locales 同步维护。
- **`format`**：改动源码后执行 **`package.json` 中的 format/lint 命令**；无封装脚本时再采用仓库文档或 Biome 等默认写法。

实现时**默认按 §4 的高保真标准执行**，不得先交「大致像」再等用户多轮指错。

### 4. 高保真交付标准（本技能默认目标）

本技能**一旦应用**，以 **最高强度高保真还原 Figma** 为常态，**目标在本轮对话内尽量一次性**与稿面一致（**桌面 + 移动端**），**不把「等用户逐块校准」当主流程**。

- **稿面为唯一视觉权威**：持续用 **`get_screenshot`**（及分节点截图）对照；大稿按区块拉齐再组装，**体量只影响拆分，不降低单块精度**。
- **数值与 token 一次到位**：排版数值按 **`typography`** + **`sizing`** + **`layout`**；新色按 **`colors-theme`**。
- **资源与文案闭环**：**`icons`/`images`** 按分流落盘；用户可见字符串按 **`translation`**。
- **双端交付前必做自检**：按 **`agent-to-react-sizing`** 提交前自检（含行数/换行、`md` 与 `<md`），**不得省略**。
- **移动端缩放若启用**：按 **`typography`** 统一系数与钳制，且勿带崩 `md` 侧。
- **回复可简要交代**：已对照的 frame 与自检要点；**禁止**仅用「已优化」「差不多了」。
- **跨多 phase 任务**：必须用 **`planning-with-files`** 持久化（`task_plan.md` / `findings.md` / `progress.md`），不得依赖会话上下文不重启。会话恢复时**先 read 三件套**再续做未完成 phase。
