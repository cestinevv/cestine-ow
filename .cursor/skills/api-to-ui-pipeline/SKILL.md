---
name: api-to-ui-pipeline
description: 将静态页面联调为真实数据页面的通用流程。用户提到「联调/接接口/把静态页接上 API hooks/路由与组件打通/前后端连线」时必须优先使用本技能。触发本技能时须完整遵守 `@.cursor/rules/agent-to-api.mdc` 及其 MVC 子规则（`agent-to-api-model.mdc` 数据契约、`agent-to-api-view.mdc` 状态/表格/格式化、`agent-to-api-controller.mdc` 数据流/缓存/`useCallback` 禁令/中间变量最小化/组件体内 5 环节顺序）；交付输出格式与门禁同样以 `@.cursor/rules/agent-to-api.mdc` 为准，并默认衔接执行 `@.agents/skills/vercel-react-best-practices/SKILL.md` 的性能规则（尤其是 async 并行、bundle 体积、重渲染优化）。适用于有「接口客户端层 + 页面层」的任意模块化前端项目（如 OpenAPI/Orval、React Query、SWR 或等价方案）；UI 实现同时遵守 `@.cursor/rules/agent-to-react.mdc` 及适用子规则。本技能负责工作流驱动、交付物格式与证据化验收，不重复 `.mdc` 条文。
---

# API UI Integration Pipeline（API → UI 联调流水线）

## 适用场景

当用户给出以下任意上下文时，触发本技能：

- 已有静态页面，要求接入后端接口。
- 已有 OpenAPI / SDK / 接口客户端产物，要求完成联调。
- 要求把路由层、页面组件层、接口客户端层打通。
- 要求补齐 `loading` / `error` / `empty` / `mutation feedback` 状态。

细则与强制条文见 **`@.cursor/rules/agent-to-api.mdc`**（父规则索引）及其 MVC 子规则。

## 默认衔接技能（新增）

- 触发 `api-to-ui-pipeline` 后，**默认继续执行**：`@.agents/skills/vercel-react-best-practices/SKILL.md`。
- 目标：在完成联调闭环（可用性）的同时，统一套用 React 性能最佳实践（性能与可维护性）。
- 联调实现阶段至少覆盖以下三类检查：
  - **Async 并行化**：避免不必要串行 `await`，优先 `Promise.all` 或等价并行方案。
  - **Bundle 体积控制**：避免 barrel imports，优先可静态分析路径与按需加载。
  - **重渲染优化**：避免无效派生状态与不必要订阅，减少 effect 误触发。
- 冲突优先级：若 `vercel-react-best-practices` 建议与项目强制规则冲突，**以 `@.cursor/rules/agent-to-api.mdc` 与 `@.cursor/rules/agent-to-api-*.mdc` / `@.cursor/rules/agent-to-react*.mdc` 为准**；在不冲突前提下默认采纳 Vercel 规则。

## 规范索引（与入口同步）

| 规则文件 | 职责摘要 |
|----------|----------|
| **`@.cursor/rules/agent-to-api.mdc`** | 父规则索引：适用场景、目标、项目适配映射、注释规范、MVC 子规则目录 |
| **`@.cursor/rules/agent-to-api-model.mdc`** | Model（数据层）：客户端复用、`@/utils` 聚合导入、**Orval `model` 为联调唯一数据形状**（禁止同构镜像 types）、Feature 非生成类型沉淀（§3.1）、默认值禁忌、派生值 `undefined` 语义、`mathUtil`、`mark` 游标协议 |
| **`@.cursor/rules/agent-to-api-view.mdc`** | View（展示层）：**`AppLoadingContainer`**（普通列表 + Table `asTable`）首屏三态、通用 `loading/error/empty/submitting`、TanStack `useReactTable` + shadcn `Table`、日期/数字/枚举格式化 |
| **`@.cursor/rules/agent-to-api-controller.mdc`** | Controller（控制层）：模块边界与数据流、Query/Mutation/异常映射、预取与分工、Mutation 缓存策略、静态残留清理、自动滚动分页基线、`useCallback` 禁令、中间变量最小化、事件抽离、组件体内 5 环节顺序 |

**新增或调整联调硬规则时**：先更新对应 MVC 子规则；若属新增主题（跨层），同步更新父 **`@.cursor/rules/agent-to-api.mdc`** 的目录索引，再视需要更新本技能 YAML `description` 与下文「核心工作流」中的门禁提醒，避免流水线与条文脱节。

## 与 `agent-to-api.mdc` 的分工

| 本技能（流水线） | 规范（`agent-to-api.mdc` 及 MVC 子规则） |
|------------------|------------------------------------------|
| 按对话驱动步骤 1→8，提醒产出映射表 / 数据流图 / 证据矩阵 | 各步骤的完整要求、禁止项与强制策略 |
| 任务结束时按「输出格式」组织回复结构 | `agent-to-api.mdc` 中「交付治理」章节是输出格式与门禁条文的**唯一事实来源** |
| 强调运行验证命令、附结果摘要 | 验收清单、失败信号、与 `agent-to-react` 的并存关系 |

若本技能正文与 **`@.cursor/rules/agent-to-api.mdc`** 或任一 MVC 子规则冲突，**以 `.mdc` 正文为准**。

## 核心工作流（按 MVC 顺序）

按以下顺序执行，并在联调实现环节默认穿插执行 `vercel-react-best-practices` 的对应条目。下列为 **门禁提醒**（详规不重复）：

1. **项目适配（父规则）**：先写「术语 → 本项目实现」映射表，再写代码。
2. **Controller · 边界与数据流**：容器 / 展示 / API 能力对齐后再接 hook（见 `agent-to-api-controller.mdc` §1–§3）。
3. **Model · 数据契约与默认值**：复用生成 hooks 与 **Orval `model` 类型**；禁止重复类型层与业务假默认值；**联调阶段须删除 Mock 及与 OpenAPI 同构的本地 types**（见 `agent-to-api-model.mdc` §3 / §3.1、`agent-to-api-controller.mdc` §5）；派生值缺失走 `undefined` 不走 `?? 0`（见 `agent-to-api-model.mdc` §4–§5）。
4. **Model · 分页协议**：`mark` 原值透传，`hasMore` 决定翻页（见 `agent-to-api-model.mdc` §6）。
5. **View · 状态与展示**：主列表 / 数据表首屏三态统一 **`AppLoadingContainer`**（普通列表包裹子树；表格 `TableBody` 内 `asTable` + `colSpan`）；`loading / error / empty / submitting` 四态（**内嵌摘录卡** `error` 豁免见 **`agent-to-api-view.mdc`** §1.3）；日期/数字/枚举走项目工具与渲染处内联（见 `agent-to-api-view.mdc`）。
6. **Controller · Mutation 与缓存**：每个 mutation 写清后置更新；避免全量乱失效；失败反馈到 toast / 禁用态恢复（见 `agent-to-api-controller.mdc` §4）。
7. **Controller · 静态残留清理**：Mock、假数据、与 Orval 不一致或重复的本地类型一律清理（见 `agent-to-api-controller.mdc` §5）。
8. **Controller · 分页触发**：`useInView` + 哨兵 + `!isFetchingNextPage` 触发 `fetchNextPage`（见 `agent-to-api-controller.mdc` §6）。
9. **Controller · 组件形态**：禁止 `useCallback`；中间变量最小化；事件 `handleXxx` 抽离；组件体内 **5 环节顺序**（第三方 → 全局 Store → 业务 Hooks → 局部派生/Effect → 函数 → return）；示例对照 `PlayEpisodeUnlockDialog.tsx`（见 `agent-to-api-controller.mdc` §7–§10）。

完成任务时的 **回复结构、强制门禁、验收与失败信号** 一律以 **`@.cursor/rules/agent-to-api.mdc`** 的「交付治理」章节为准。

## 与 Figma / UI 全局规范的关系

- 联调仅替换数据来源与交互闭环时，**不改变**既有 UI 契约的，仍以 **`agent-to-react*.mdc`** 中 layout / components / translation / format 等为约束。
- 若任务同时涉及「接 API」与「按稿改 UI」，可并列使用 **`figma-to-react-pipeline`** 与 **`api-to-ui-pipeline`**，分别以对应规则 / 技能为权威。
