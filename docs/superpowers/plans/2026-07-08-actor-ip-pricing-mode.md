# 演员 IP 定价模式改造计划

> **给执行代理：** 按本计划逐项实现。实现前先读取对应文件的当前代码，保护已有未提交改动；普通实现阶段不要运行 `tsc`、`biome check`、`git diff --check` 或全量 typecheck。只有用户要求提交代码时，再按项目规则执行提交前检查。

**目标：** 基于最新 `generate:api` 产物和 `demo/prd/2.1 发行演员IP的参数调整PRD/2.1 发行演员IP的参数调整PRD.md`，完成演员 IP 发行定价模式改造：创建演员 IP 时支持固定价格 / 曲线价格，演员列表、签约弹窗、价格说明弹窗、演员详情发行信息按 `pricingMode` 展示，API prepare 请求补齐新参数。

**架构：** 保持现有 `create-actor`、`actor` feature 边界。创建页负责收集发行参数并调用 prepare；演员列表和详情页使用生成的 `ActorCollectionResponse` 字段展示；定价模式、曲线公式、尾价和文案映射沉淀到 feature 内共享 helper，避免在 JSX 中散落判断。

**技术栈：** React、TypeScript、Tailwind CSS、shadcn/ui 风格组件、Orval 生成 API、现有 Solana mint 流程。

**输入依据：**

- API 产物：`src/api/__generated__/story/model/prepareActorCollectionRequest.ts`
- API 枚举：`src/api/__generated__/story/model/prepareActorCollectionRequestPricingMode.ts`
- API 响应：`src/api/__generated__/story/model/actorCollectionResponse.ts`
- PRD：`demo/prd/2.1 发行演员IP的参数调整PRD/2.1 发行演员IP的参数调整PRD.md`
- Figma 节点：
  - 创建演员 IP 固定价格选项：`6217:51872`、`6223:53798`
  - 演员详情页固定价格卡片：`6217:53581`
  - 演员列表页固定价格弹窗：`6217:53503`
  - 演员列表页价格图表弹窗：`6217:52153`

---

## 任务 1：对齐 Figma、PRD 与 API 字段

**文件：**

- `demo/prd/2.1 发行演员IP的参数调整PRD/2.1 发行演员IP的参数调整PRD.md`
- `src/api/__generated__/story/model/prepareActorCollectionRequest.ts`
- `src/api/__generated__/story/model/prepareActorCollectionRequestPricingMode.ts`
- `src/api/__generated__/story/model/actorCollectionResponse.ts`

**步骤：**

- [ ] 使用 Figma 工具读取指定节点，记录创建页、签约弹窗、价格说明弹窗、详情页固定价格卡片的尺寸、文案、层级、状态差异。
- [ ] 确认 `PrepareActorCollectionRequest` 当前字段为 `assetId`、`totalSupply`、`pricingMode`、`initialPriceUsdc`、`name`、`bio`。
- [ ] 确认 `totalSupply` API 约束为 `100-5000`。
- [ ] 确认 `PrepareActorCollectionRequestPricingMode` 枚举值为 `FIXED` 和 `BONDING_CURVE`。
- [ ] 确认 `ActorCollectionResponse` 可用于展示的字段：`pricingMode`、`totalSupply`、`mintedSupply`、`availableSupply`、`initialPriceUsdc`、`currentPriceUsdc`、`nftMintAddress`、`nftTokenStandard`。

**预期结果：** 实现前明确字段来源，不新增与生成 model 同构的本地类型。

---

## 任务 2：抽出演员 IP 定价展示 helper

**文件：**

- `src/features/actor/actorFormat.ts`
- 可选新增：`src/features/actor/actorPricing.ts`
- 需要同步引用的文件：
  - `src/features/actor/components/ActorPriceDialog.tsx`
  - `src/features/actor/components/ActorDetailIssueSection.tsx`
  - `src/features/actor/components/ActorSignDialog.tsx`
  - `src/features/actor/ActorPlazaCard.tsx`
  - `src/features/actor/components/ActorDetailHero.tsx`

**步骤：**

- [ ] 定义定价模式归一化逻辑，未知或缺失时默认按旧数据 `BONDING_CURVE` 处理。
- [ ] 定义曲线底数常量 `ACTOR_BONDING_CURVE_BASE = 5`。
- [ ] 将曲线价格公式统一为 `initialPriceUsdc * 5 ** (mintedSupply / totalSupply)`。
- [ ] 计算尾价 `tailPriceUsdc = initialPriceUsdc * 5`。
- [ ] 固定价格模式展示价优先使用 `currentPriceUsdc`，缺失时再使用 `initialPriceUsdc`。
- [ ] 在 `getActorPlazaCardDisplay` 或同级 helper 中补齐 `pricingMode`、`pricingModeLabel`、`isFixedPricing`、`tailPriceUsdc`、`signedCount`、`remainingCount`、`maxSupply`。

**预期结果：** 列表卡片、详情页、签约弹窗和价格弹窗使用同一套定价口径；曲线底数不再散落写死为 `20`。

---

## 任务 3：创建演员 IP 页面接入定价模式

**文件：**

- `src/features/create-actor/CreateActorForm.tsx`

**步骤：**

- [ ] 在表单模型中新增 `pricingMode` 字段，默认值为 `BONDING_CURVE`。
- [ ] 按 Figma 增加“曲线价格 / 固定价格”选择控件，优先复用项目已有控件；固定价格与曲线价格共用价格输入，但展示文案区分为固定价格或初始价格。
- [ ] 将发行总量默认值和校验范围调整为 `100-5000`。
- [ ] 提交 prepare 时补齐：

```ts
pricingMode: data.pricingMode
```

- [ ] `prepareActorCollectionMutation` 的本地缓存 key 使用 `assetId`，并补充 `pricingMode`、`totalSupply`、`initialPriceUsdc`，避免不同发行参数复用旧 `actorCollectionId`。
- [ ] 保持后续 `/mint` 和链上发行流程现有逻辑不变，除非新 API 响应字段要求最小适配。

**预期结果：** `POST /api/mini-drama/creator/actor-collections/collection/prepare` 请求体符合新 OpenAPI；固定价格和曲线价格都能进入现有发行流程。

---

## 任务 4：演员列表卡片补齐固定价格展示

**文件：**

- `src/features/actor/ActorPlazaCard.tsx`
- `src/features/actor/actorFormat.ts`
- `src/features/actor/components/ActorMintDialogs.tsx`

**步骤：**

- [ ] 演员 IP 标签继续使用列表接口的 `id` 展示，保持与列表卡片“演员IP”逻辑一致。
- [ ] 卡片价格展示使用 helper 计算后的 `currentPriceUsdc`。
- [ ] 固定价格模式展示“固定价格”标识；曲线模式展示“曲线价格”标识。
- [ ] 卡片点击签约时，将 `pricingMode`、`totalSupply`、`mintedSupply`、`availableSupply`、`initialPriceUsdc`、`currentPriceUsdc` 传入签约弹窗。
- [ ] 售罄逻辑继续使用 `availableSupply` 判断：`> 0` 展示签约，`<= 0` 展示去交易。

**预期结果：** 列表卡片能正确区分固定价格和曲线价格，弹窗拿到完整字段。

---

## 任务 5：确认签约弹窗按定价模式更新

**文件：**

- `src/features/actor/components/ActorSignDialog.tsx`
- `src/features/actor/components/ActorMintDialogs.tsx`
- `src/features/actor/actorMintDialogTypes.ts`

**步骤：**

- [ ] 按 PRD 和 Figma 更新价格摘要卡片 DOM/CSS。
- [ ] 第一行展示定价标签：`曲线价格` 或 `固定价格`，右侧问号按钮打开价格说明弹窗。
- [ ] 第二行展示签约价格，使用 `currentPriceUsdc`。
- [ ] 第三行展示 `总发行 X · 剩余 Y`。
- [ ] 曲线价格模式展示 `已开启 1% 滑点保护，价格超出时将取消交易`。
- [ ] 固定价格模式不展示滑点提示。
- [ ] 保留当前确认签约 JS 逻辑，不改变现有 API + 合约调用链。

**预期结果：** 签约弹窗在两种模式下展示正确，固定价格不出现滑点说明。

---

## 任务 6：价格说明弹窗支持曲线价格和固定价格

**文件：**

- `src/features/actor/components/ActorPriceDialog.tsx`

**步骤：**

- [ ] 弹窗接收 `pricingMode`。
- [ ] 曲线价格模式：
  - 标题为 `曲线价格`
  - 公式为 `价格 = 初始价格 × 5^(已签约数 ÷ 发行总量)`
  - 曲线图使用底数 `5`
  - 展示 6 个数据块：初始价格、当前价格、尾价、总发行量、已签约、剩余
  - 增加 PRD 风险提示
- [ ] 固定价格模式：
  - 标题为 `固定价格`
  - 展示固定价格说明文案
  - 展示固定结算、不随销量上涨、适合锁定成本三条要点
  - 不渲染曲线图和滑点相关文案

**预期结果：** 列表页问号弹窗满足两个 Figma 节点的模式差异。

---

## 任务 7：演员详情页发行信息模块更新

**文件：**

- `src/features/actor/components/ActorDetailIssueSection.tsx`
- `src/features/actor/components/ActorDetailHero.tsx`

**步骤：**

- [ ] 发行信息基础网格展示 6 字段：合约地址、Token 标准、定价类型、总发行量、已签约、剩余。
- [ ] 曲线价格模式展示“价格联合曲线”区块、公式、曲线图、初始价格 / 当前价格 / 尾价三字段。
- [ ] 固定价格模式展示固定价格卡片，不渲染曲线图。
- [ ] 详情页签约入口继续复用列表页签约弹窗的数据结构，保持字段口径一致。

**预期结果：** 演员详情页能够正确展示固定价格卡片和曲线价格发行信息。

---

## 任务 8：Mock 与演示数据补齐

**文件：**

- `demo/mock/listActors.json`
- `demo/mock/actorDetail.json`

**步骤：**

- [ ] 按当前接口文档格式补齐 `pricingMode` 字段。
- [ ] 保留至少一条 `BONDING_CURVE` 数据和一条 `FIXED` 数据。
- [ ] 补齐 `totalSupply`、`mintedSupply`、`availableSupply`、`initialPriceUsdc`、`currentPriceUsdc`，确保列表、弹窗、详情页都有可渲染字段。

**预期结果：** 本地 mock 能覆盖两种定价模式的 UI 分支。

---

## 任务 9：局部自查与提交阶段验证

**实现阶段自查：**

- [ ] 人工检查 `prepare` 请求体已包含 `pricingMode`。
- [ ] 人工检查发行总量校验范围为 `100-5000`。
- [ ] 人工检查所有公式文案和计算底数均为 `5`。
- [ ] 人工检查固定价格模式不展示滑点和曲线图。
- [ ] 人工检查 `FIXED` 模式展示价格使用 `currentPriceUsdc`，后端固定模式会让该字段等于 `nftUnitPrice`。

**提交阶段验证：**

- [ ] 只有用户要求提交代码时，再按项目规则运行提交前检查。
- [ ] 如果仓库根目录存在 `ci_acp.sh`，提交时优先执行 `sh ci_acp.sh "feat: 演员IP定价模式改造"`。
- [ ] 检查失败时只修复本次改动引入的问题，不扩大重构范围。

**预期结果：** 实现完成后可按用户要求进入提交流程；普通实现阶段不主动运行全量验证命令。

---

## 风险与注意事项

- `pricingMode` 是新字段，旧数据可能为空，前端必须默认按 `BONDING_CURVE` 展示。
- 演员 IP 的 ID、assetId 等后端 Long / 雪花 ID 不要转 `number` 参与计算或拼 URL。
- prepare 本地缓存如果只按 `assetId` 命中，可能复用旧发行参数；本次要把定价模式、发行量和价格纳入缓存判断。
- `curveMultiplierAmount = 1000000000000` 是后端 / 合约侧固定价格 mint 输出规则，前端不应自行伪造该字段，除非当前合约调用明确需要前端传入。
- UI 改动应保持当前签约 API 与链上调用逻辑稳定，除非新生成 API 类型要求最小适配。
