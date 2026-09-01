---
name: generate-ladle-stories
description: 为项目中的 React 组件自动生成标准的 Ladle (.stories.tsx) 预览文件。只有 @src/components 目录需要 Ladle 支持，其余文件夹均不需要。当你新建或更新了 @src/components 下的组件时，必须主动使用此技能生成/更新预览。
---

# Generate Ladle Stories

## 适用场景
当用户要求“给 xxx 添加 Ladle 支持”、“为 xxx 组件写 story”、“生成 ladle 预览”，或者仅仅提到 "Ladle" 并带有生成或处理组件意图时，立即应用此技能。**注意：只有 `@src/components` 目录需要 Ladle 支持，其余文件夹都不需要。**

**强制触发条件**：
一旦在 `@src/components`（UI 组件目录）下**新建**或**修改了组件代码**，**必须**主动调用本技能为其生成或更新对应的 `.stories.tsx` 文件，并告知用户可以通过运行 `pnpm ladle` 来进行隔离预览。

## 全局样式入口（必读）

Ladle **不会**自动走 `src/routes/__root.tsx` 的 `import '@/app.css'`。全局壳在 **`.ladle/components.tsx`**（导出 `Provider`，注入 `app.css` + i18n + `data-theme`）。缺此文件时 Tailwind 工具类不生效，Dialog Overlay 会退化成 Base UI 的透明 `InternalBackdrop`，预览表现为半屏黑块 / 布局错乱。改样式相关 story 前先确认该 Provider 仍在。

## 工作流 (Workflow)

当用户要求为某个文件夹或组件生成 Ladle 支持时，或者当组件发生更新触发此技能时，必须按以下步骤执行：

1. **查找目标文件**：使用 `Glob` 工具查找目标目录下的 `.tsx` 组件文件，或直接读取指定的组件文件。
2. **过滤排除**：
   - 排除已经以 `.stories.tsx` 结尾的文件。
   - 排除非 UI 组件的纯逻辑文件（如 `index.tsx`, `utils.tsx` 或只包含 Hook 的文件）。
3. **分析组件结构**：使用 `Read` 工具读取组件源码。
   - 识别组件的 `Props` 定义（如 `variant`, `size`, `color`, `disabled` 等）。
   - 如果是基于 `class-variance-authority` (cva) 创建的组件（如 shadcn/ui 风格），提取所有的 `variants` 枚举值。
   - 如果包含图标插槽（如 `icon`、`children` 等），准备合适的 mock 元素。
4. **生成并写入文件**：使用下方的标准模板为每个组件生成对应的 `.stories.tsx` 文件，并使用 `Write` 工具写入。
5. **提示预览**：操作完成后，提醒用户可以运行项目的 `npm run ladle` 脚本来启动 Ladle 并在浏览器中查看组件的实际效果。

## 代码生成模板与规范 (Template & Rules)

生成的每个 Story 文件必须严格遵循以下代码结构和 Tailwind CSS 规范：

### 1. 基础结构
```tsx
import type { Story } from '@ladle/react';
import { ComponentName } from './ComponentName';

// 必须提供一个 Default 的基础用例
export const Default: Story = () => (
  <div className="p-4 w-[400px]">
    <ComponentName />
  </div>
);
```

### 2. 容器样式规范
- 每个 Story 组件的外层必须包裹一层容器：`<div className="p-4">`。
- 如果是单行排列的变体展示，使用：`<div className="p-4 flex gap-4 items-center">`
- 如果是多行网格排列，使用：`<div className="p-4 flex flex-col gap-6">`
- 需要限制宽度的卡片类组件，添加宽度：`w-[400px]` 或 `w-[600px]`。

### 3. 多态组件（Variants & Sizes）的遍历
如果组件存在多个 variant 或 size，不要在一个 Story 中挤成一堆无法分辨，而应该分组列出，或者分成多个 Story：

```tsx
export const Variants: Story = () => (
  <div className="p-4 flex flex-col gap-6">
    <div className="flex gap-4 items-center">
      <ComponentName variant="default">Default</ComponentName>
      <ComponentName variant="outline">Outline</ComponentName>
      <ComponentName variant="ghost">Ghost</ComponentName>
    </div>
  </div>
);

export const Sizes: Story = () => (
  <div className="p-4 flex gap-4 items-center">
    <ComponentName size="sm">Small</ComponentName>
    <ComponentName size="md">Medium</ComponentName>
    <ComponentName size="lg">Large</ComponentName>
  </div>
);
```

### 4. 其它注意事项
- **不要使用真实的外部依赖**：如果组件需要复杂的数据、上下文或路由（React Router），请在组件外部提供简单的 Mock 或者包裹所需要的 Provider。
- **深色模式适配**：如果组件具有 `dark:` 相关的 Tailwind 类名，尽量通过 Ladle 自带的深色模式切换来测试，不用在 Story 内硬编码强加黑底，除非特定场景演示。
- **命名规范**：生成的文件必须和组件同名，后缀为 `.stories.tsx`（例如 `Button.tsx` -> `button.stories.tsx` 或 `Button.stories.tsx`，保持大小写一致）。
