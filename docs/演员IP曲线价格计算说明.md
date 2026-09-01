# 演员 IP 现价与最终价格计算说明

## 适用范围

本文档说明演员 IP 在前端展示中的价格口径，适用于演员列表、演员详情页、确认签约弹窗、价格说明弹窗和价格曲线图。

涉及代码：

- `src/features/actor/actorPricing.ts`
- `src/features/actor/actorFormat.ts`
- `src/features/actor/components/ActorPriceDialog.tsx`
- `src/features/actor/components/ActorDetailIssueSection.tsx`

## 定价模式

演员 IP 当前支持两种定价模式：

- `FIXED`：固定价格
- `BONDING_CURVE`：曲线价格

定价模式由接口字段 `pricingMode` 决定。未返回或无法识别时，前端按 `BONDING_CURVE` 处理。

## 现价获取方式

### 优先使用后端返回值

前端优先读取接口返回的现价字段：

- `currentPriceUsdc`
- 兼容字段：`currentPriceUsd`

只要接口返回的现价是有效正数，前端就直接展示后端返回值，不重新计算。

### 后端未返回时的兜底逻辑

当接口没有返回有效 `currentPriceUsdc` 时，前端按定价模式兜底：

- `FIXED`：使用 `initialPriceUsdc`
- `BONDING_CURVE`：使用前端曲线公式计算

曲线价格兜底需要以下字段：

- `initialPriceUsdc`：初始价格
- `mintedSupply`：已签约数量
- `totalSupply`：总发行量

如果 `mintedSupply` 缺失，前端会尝试使用 `totalSupply - availableSupply` 推导。

## 曲线价格计算方式

曲线价格不是直接使用连续公式：

```text
initialPriceUsdc × 5 ^ (mintedSupply / totalSupply)
```

实际前端按后端 / 合约口径逐步计算：

```text
单步倍率 = 5 ^ (1 / totalSupply)
```

从初始价格开始，每签约一次执行一次：

```text
price = truncate6(price × 单步倍率)
```

其中 `truncate6` 表示向下截断到 6 位小数，不做四舍五入。

伪代码：

```ts
function getCurvePrice(initialPrice: number, signedCount: number, totalSupply: number) {
  const stepMultiplier = 5 ** (1 / totalSupply);
  let price = initialPrice;

  for (let i = 0; i < signedCount; i += 1) {
    price = Math.trunc(price * stepMultiplier * 1_000_000) / 1_000_000;
  }

  return price;
}
```

## 最终价格计算方式

最终价格是最后一个可签约 NFT 的价格。

计算口径等价于：

```text
signedCount = totalSupply - 1
```

也就是从初始价格开始，循环 `totalSupply - 1` 次，每次按单步倍率计算并截断 6 位。

伪代码：

```ts
const tailPrice = getCurvePrice(initialPriceUsdc, totalSupply - 1, totalSupply);
```

注意：最终价格不是简单的 `initialPriceUsdc × 5`。`initialPriceUsdc × 5` 表示售完后的下一个报价，但第 `totalSupply + 1` 个 NFT 不存在。

示例：

```text
initialPriceUsdc = 5
totalSupply = 1000
```

售完后的下一个报价口径：

```text
5 × 5 = 25
```

最后一个可签约 NFT 的价格：

```text
24.958529
```

前端应展示最后一个可签约 NFT 的价格。

## 展示与交易口径

- 展示现价：优先使用后端 `currentPriceUsdc`。
- 展示最终价：前端按逐步截断公式计算。
- 价格曲线图：每个点位按逐步截断公式计算。
- 确认签约价格：使用统一展示模型中的 `currentPriceUsdc`，因此仍然优先以后端返回值为准。

如果后端返回的 `currentPriceUsdc` 与前端兜底计算结果不同，前端展示以后端返回值为准。
