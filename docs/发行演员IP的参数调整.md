# 发行演员IP的参数调整

## 1. 背景与目标

本次改动围绕“演员 IP 发行参数”进行升级，核心目标是让前端完整支持两种定价模式并与最新 OpenAPI 对齐：

- `FIXED`（固定价格）
- `BONDING_CURVE`（曲线价格）

同时对演员广场、演员详情、签约弹窗、创建演员表单进行联动改造，保证从“创建发行参数”到“签约展示与价格说明”口径一致。

---

## 2. 当前工作区改动总览（提交范围）

### 2.1 Mock 与示例数据

- `demo/mock/actorDetail.json`
- `demo/mock/listActors.json`

修改点：

- 新增并使用 `pricingMode` 字段。
- 演示数据覆盖固定价格与曲线价格两种模式。
- 调整 `totalSupply` / `mintedSupply` / `availableSupply` / `initialPriceUsdc` / `currentPriceUsdc` 示例值。

### 2.2 API 生成代码（模型与接口）

- `src/api/__generated__/story/model/prepareActorCollectionRequest.ts`
- `src/api/__generated__/story/model/prepareActorCollectionRequestPricingMode.ts`（新增）
- `src/api/__generated__/story/model/prepareActorCollectionResponse.ts`
- `src/api/__generated__/story/model/actorCollectionResponse.ts`
- `src/api/__generated__/story/model/actorCollectionMintDigestResponse.ts`
- `src/api/__generated__/story/model/boundActorCollection.ts`
- `src/api/__generated__/story/model/index.ts`
- `src/api/__generated__/story/drama/drama.ts`
- `src/api/__generated__/story/model/dramaPlayResponse.ts`
- `src/api/__generated__/mining/mining-internal/mining-internal.ts`
- `src/api/__generated__/mining/model/index.ts`
- `src/api/__generated__/mining/model/triggerWeeklyRewardParams.ts`（新增）
- `src/api/__generated__/mining/model/triggerWweeklyRewardParams.ts`（删除）
- `src/api/__generated__/story/drama-heat-test/*`（新增）
- `src/api/__generated__/story/model/recalculateHeatForTest200.ts`（新增）
- `src/api/__generated__/story/model/recalculateHeatForTestParams.ts`（新增）
- `src/api/__generated__/story/model/reportEpisode200.ts`（新增）
- `src/api/__generated__/story/model/reportTypeItemResponse.ts`（新增）
- `src/api/__generated__/story/model/submitReportRequest.ts`（新增）

与“发行演员IP参数调整”直接相关的 API 变化：

- `PrepareActorCollectionRequest` 新增 `pricingMode`。
- `PrepareActorCollectionRequest.totalSupply` 约束更新为 `100-5000`。
- `ActorCollectionResponse` 新增 `pricingMode`。
- `PrepareActorCollectionResponse` 新增 `pricingMode`。
- `ActorCollectionMintDigestResponse` 新增 `curveMultiplierAmount`。

### 2.3 业务代码（actor/create-actor）

- `src/features/actor/actorPricing.ts`（新增）
- `src/features/actor/actorFormat.ts`
- `src/features/actor/actorMintDialogTypes.ts`
- `src/features/actor/components/ActorMintDialogs.tsx`
- `src/features/actor/components/ActorPlazaCard.tsx`
- `src/features/actor/components/ActorPriceDialog.tsx`
- `src/features/actor/components/ActorSignDialog.tsx`
- `src/features/actor/components/ActorDetailHero.tsx`
- `src/features/actor/components/ActorDetailIssueSection.tsx`
- `src/features/create-actor/CreateActorForm.tsx`
- `src/features/create-actor/actorCollectionPrepareCache.ts`

### 2.4 文档/计划文件

- `docs/superpowers/plans/2026-07-08-actor-ip-pricing-mode.md`（新增，计划文档）
- `docs/发行演员IP的参数调整.md`（本文档）

---

## 3. 关键改造点（改在了哪里、如何修改）

## 3.1 定价规则与共享能力

文件：`src/features/actor/actorPricing.ts`（新增）

新增能力：

- 定价模式常量与类型：`FIXED` / `BONDING_CURVE`。
- 模式归一化：`normalizeActorPricingMode`（空值默认曲线模式）。
- 文案映射：`getActorPricingModeLabel`（固定价格/曲线价格）。
- 价格计算：
  - 曲线价格：`initialPrice * 5 ** (signedCount / maxSupply)`
  - 尾价：`initialPrice * 5`
- 当前展示价决策：固定价格优先 `currentPrice`，缺失回落 `initialPrice`。

目标：统一计算口径，避免多个组件重复写价格逻辑。

## 3.2 演员展示数据口径升级

文件：`src/features/actor/actorFormat.ts`

改造内容：

- `getActorPlazaCardDisplay` 增加：
  - `pricingMode`
  - `pricingModeLabel`
  - `isFixedPricing`
  - `tailPriceUsdc`
  - 修正后的 `currentPriceUsdc`
- 新增对外 helper：
  - `getActorCollectionCurrentPriceUsdc`
  - `getActorCollectionPricingModeLabel`
  - `getActorCollectionTailPriceUsdc`
- `getActorMintDialogViewModel` 增加：
  - `pricingMode`
  - `pricingModeLabel`
  - `tailPriceUsdc`
  - `totalSupply`

## 3.3 签约弹窗链路参数补齐

文件：

- `src/features/actor/actorMintDialogTypes.ts`
- `src/features/actor/components/ActorMintDialogs.tsx`
- `src/features/actor/components/ActorSignDialog.tsx`

改造内容：

- 签约 ViewModel 增加定价模式相关字段与总发行量。
- `ActorMintDialogs` 向 `ActorSignDialog` 透传 `pricingMode`、`pricingModeLabel`、`totalSupply`。
- `ActorSignDialog`：
  - 支持定价模式展示差异。
  - 支持打开价格说明弹窗。
  - 固定价格与曲线价格文案分流。

## 3.4 价格说明弹窗与图表改造

文件：`src/features/actor/components/ActorPriceDialog.tsx`

改造内容：

- 弹窗 props 新增 `pricingMode`。
- 固定价格模式显示固定价格说明，不展示曲线图。
- 曲线模式保留图表并更新公式底数为 `5`（从旧口径调整）。
- 图表 Y 轴刻度策略同步调整，使用动态刻度（初始、中间、尾值）。

## 3.5 列表卡片与详情页联动

文件：

- `src/features/actor/components/ActorPlazaCard.tsx`
- `src/features/actor/components/ActorDetailHero.tsx`
- `src/features/actor/components/ActorDetailIssueSection.tsx`

改造内容：

- 演员卡片“签约价格”标签改为定价模式文案（固定价格/曲线价格）。
- 详情 Hero 区同步显示模式标签。
- 详情发行信息模块按模式分支：
  - 固定价格：仅展示固定价格说明卡片。
  - 曲线价格：展示“价格联合曲线”图例、图表和关键价格信息。
- 当前提交中，发行信息基础网格聚焦展示 3 项：合约地址、Token 标准、总发行量（已按最新 UI 调整）。

## 3.6 创建演员表单接入新参数

文件：`src/features/create-actor/CreateActorForm.tsx`

改造内容：

- 表单模型新增 `pricingMode`，默认 `BONDING_CURVE`。
- 新增“定价方式”UI 选项（固定价格/曲线价格）。
- 发行总量：
  - 默认值从历史值调整为更小规模（`1000`）。
  - 校验范围调整为 `100-5000`。
- 提交 `prepare` 请求时补齐 `pricingMode`。
- 根据定价模式动态切换价格字段文案：
  - 固定价格（USDC）
  - 初始价格（USDC）

## 3.7 Prepare 缓存键升级

文件：`src/features/create-actor/actorCollectionPrepareCache.ts`

改造内容：

- 缓存 key 由基础信息扩展为包含：
  - `pricingMode`
  - `totalSupply`
  - `initialPriceUsdc`

目标：避免不同发行参数命中同一缓存，导致复用旧 prepare 结果。

---

## 4. API 对接过程（端到端）

## 4.1 OpenAPI 产物更新

通过生成代码同步后，前端拿到新契约：

- `prepareActorCollectionRequest` 必传 `pricingMode`
- `totalSupply` 约束变化（100-5000）
- `actorCollection` 响应包含 `pricingMode`

## 4.2 创建流程对接

流程：

1. 用户在 `CreateActorForm` 选择定价模式与发行参数。
2. 前端构造 `prepare` 请求：
   - `assetId`
   - `name`
   - `bio`
   - `totalSupply`
   - `pricingMode`
   - `initialPriceUsdc`
3. 后端返回 `PrepareActorCollectionResponse`（含 `pricingMode` 等）。
4. 后续 mint/签约流程继续走既有链路。

## 4.3 展示流程对接

流程：

1. 列表/详情读取 `ActorCollectionResponse.pricingMode`。
2. 通过 `actorPricing.ts + actorFormat.ts` 统一计算展示数据。
3. 卡片、详情、签约弹窗、价格弹窗按 `pricingMode` 分支渲染。
4. 价格曲线统一使用底数 `5`，固定价格直接按固定口径展示。

---

## 5. 验收关注点

- 创建页：
  - 定价模式可选
  - 发行总量校验为 `100-5000`
  - prepare 请求包含 `pricingMode`
- 列表/详情：
  - 固定价格与曲线价格文案、图表、说明分支正确
- 签约：
  - 弹窗价格说明与模式一致
- 缓存：
  - 参数变更不会误命中旧 prepare 缓存

---

## 6. 备注

- 本次提交包含部分自动生成代码与接口能力扩展（`story/drama`、`story/drama-heat-test`、`mining`）的同步变更，已纳入同一提交范围。
