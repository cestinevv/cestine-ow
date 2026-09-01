# 演员算力 API 联调实现计划

> **给 agentic workers:** 必须使用 `superpowers:executing-plans` 按任务逐项执行。步骤使用 checkbox（`- [ ]`）语法跟踪。

**目标:** 使用 `pnpm run generate:api` 当前生成产物中的 `computingPower` 与排序枚举，完成演员列表页、演员详情页、经纪工坊的算力字段展示与算力排序联调。

**架构:** 算力展示统一收敛到 `src/features/mining/miningPower.ts`，接口返回 `computingPower` 时直接使用后端值，本地公式只作为旧数据或接口缺字段时的兜底。演员列表排序与经纪工坊排序改用生成产物中的后端排序值，避免前端二次排序覆盖服务端分页顺序。

**技术栈:** React、TypeScript、TanStack Query、Orval 生成 API、Decimal.js、项目现有格式化工具。

---

## 文件职责

- 修改 `src/features/mining/miningPower.ts`
  - 演员 IP 算力：优先读取 `ActorCollectionResponse.computingPower`。
  - 经纪工坊演员算力：优先读取 `ActorDTO.computingPower`。
  - 保留旧字段与公式兜底，兼容旧接口数据。
- 修改 `src/features/actor/ActorPlazaView.tsx`
  - 演员列表 `IP算力` 排序改为后端 `computing_power`。
  - 移除 `IP算力` 的本地二次排序，保留价格本地排序现状。
- 修改 `src/features/game/constants/gameConstants.ts`
  - 经纪工坊“算力最高”排序值从 `POWER` 改为 `COMPUTING_POWER`。
- 修改 `src/features/game/components/GameMyActorsSection.tsx`
  - 移除旧 `POWER` 本地二次排序分支，使用后端排序结果。
- 只读关注 `src/api/__generated__/story/model/actorCollectionResponse.ts`
  - 确认 `computingPower?: number` 已存在。
- 只读关注 `src/api/__generated__/story/model/listActorCollectionsSort.ts`
  - 确认 `computing_power` 已存在。
- 只读关注 `src/api/__generated__/mining/model/actorDTO.ts`
  - 确认 `computingPower?: number` 已存在。
- 只读关注 `src/api/__generated__/mining/model/listAllActorsParams.ts`
  - 确认排序说明包含 `COMPUTING_POWER`。

## 当前生成产物风险

- 当前工作区已有大量 `src/api/__generated__/wallet/model/*` 生成产物增量，其中包含 `applicationContext`、`servletContext` 等疑似后端 OpenAPI 暴露内部对象的模型。
- 本次业务对接不修改这些无关产物；提交前需要单独确认是否应包含它们。

---

### Task 1: 统一算力读取口径

**Files:**
- Modify: `src/features/mining/miningPower.ts`

- [x] **Step 1: 调整演员 IP 算力读取**

在 `getActorIpPowerBreakdown` 中把 `computingPower` 放到 `ipPower` 的第一优先级：

```ts
const ipPower =
  readNumber(record, ['computingPower', 'ipPower', 'ipHashrate', 'power']) ??
  truncate(
    new Decimal(priceCoefficient).times(heatCoefficient).times(trust1),
    10,
  );
```

- [x] **Step 2: 调整经纪工坊演员算力读取**

在 `getActorMiningPowerBreakdown` 中把 `computingPower` 放到 `actorPower` 的第一优先级：

```ts
const actorPower =
  readNumber(actor, [
    'computingPower',
    'actorPower',
    'actorHashrate',
    'power',
  ]) ??
  truncate(
    new Decimal(ipPower)
      .times(miningCoefficient)
      .times(cpCoefficient)
      .times(trust2),
    10,
  );
```

- [x] **Step 3: 局部确认调用方**

运行：

```bash
rg -n "getActorIpPowerBreakdown|getActorMiningPowerBreakdown|computingPower" src/features src/api/__generated__/story/model src/api/__generated__/mining/model
```

预期：演员列表、演员详情、经纪工坊卡片仍通过公共 helper 展示算力。

---

### Task 2: 演员列表页对接后端算力排序

**Files:**
- Modify: `src/features/actor/ActorPlazaView.tsx`

- [x] **Step 1: 引入生成排序枚举**

新增 import：

```ts
import { ListActorCollectionsSort } from '@/api/__generated__/story/model/listActorCollectionsSort';
```

- [x] **Step 2: 替换后端排序值**

把 `BACKEND_ACTOR_COLLECTION_SORT` 调整为：

```ts
const BACKEND_ACTOR_COLLECTION_SORT = {
  priceAsc: ListActorCollectionsSort.price_asc,
  priceDesc: ListActorCollectionsSort.price_desc,
  completedView: 'COMPLETED_VIEW',
  heat: ListActorCollectionsSort.heat,
  ipPower: ListActorCollectionsSort.computing_power,
} as const;
```

说明：`completedView` 当前不在新生成枚举中，本次不扩大改动，继续保留旧值并通过现有类型边界适配。

- [x] **Step 3: 移除 IP 算力本地二次排序**

删除 `sortedListItems` 中 `activeSort === 'ipPower'` 的本地排序分支：

```ts
if (activeSort === 'ipPower') {
  out.sort(
    (a, b) =>
      getActorIpPowerBreakdown(b).ipPower -
      getActorIpPowerBreakdown(a).ipPower,
  );
  return out;
}
```

保留价格排序分支，避免一次性改变价格交互。

- [x] **Step 4: 清理无用 import**

如果 `getActorIpPowerBreakdown` 在 `ActorPlazaView.tsx` 中不再使用，删除对应 import。

- [x] **Step 5: 局部确认旧排序值**

运行：

```bash
rg -n "IP_POWER|PRICE_ASC|PRICE_DESC|activeSort === 'ipPower'|ListActorCollectionsSort" src/features/actor/ActorPlazaView.tsx
```

预期：`IP_POWER` 不再出现，`ipPower` 排序请求使用 `ListActorCollectionsSort.computing_power`。

---

### Task 3: 经纪工坊对接后端算力排序

**Files:**
- Modify: `src/features/game/constants/gameConstants.ts`
- Modify: `src/features/game/components/GameMyActorsSection.tsx`

- [x] **Step 1: 替换排序值**

把 `GAME_ACTOR_SORT_OPTIONS` 中算力排序改为：

```ts
export const GAME_ACTOR_SORT_OPTIONS = [
  { value: 'COMPUTING_POWER', labelKey: '算力最高' },
  { value: 'LEVEL', labelKey: '等级最高' },
  { value: 'HEAT', labelKey: '热度最高' },
  { value: 'STAMINA', labelKey: '体力最高' },
] as const;
```

- [x] **Step 2: 移除旧本地排序分支**

在 `GameMyActorsSection.tsx` 中删除：

```ts
if (sort === 'POWER') {
  rows.sort(
    (a, b) =>
      getActorMiningPowerBreakdown(b as unknown as Record<string, unknown>)
        .actorPower -
      getActorMiningPowerBreakdown(a as unknown as Record<string, unknown>)
        .actorPower,
  );
}
```

说明：算力排序交给 `/mining` 列表接口处理，避免分页场景下前端只对当前页排序。

- [x] **Step 3: 清理无用 import**

如果 `GameMyActorsSection.tsx` 不再使用 `getActorMiningPowerBreakdown`，删除对应 import。

- [x] **Step 4: 局部确认排序值**

运行：

```bash
rg -n "'POWER'|COMPUTING_POWER|getActorMiningPowerBreakdown" src/features/game
```

预期：经纪工坊排序选项使用 `COMPUTING_POWER`；卡片展示仍通过公共 helper 获取后端 `computingPower`。

---

### Task 4: 局部交付检查

**Files:**
- Read: `git diff -- src/features/mining/miningPower.ts src/features/actor/ActorPlazaView.tsx src/features/game/constants/gameConstants.ts src/features/game/components/GameMyActorsSection.tsx`

- [x] **Step 1: 查看业务 diff**

运行：

```bash
git diff -- src/features/mining/miningPower.ts src/features/actor/ActorPlazaView.tsx src/features/game/constants/gameConstants.ts src/features/game/components/GameMyActorsSection.tsx
```

预期：只包含算力字段优先级、排序枚举、移除本地排序相关改动。

- [x] **Step 2: 不运行全量验证**

根据项目规则，普通实现阶段不运行：

```bash
pnpm exec biome check
pnpm tsc --noEmit
git diff --check
```

若用户后续要求提交代码，再执行提交前检查。

## 自检

- 规格覆盖：演员列表页、演员详情页、经纪工坊排序与算力展示均已覆盖。
- 占位扫描：无 `TBD`、`TODO` 或“后续实现”类占位。
- 类型一致性：前端新增读取字段均来自当前 Orval 生成产物 `computingPower`，排序值使用 `computing_power` / `COMPUTING_POWER`。
