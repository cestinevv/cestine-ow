# 演员 IP 徽章与详情价格 UI 实施计划

> **供智能代理执行：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项执行。本计划使用复选框跟踪进度。

**目标：** 使用最新生成 API 的徽章字段完成演员列表、演员详情、参演短剧、演员 IP 金库及两种价格模式的 UI 调整。

**架构：** 新增一个只负责枚举到视觉映射的通用徽章组件，演员和短剧展示组件直接传入生成 API 字段。详情发行区继续使用现有价格格式化与曲线计算逻辑，仅按 `pricingMode` 切换展示结构；金库缺少接口时保持未知态占位。

**技术栈：** React、TypeScript、TanStack Router、Tailwind CSS、shadcn/ui、react-i18next、Orval 生成模型

---

### 任务 1：实现通用内容徽章

**文件：**
- 新建：`src/features/badge/ContentBadge.tsx`

- [ ] **步骤 1：定义徽章映射**

映射 `OFFICIAL`、`COMMUNITY`、`PARTNER`、`VERIFIED` 到对应中文文案和视觉类；空值及未知值返回 `null`。

- [ ] **步骤 2：实现可复用组件**

组件接收 `badge` 和可选 `className`，使用 `cn` 合并样式，文案通过 `t(...)` 输出，图标使用项目已有图标或语义化 Lucide 图标。

- [ ] **步骤 3：局部审查**

确认四个枚举文案分别为“官方发行”“社区发行”“合作方发行”“认证创作者发行”，且组件不依赖演员专属模型。

### 任务 2：调整演员列表卡片

**文件：**
- 修改：`src/features/actor/components/ActorPlazaCard.tsx`

- [ ] **步骤 1：接入徽章**

封面左上角使用 `ContentBadge` 渲染 `item.badge`，缺失时不占位。

- [ ] **步骤 2：调整封面底部信息**

左侧使用 `item.assetId` 展示 `IP {assetId}`，右侧展示用户图标和 `item.creatorName`；两侧使用半透明黑色胶囊并限制最大宽度。

- [ ] **步骤 3：清理旧布局**

删除原封面顶部发行者标签，保留现有详情跳转、复制编号、价格弹窗、签约和售罄逻辑。

### 任务 3：调整演员详情和参演短剧

**文件：**
- 修改：`src/features/actor/components/ActorDetailHero.tsx`
- 修改：`src/features/actor/components/ActorCastDramaCard.tsx`

- [ ] **步骤 1：详情名称接入徽章**

把名称和 `ContentBadge` 放在同一行，使用 `detail.badge`，长名称保持截断且不挤压徽章。

- [ ] **步骤 2：参演短剧接入徽章**

在短剧封面左上角使用 `ContentBadge` 渲染 `item.badge`，保留集数和封面渐变信息。

- [ ] **步骤 3：审查数据来源**

演员徽章只使用 `ActorCollectionResponse.badge`，短剧徽章只使用 `DramaListItemResponse.badge`，不根据其他字段推断。

### 任务 4：重构详情发行信息和演员 IP 金库

**文件：**
- 修改：`src/features/actor/components/ActorDetailIssueSection.tsx`
- 新建：`src/features/actor/components/ActorIpVaultDialog.tsx`

- [ ] **步骤 1：补齐六项发行信息**

桌面端使用两行三列，移动端使用紧凑信息行，展示合约地址、Token 标准、定价类型、总发行量、已签约、剩余。

- [ ] **步骤 2：区分价格模式**

`BONDING_CURVE` 展示公式、曲线图和初始/当前/尾价；`FIXED` 不展示曲线，按 Figma 展示固定价格模式信息。

- [ ] **步骤 3：实现金库区**

增加“演员 IP 金库”标题、帮助按钮、金额栏和两项沉淀说明；没有接口字段时展示 `-- USDC`。

- [ ] **步骤 4：实现金库说明弹窗**

使用 `AppDialog` 展示 Figma 文案和“知道了”按钮，帮助按钮只控制弹窗开关。

### 任务 5：调整曲线和固定价格弹窗

**文件：**
- 修改：`src/features/actor/components/ActorPriceDialog.tsx`

- [ ] **步骤 1：曲线模式还原**

展示标题、副标题、风险提示、公式、曲线图、图例，以及初始价格、当前价格、尾价、总发行量、已签约、剩余六项数据。

- [ ] **步骤 2：固定模式还原**

使用独立标题、说明与统计布局，不渲染曲线图，保持与曲线模式明显区分。

- [ ] **步骤 3：保持调用协议**

不修改 `ActorPriceDialog` 的打开关闭方式及现有调用方数据流。

### 任务 6：局部交付检查

**文件：**
- 审查：上述所有修改文件

- [ ] **步骤 1：静态检查字段**

使用定向 `rg` 检查徽章枚举、`assetId`、`creatorName` 和 `pricingMode` 的引用，不运行 `tsc`、Biome 或全量 typecheck。

- [ ] **步骤 2：检查工作区**

查看 `git status --short`，确认生成 API 变更、规格文档和本次 UI 文件均保留，且没有新增临时资源。

- [ ] **步骤 3：记录未验证项**

在交付说明中列出未运行的自动验证及金库接口缺失风险。
