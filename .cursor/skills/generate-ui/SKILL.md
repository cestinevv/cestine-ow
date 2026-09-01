---
name: generate-ui
description: 高保真 Figma 静态 UI 还原（不接接口、不写联调交付物）。用户提到 Figma 链接/节点、像素级还原、纯样式/静态页、组件视觉落地、移动端 frame、拉稿 MCP、get_design_context、get_screenshot、大稿 metadata、planning-with-files 时使用本技能。须遵守 `@.cursor/rules/agent-to-react.mdc` 及其子规则；若任务含联调、Orval、useMutation、分页、缓存等，不要用本技能作主流程，应 `@.cursor/rules/agent-to-api.mdc` 或说明「按 API 联调规范」。
---

# Generate UI（Figma → 静态高保真 UI）

## 模式声明（必读）

- **UI-only**：只做视觉还原（结构、尺寸、语义色/token、组件形态、资源与文案闭环），**不接真实接口**，不要求产出 `agent-to-api` 中的数据流 / mutation 缓存 / 联调交付矩阵。
- **规范来源**：须遵守 **`@.cursor/rules/agent-to-react.mdc`** 及其子规则；本技能与任一 `.mdc` 正文冲突时，**以对应 `.mdc` 正文为准**。

## 子规则范围（不展开条文，省 token）

子规则以 **`agent-to-react.mdc`** 目录为准，含且不限于：`agent-to-react-components` / `layout` / `colors-theme` / `typography` / `sizing` / `icons` / `images` / `translation` / `i18n-auto` / `large-design` / `format` / `animate`（稿面有滚动动效时）。细节请读对应 `.mdc`。

## Figma MCP 工作流（蒸馏清单）

1. **前置**：在 Figma 文件内执行 JS（如 `use_figma`、导出 SVG 字符串）前，须先按系统要求使用 **`figma-use`** 技能。
2. **拉结构**：`get_design_context(fileKey, nodeId)`（node-id 中 `-` 换为 `:`）。
3. **大稿 / 稀疏**：命中 **`@.cursor/rules/agent-to-react-large-design.mdc`** 时，先 `get_metadata(parentNodeId)` 再按子段 `get_design_context`；同步 **`planning-with-files`**（`task_plan.md` / `findings.md` / `progress.md`）；子段 5 步流水 + 2-Action Rule、单文件 ≤200 行以该 `.mdc` 为准。
4. **截图**：`get_screenshot` 对照稿面；用于结构歧义与**交前**核对；交付前须完成 **桌面 + 移动端** 视觉核对。
5. **移动端**：除桌面外，须拉取对应移动端 frame（常见 375/390/393 宽）的 `get_design_context`，不得只交桌面稿。
6. **资源**：Icon / 位图按 **`agent-to-react-icons.mdc`** / **`agent-to-react-images.mdc`** 分流并**落盘**；禁止把 MCP 临时 URL 当作长期 `src`。
7. **编码拆分**：对齐仓库同类 feature 的 `View` + `components/`；单文件目标 ≤150–200 行，过长继续拆。
8. **i18n**：见下文「**i18n（禁用 grep JSON）**」；须同时遵守 **`agent-to-react-i18n-auto.mdc`** / **`agent-to-react-translation.mdc`**。
9. **收尾**：按 **`package.json`** 执行 format/lint（见 `agent-to-react-format.mdc`）。
10. **高保真交付**：以稿面为权威；数值与 token 按 typography / sizing / layout / colors-theme；交前做 **`agent-to-react-sizing.mdc`** 自检（含换行与 `<md` / `md` 双端）。

## i18n（禁用 grep JSON）

本技能**不把**「在 `src/locales/*.json`（如 `en.json`、`zh-CN.json`）里 grep 稿面或代码中的整句中文/英文」作为既定步骤，**禁止**为对表、探路或补键而批量检索 locale 文件（避免无谓 token、误命中历史词条）。

- **AI**：用户可见文案一律 `t('…')`；新增 key 在**源语言 JSON** 中按仓库规范手写补键；中文 key 时在 `zh-CN.json` 保持 `key === value`（逐字一致）。**不擅自执行** `pnpm i18n:extract`、`pnpm i18n:translate`、`pnpm i18n` 等脚本（以 **`package.json` `scripts`** 为准）。
- **开发者**：在本地**手动**完成词条提取与多语言闭环，例如：`pnpm i18n:extract` → 校对/合并 locale → `pnpm i18n:translate`，或一键 `pnpm i18n`（`extract` + `translate`）；环境变量与 API 可用性由开发者自行确认。交付时在回复中提示需执行的命令即可。

## 省 token 执行策略（不降低门禁）

- 只对**当前实现范围**的 `nodeId` 拉 `get_design_context`；禁止无必要整页超大父节点一次拉满。
- 截图不必每个子节点都打，但**交前**须能证明已与桌面 + 移动稿对齐。

## 前端常量建模补充规则

- 对于 **Tab / Filter / Status / Mode** 这类有限离散值，默认**优先定义 TypeScript `enum`**（或项目既有等价枚举方案），禁止在组件中散落 `'xxx'` 字符串做状态判断。
- 常量数组（如 tabs、filters）的 `value` 字段必须引用枚举成员，组件内 `useState` 默认值与条件分支判断也必须使用同一枚举，保证单一事实来源与可重构性。

## 切换到联调时

需求涉及接接口、mutation、分页、缓存、表格数据态等：在对话中 **`@.cursor/rules/agent-to-api.mdc`**（及按需 `@` model/controller/view），并遵循 **`@.cursor/skills/api-to-ui-pipeline/SKILL.md`**。
