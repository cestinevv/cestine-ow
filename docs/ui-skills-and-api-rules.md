# UI 技能、API 规则与 Token 策略说明

本文记录 **`generate-ui` 技能**（独立蒸馏版）、**`figma-to-react-pipeline`**（仓库内完整流水线叙述，**本文档不修改该文件**）、以及 **API 联调规则 `alwaysApply`** 调整，便于团队对齐用法。

---

## 1. 修改与约定总览

| 项 | 说明 |
|----|------|
| `.cursor/skills/generate-ui/SKILL.md` | **独立技能**：正文为蒸馏 MCP 与交付清单 + UI-only + 子规则「一行索引」；**不引用** `figma-to-react-pipeline`；执行静态还原只需本技能 + `agent-to-react*.mdc`。 |
| `.cursor/skills/figma-to-react-pipeline/SKILL.md` | **不在此文档批次内修改**；仍为完整 Figma → React 流水线条文与子规则索引表，可与 `generate-ui` **并行**使用（任选其一或对照阅读）。 |
| `.cursor/rules/agent-to-api*.mdc`（4 个） | `alwaysApply: false` + 扩展 `description` 触发词；联调时建议用户 **`@agent-to-api.mdc`**。 |

---

## 2. `generate-ui` 与 `figma-to-react-pipeline` 的关系（无从属）

| 维度 | `generate-ui` | `figma-to-react-pipeline` |
|------|-----------------|---------------------------|
| **依赖** | 仅依赖 **`agent-to-react.mdc` 及子规则** | 同上 |
| **技能间** | **不**要求阅读或引用 pipeline 文件 | 未由本批次改动；若文内有指向其他技能的段落，以仓库实际文件为准 |
| **篇幅** | 短：蒸馏清单 + 省 MCP 策略 | 长：完整流程、子规则表、§4 展开 |
| **适用** | 静态 UI、省 token、单技能闭环 | 需要全文流水线叙述、索引表逐条对照时 |

---

## 3. API 规则 `alwaysApply: false` 的优缺点与团队用法

### 优点

- 静态 UI / 纯 Figma 还原类对话，有机会 **少自动挂载** 大段 `agent-to-api*.mdc`，降低规则类 token 基线。

### 缺点与风险

- **联调任务可能漏带规则**：智能匹配不足时，模型可能未加载完整 API 规范。
- **缓解**：联调第一句话 **`@.cursor/rules/agent-to-api.mdc`**（及按需 `@` 子规则）；遵循 `api-to-ui-pipeline` 与 `agent-to-api.mdc` 交付格式。

### 不要采用的做法

- **不要**注释或删除规则文件；用 **`alwaysApply` + `description`** 与对话 **`@`** 控制。

---

## 4. 快速选择：技能与 @ 规则

| 场景 | 建议 |
|------|------|
| 只做 Figma 静态还原、不接接口 | 使用 **`generate-ui`**；或直接使用 **`figma-to-react-pipeline`**；**不必**按 `agent-to-api` 产出联调交付物。 |
| 接接口、mutation、分页、表格三态等 | **`@.cursor/rules/agent-to-api.mdc`** + `api-to-ui-pipeline`；不以 `generate-ui` 为主流程。 |
| 大稿、稀疏结构 | **`agent-to-react-large-design.mdc`** + `planning-with-files`（`generate-ui` 蒸馏清单已点名）。 |

---

## 5. 维护约定

- 新增或重命名 **`agent-to-react-*.mdc`**：`generate-ui` 的「子规则范围」一行及 **`figma-to-react-pipeline`** 内子规则索引（若维护该文件）应同步更新，避免脱节。
- 调整 **`agent-to-api*.mdc`** 适用范围时：同步更新各文件 **`description`** 触发词。
