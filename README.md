# 技术架构概览

`web-onestory-www` 是一套基于 **TanStack Start** 的全栈 Web 应用：以 **Vite** 为构建与开发服务器，**Nitro** 承载生产侧 SSR/部署产物，**TanStack Router** 负责类型安全的文件系统路由，已补齐 **TanStack Query** 数据层与基础设施能力。

## 运行时与框架

| 层级 | 选型 | 说明 |
|------|------|------|
| UI | React 19 | 配合 React Compiler（Babel preset）做编译期优化 |
| 路由与全栈 | TanStack Router + TanStack Start | `src/routes` 约定式路由；支持 SSR 渲染与分层布局 |
| 数据获取 | TanStack Query v5 | 全局 `QueryClient`；可与 Orval 生成 hooks 组合使用 |
| SSR / 部署 | Nitro（Vite 插件） | 与 Start 集成；生产可通过 `node .output/server/index.mjs` 启动 |
| 语言 | TypeScript | 路径别名 `@/*`、`~/*` 指向 `src/` |

## 界面、主题与资源

- **组件体系**：shadcn/ui（`components.json` 为 **base-nova** 风格），底层为 **@base-ui/react**；通用样式入口为 `src/app.css`，**Tailwind CSS v4** 经 `@tailwindcss/vite` 接入。
- **主题**：`next-themes` Provider 已接入，默认以 `data-theme` 驱动深浅色切换。
- **图标与图片**：业务矢量图标位于 `src/assets/svg`；位图等资源位于 `public/` 与相关资源目录。

## 认证与链上

- 已预置 **Privy**（`@privy-io/react-auth`）**Solana-only** 登录，配合 **Solana Kit** / `@solana/react-hooks` 做链上交互；不包含 wagmi / viem / EVM。
- 通过 `VITE_PRIVY_APP_ID` 环境变量开关启用；未配置时会自动回退为直通模式，不影响当前站点功能。

## 数据层

- **HTTP**：统一经 **axios** 实例（`src/api/appRequest.ts`）发起请求，环境变量控制 `baseURL`（`VITE_API_BASE_URL`）。
- **契约与代码生成**：**Orval** 根据 OpenAPI 生成 **TanStack Query** 客户端，产物约定在 `src/api/__generated__/`；生成配置见 `orval.config.ts`，源为仓库 `api.yaml`。

## 国际化

- **i18next** + **react-i18next**，文案资源为 `src/locales/*.json`。
- 当前仓库保持既有 i18n 初始化与脚本实现：`scripts/i18n-auto/*` + `package.json` 中 `i18n:*` 脚本。

## 客户端状态与表单

- **Zustand**：已引入作为全局/跨页状态方案。
- **react-hook-form** + **zod** + **@hookform/resolvers**：表单建模与校验能力已补齐。

## 业务代码组织（`src/`）

| 目录 | 职责 |
|------|------|
| `routes/` | 页面级路由与数据边界 |
| `features/` | 按业务域划分的视图与子组件 |
| `components/` | 可复用 UI（含 `components/ui` 的 shadcn 封装） |
| `layouts/` | 布局、错误与 404 边界 |
| `providers/` | Theme、Privy 等顶层 Provider |
| `api/` | axios 封装、Orval 生成代码 |
| `hooks/` / `stores/` | 可复用 hooks 与状态管理（按需扩展） |
| `utils/` / `types/` | 工具与类型 |
| `assets/` | 静态资源 |

根路由在 `src/routes/__root.tsx` 中挂载全局 Provider（Query、i18n、主题、Privy、Sonner、Devtools）。

## 工程化与质量

- **包管理**：pnpm；**格式化/静态检查**：Biome（`fmt` 脚本）。
- **Git 钩子**：Husky + lint-staged（见 `prepare`、`.husky/pre-commit`、`package.json` 的 `lint-staged`）。
- **组件开发**：Ladle（`VITE_LADLE=true` 时跳过 TanStack Start/Nitro，仅做组件预览）。

## 构建与环境

- **开发**：`vite dev`。
- **构建**：`vite build`，并提供 `development` / `staging` / `production` mode 脚本。
- **生产预览**：`vite preview`；另有 `start` / `start:srvx` 适配不同部署形态。
- **辅助脚本**：`scripts/docker-test.sh`、`scripts/docker-build-test.sh`、`scripts/deploy-aws.sh`。

以上构成当前仓库的端到端技术架构：**全栈 React + 类型安全路由 + Query 数据层 + Orval 契约驱动 + 国际化 + 可选 Privy/Wagmi 链上身份 + 完整工程化链路**。





dsa
dsa

dsa
dsa
dsa
d
sad
sa
d
