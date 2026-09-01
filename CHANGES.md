# 改动汇总

> 基于 `7750b4d..HEAD` 的所有变更（2026-09-02）

## 文件清单

| 状态 | 文件 | 行变化 | 说明 |
|---|---|---|---|
| 新增 | `.github/workflows/branch-ai-review.yml` | +263 | 每次 push 触发 MiniMax-M3 影响评估,结果发飞书 |
| 修改 | `.github/workflows/feishu-webhook.yml` | +71 / -8 | push 通知升级为飞书交互卡片;监控所有分支 |
| 新增 | `.github/workflows/pr-analysis.yml` | +423 | PR 全量分析:SonarQube / PR-Agent / 影响分析 / MiniMax / bundle diff / tsc diff |
| 新增 | `scripts/lib/keyring.sh` | +40 | AES-256-CBC key 混淆工具(encode / decode) |
| 新增 | `scripts/pr-impact-analysis.ts` | +250 | 静态影响分析脚本:diff → TanStack 路由映射 → 反向依赖 |
| 新增 | `sonar-project.properties` | +52 | SonarQube 配置模板(默认禁用,ENABLE_SONAR=true 开启) |
| 修改 | `README.md` | +15 | - |
| 修改 | `src/api/appRequest.ts` | +12 | - |

**合计:8 个文件,+1118 / -8 行**

---

## 核心改动说明

### `.github/workflows/feishu-webhook.yml`
- 消息格式:纯文本 → 飞书交互卡片(绿色 header,字段网格,两个按钮)
- 触发分支:`["main","master"]` → `["**"]`(监控所有分支)

### `.github/workflows/pr-analysis.yml`
6 个并行 job,均可通过 GitHub Variables 开关控制:

| Job | 默认 | 开关 |
|---|---|---|
| `sonar` | 禁用 | `ENABLE_SONAR=true` |
| `pr-agent` | 启用 | `ENABLE_PR_AGENT=false` |
| `impact` | 启用 | `ENABLE_IMPACT=false` |
| `impact-ai` (MiniMax) | 启用 | `ENABLE_IMPACT_AI=false` |
| `bundle-diff` | 启用 | `ENABLE_BUNDLE_DIFF=false` |
| `tsc-diff` | 启用 | `ENABLE_TSC_DIFF=false` |

### `.github/workflows/branch-ai-review.yml`
- 每次 push 任意分支触发
- 调用 `scripts/pr-impact-analysis.ts` 做静态影响分析
- 将影响报告 + diff 发给 MiniMax-M3,生成 4 段风险评估
- 结果以飞书交互卡片发送(蓝/灰/橙三种状态)

### `scripts/lib/keyring.sh`
- `encode <plaintext>` → AES-256-CBC 加密 blob(随机 IV,每次结果不同)
- `decode <blob>` → 还原明文
- workflow 内通过 `MINIMAX_KEY_BLOB` secret 传入 blob,运行时解密使用

---

## 所需 GitHub 配置

**Secrets:**

| Name | 用途 |
|---|---|
| `FEISHU_WEBHOOK_URL` | 飞书 webhook |
| `MINIMAX_KEY_BLOB` | MiniMax key 混淆后的 blob |
| `SONAR_HOST_URL` | SonarQube 地址(仅 ENABLE_SONAR=true 时需要) |
| `SONAR_TOKEN` | SonarQube token(仅 ENABLE_SONAR=true 时需要) |
| `ANTHROPIC_API_KEY` 或 `OPENAI_KEY` | PR-Agent LLM 后端 |

**Variables(可选):**

| Name | 默认值 |
|---|---|
| `MINIMAX_MODEL` | `MiniMax-M3` |
| `MINIMAX_BASE_URL` | `https://api.minimaxi.com/anthropic` |
| `PR_AGENT_MODEL` | `anthropic/[REDACTED]` |
| `SONAR_PROJECT_KEY` | `web-onestory` |
