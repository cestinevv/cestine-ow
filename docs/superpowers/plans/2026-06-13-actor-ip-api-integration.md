# 演员 IP API 联调实施计划

> **给 agentic workers：** 必须使用子技能：使用 `superpowers:executing-plans` 按任务逐步执行本计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 更新 Mini Drama Service API 生成产物，并把演员 IP 列表、演员搜索、演员详情页、添加演员页面切到新接口。

**架构：** Orval 生成的新演员 IP 接口集中在 `src/api/__generated__/story/演员ip/演员ip.ts`。`ActorPlazaView` 负责编排列表分页、搜索 query、排序参数和首屏状态；`ActorDetailView` 通过新 public actor collection detail / cast dramas 接口读取详情；`CreateActorForm` 创建模式通过 `listAssets` 导入素材并通过 `mintActorCollection` 发行演员 IP。展示组件继续接收生成 model 渲染。

**技术栈：** React、TypeScript、TanStack Query、Orval、Tailwind CSS、shadcn/ui。

---

### 任务 1：重新生成 Mini Drama Service API

**文件：**
- 修改：`src/api/__generated__/story/**`
- 修改：`src/api/__generated__/mining/**`
- 修改：`orval.config.ts`

- [x] **步骤 1：运行 Orval 生成**

执行：

```bash
pnpm generate:api
```

预期：Orval 完成 `story`、`mining`、`wallet`、`admin` 的生成。

- [x] **步骤 2：检查演员 IP 生成接口**

检查：

```bash
rg -n "listActorCollections|searchActorCollections|actorCollectionDetail|actorCastDramas" src/api/__generated__/story/演员ip/演员ip.ts
```

预期：新的演员 IP 列表、搜索、详情和参演短剧接口可用。

### 任务 2：把演员广场列表接入新的演员 IP 列表 API

**文件：**
- 修改：`src/features/actor/ActorPlazaView.tsx`
- 修改：`src/features/actor/actorFormat.ts`
- 修改：`src/features/actor/components/ActorPlazaCard.tsx`

- [x] **步骤 1：替换旧列表 API import**

使用：

```ts
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { ListActorCollectionsParams } from '@/api/__generated__/story/model/listActorCollectionsParams';
import { ListActorCollectionsSort } from '@/api/__generated__/story/model/listActorCollectionsSort';
import type { PageDtoActorCollectionResponse } from '@/api/__generated__/story/model/pageDtoActorCollectionResponse';
import {
  getListActorCollectionsQueryKey,
  listActorCollections,
} from '@/api/__generated__/story/演员ip/演员ip';
```

- [x] **步骤 2：运行时保留 cursor 字符串形态**

实现模式：

```ts
mark: pageParam as unknown as ListActorCollectionsParams['mark']
```

原因：生成类型暂为 `number`，但 API cursor 必须原样透传，不能做数值转换。

- [x] **步骤 3：完成卡片 model 迁移**

把 `ActorPlazaCard` props 和字段读取改为 `ActorCollectionResponse`，使用：

```ts
const currentPrice =
  item.currentPriceUsdc !== undefined || item.initialPriceUsdc !== undefined
    ? display.mintPriceUsdc
    : 733;
const initialPrice = item.initialPriceUsdc ?? 0.54;
const maxSupply = item.totalSupply ?? 5000;
```

### 任务 3：把演员搜索接入新的搜索 API

**文件：**
- 修改：`src/features/actor/ActorPlazaView.tsx`

- [x] **步骤 1：用搜索 query 替换前端本地过滤**

使用 `useSearchActorCollections`，参数为：

```ts
{
  keyword: searchKeyword,
  limit: 6,
}
```

- [x] **步骤 2：保留下拉框 loading 和 empty 状态**

使用 `searchQuery.isFetching` 展示下拉 loading，并保留现有空状态文案 `没有找到匹配的演员IP`。

- [x] **步骤 3：重新读取修改后的搜索代码块**

只做本地源码读取：

```bash
sed -n '1,460p' src/features/actor/ActorPlazaView.tsx
```

预期：当前文件中不再残留 `ActorResponse`、`listActors` 或本地 `actorSearchMatches`。

### 任务 4：把演员详情页接入新的演员合集 API

**文件：**
- 修改：`src/features/actor/actorPublicApi.ts`
- 修改：`src/features/actor/ActorDetailView.tsx`
- 修改：`src/features/actor/components/ActorDetailHero.tsx`
- 修改：`src/features/actor/components/ActorDetailIssueSection.tsx`

- [x] **步骤 1：用新的 actor collection 端点替换详情 wrapper**

使用生成函数：

```ts
actorCollectionDetail
actorCastDramas
getActorCollectionDetailQueryKey
getActorCastDramasQueryKey
```

wrapper 输入继续保持字符串 `actorId`，只在生成 API 调用边界做最小类型适配。

- [x] **步骤 2：替换详情 model import**

使用 `ActorCollectionResponse` 替代已删除的 `ActorResponse`。

- [x] **步骤 3：更新详情字段名**

使用：

```ts
detail.totalSupply
detail.initialPriceUsdc
detail.currentPriceUsdc
detail.completedViewCount
detail.heatValue
```

### 任务 5：把添加演员页面接入新的演员 IP 创建 API

**文件：**
- 修改：`src/features/create-actor/CreateActorForm.tsx`
- 读取：`src/api/__generated__/story/演员ip/演员ip.ts`
- 读取：`src/api/__generated__/story/model/assetInfoDto.ts`
- 读取：`src/api/__generated__/story/model/mintActorCollectionRequest.ts`
- 读取：`src/api/__generated__/story/model/actorCollectionMintDigestResponse.ts`

- [x] **步骤 1：替换 DreamOS 演员来源列表**

使用生成 API：

```ts
import type { AssetInfoDto } from '@/api/__generated__/story/model/assetInfoDto';
import type { MintActorCollectionRequest } from '@/api/__generated__/story/model/mintActorCollectionRequest';
import { MintActorCollectionRequestPayMethod } from '@/api/__generated__/story/model/mintActorCollectionRequestPayMethod';
import {
  getListAssetsQueryKey,
  useListAssets,
  useMintActorCollection,
} from '@/api/__generated__/story/演员ip/演员ip';
```

把创建模式旧的 `useListActors1` 列表替换为 `useListAssets`。

- [x] **步骤 2：适配导入素材展示 helper**

读取生成 model 后使用 `AssetInfoDto` 字段。选择值保持 `assetId` 字符串，不要把任何 ID 类字段转为 number。

- [x] **步骤 3：通过演员 IP mint API 提交创建**

非编辑模式下构造：

```ts
const mintPayload: MintActorCollectionRequest = {
  assetId: selectedDreamActorId,
  nftChain,
  nftTokenStandard,
  nftContractAddress,
  payMethod,
};
```

调用 `useMintActorCollection().mutateAsync({ data: mintPayload })`。如果现有表单字段暂时不在新 request 中，先保留为 UI 字段，等后端暴露对应字段后再接入。

- [x] **步骤 4：创建成功后刷新演员 IP 列表**

invalidate：

```ts
queryClient.invalidateQueries({
  queryKey: getListActorCollectionsQueryKey(),
});
```

然后展示现有成功弹窗，并在用户确认后返回演员管理页面。

- [x] **步骤 5：记录编辑 / 删除模式 API 缺口**

当前生成 API 不再包含旧 `getActorForEdit` / `updateActor` / `deleteActor` / creator actor list 端点。实现中暂时通过小范围本地 wrapper 保持编辑 / 删除可用；等 OpenAPI 重新暴露对应 operations 后再替换。

### 任务 6：只做本地源码一致性检查

**文件：**
- 只读检查：`src/features/actor` 和 `src/features/create-actor`

- [x] **步骤 1：搜索陈旧 actor 生成 import**

执行：

```bash
rg -n "ActorResponse|ListActors|listActors|getListActors|public-actor-controller|creator-actor-controller|actorResponse|pageDtoActorResponse" src/features/actor src/features/create-actor
```

预期：`src/features/actor` 或 `src/features/create-actor` 中没有陈旧引用。全仓搜索仍会在无关 actor NFT / staking hooks 中看到旧生成 import，这部分需要在完整 typecheck / commit 前单独处理。

- [x] **步骤 2：不要运行被限制的验证命令**

不要运行：

```bash
pnpm exec biome check
git diff --check
tsc --noEmit
pnpm typecheck
```

原因：用户明确限制这些命令只在 commit / 最终检查请求中执行。
