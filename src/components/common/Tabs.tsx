import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils';

interface TabItem {
  value: string;
  labelKey: string;
}

interface BaseTabsProps {
  items: readonly TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  t: (key: string) => string;
}

/** Figma 2532:10638 — 线条页签外层：全宽 1px 底部分割线（<md 单行 + 横向滚动） */
export const lineUnderlinedTabsWrapperClassName = cn(
  // Layout & Positioning（<md 单行溢出时启用横向滚动；md 及以上恢复默认）
  'w-full max-w-full overflow-x-auto overflow-y-hidden md:overflow-x-visible',
  // Spacing（为移动端横向滚动条预留空间）
  'pb-1 md:pb-0',
  // Visual
  'border-b border-border',
  '[scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent',
);

/** Figma 2532:10638 — 线条页签 TabsList（gap 32px；<md 不换行 + 跟随内容宽度形成横向滚动） */
export const lineUnderlinedTabsListClassName = cn(
  // Layout & Positioning（<md：min-w-max + flex-nowrap 让总宽超出 wrapper 时横向滚动）
  'flex w-full min-w-max flex-nowrap items-end justify-start md:min-w-0 md:flex-wrap',
  // Spacing
  'h-auto gap-8',
  // Visual
  'rounded-none border-0 bg-transparent p-0',
);

/** Figma 2532:10638 — 线条页签触发器：激活 3px 青绿底边与 wrapper 1px 分割线叠合 */
export const lineUnderlinedTabTriggerClassName = cn(
  // Layout & Positioning
  'relative -mb-px rounded-none border-0 border-b-2 border-transparent bg-transparent pb-5 shadow-none after:hidden',
  // Visuals & Typography
  'text-base leading-6 font-medium text-wallet-text-secondary transition-none',
  // States
  'data-active:z-[1] data-active:border-b-[3px] data-active:border-language-switcher-active data-active:font-bold data-active:text-language-switcher-active',
  'data-active:hover:text-language-switcher-active',
  'dark:data-active:text-language-switcher-active dark:data-active:hover:text-language-switcher-active',
  '[&:not([data-active])]:hover:text-foreground',
);

/** 个人中心内容页签 — Figma 392:120817：无整行分割线，gap 20，激活 16x3 下划线 */
export const profileContentTabsWrapperClassName = cn(
  // Layout — min-w-0 防止 flex 子项被 min-w-max 的 TabsList 撑开整页
  'w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden',
  'md:overflow-x-visible',
  '[scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent',
);

export const profileContentTabsListClassName = cn(
  'flex h-auto w-full min-w-max flex-nowrap items-center justify-start',
  'gap-5 rounded-none border-0 bg-transparent p-0 pt-2.5',
);

export const profileContentTabTriggerClassName = cn(
  'relative h-auto flex-none rounded-none border-0 bg-transparent px-0 pb-[5px] shadow-none after:hidden',
  'text-base leading-6 font-normal text-muted-foreground transition-none',
  'data-active:font-bold data-active:text-foreground',
  'data-active:hover:text-foreground',
  '[&:not([data-active])]:hover:text-foreground',
  'before:absolute before:bottom-0 before:left-1/2 before:h-[3px] before:w-4 before:-translate-x-1/2 before:rounded-full before:bg-foreground before:opacity-0',
  'data-active:before:opacity-100',
);

/** 个人中心收藏二级页签 — Figma 392:120817：14px 胶囊，gap 8 */
export const profileFavoriteTabsListClassName = cn(
  'flex h-auto w-full flex-wrap items-start justify-start gap-2 rounded-none border-0 bg-transparent p-0',
);

export const profileFavoriteTabTriggerClassName = cn(
  'h-7 flex-none rounded-full border-0 px-3 py-1 text-sm leading-5 shadow-none after:hidden',
  'bg-filter-pill-inactive-surface font-bold text-filter-pill-inactive-foreground',
  'data-active:bg-filter-pill-active-surface data-active:font-medium data-active:text-filter-pill-active-foreground',
  'group-data-[variant=default]/tabs-list:data-active:bg-filter-pill-active-surface',
  'group-data-[variant=default]/tabs-list:data-active:text-filter-pill-active-foreground',
  'dark:group-data-[variant=default]/tabs-list:data-active:bg-filter-pill-active-surface',
  'dark:group-data-[variant=default]/tabs-list:data-active:text-filter-pill-active-foreground',
  '[&:not([data-active])]:hover:text-filter-pill-inactive-foreground',
  'data-active:hover:text-filter-pill-active-foreground',
);

/** 质押收益页「短剧/演员/代币」pill 切换 — Figma 3540:7907 */
export const incomeEarningsPillTabsListClassName = cn(
  // Layout & Positioning（覆盖 tabsList 默认 group-data-horizontal/tabs:h-8，由子项 h-10 撑开）
  'flex w-full flex-wrap items-center justify-start gap-3 group-data-horizontal/tabs:h-auto',
  // Visual
  'h-auto rounded-none border-0 bg-transparent p-0',
);

export const incomeEarningsPillTabTriggerClassName = cn(
  // Layout & Positioning
  'h-10 flex-none rounded-[80px] px-6 py-2',
  // Visuals & Typography
  'border-0 text-sm leading-5 font-medium shadow-none after:hidden',
  'bg-play-unlock-permanent-badge-surface text-play-unlock-permanent-badge-foreground',
  // States
  'data-active:bg-foreground data-active:text-background',
  'hover:[&:not([data-active])]:opacity-90',
);

/** 收益页流水筛选 pill — Figma 4986:45556 / 4995:56183 */
export const incomeLedgerFilterPillsListClassName = cn(
  'flex w-full flex-wrap items-center justify-start gap-3',
  'h-auto rounded-none border-0 bg-transparent p-0',
);

export const incomeLedgerFilterPillTriggerClassName = cn(
  'h-10 flex-none rounded-[80px] border-0 px-6 py-2',
  'text-sm leading-5 shadow-none after:hidden',
  'bg-muted font-medium text-foreground',
  'data-active:bg-card data-active:font-bold data-active:shadow-[0_1px_4px_rgba(0,0,0,0.08)]',
  'hover:[&:not([data-active])]:opacity-90',
);

/** 短剧管理等状态筛选 — Figma 4657:22813 / 7390:88994 gap-8 */
export const filterTabsPillsListClassName = cn(
  // Layout & Positioning
  'flex w-max min-w-full flex-nowrap items-start justify-start',
  'group-data-horizontal/tabs:h-auto',
  // Spacing
  'gap-2 p-0',
  // Visual
  'h-auto rounded-none border-0 bg-transparent',
);

/** 筛选 pill 未选中视觉（TabsTrigger / Button 共用）— Figma 7390:89032 / 7622:85098 */
export const filterPillInactiveClassName = cn(
  'bg-filter-pill-inactive-surface font-medium text-filter-pill-inactive-foreground',
);

/**
 * 筛选 pill 选中视觉（TabsTrigger / Button 共用）
 * 浅色：Page&Sheet/dark #212225 + 白字（7390:89032）
 * 深色：白底 + #111113（7622:85098 white-to-dark）
 */
export const filterPillActiveClassName = cn(
  'bg-filter-pill-active-surface font-bold text-filter-pill-active-foreground shadow-none',
);

/** Button 版筛选 pill 基础尺寸 — Figma 7390:88994 px-16 + 文案区等效 py-8、rounded-80 */
export const filterPillButtonBaseClassName = cn(
  'h-auto shrink-0 rounded-full px-4 py-2 text-sm leading-5 whitespace-nowrap shadow-none',
);

/** Button 版未选中：悬停保持文字色，仅轻微透明度 */
export const filterPillButtonInactiveClassName = cn(
  filterPillInactiveClassName,
  'hover:bg-filter-pill-inactive-surface hover:text-filter-pill-inactive-foreground hover:opacity-90',
);

/** Button 版选中：悬停保持选中色 */
export const filterPillButtonActiveClassName = cn(
  filterPillActiveClassName,
  'hover:bg-filter-pill-active-surface hover:text-filter-pill-active-foreground',
);

/** 未选中 pill — Figma 7390:89032 / 7622:85098 */
export const filterTabsPillInactiveClassName = cn(
  filterPillInactiveClassName,
  '[&:not([data-active])]:bg-filter-pill-inactive-surface',
  '[&:not([data-active])]:font-medium',
  '[&:not([data-active])]:text-filter-pill-inactive-foreground',
);

/**
 * 选中 pill — Figma 7390:89032 / 7622:85098
 * 覆盖 ui/tabs line 变体的 data-active:bg-transparent
 */
export const filterTabsPillActiveClassName = cn(
  'data-active:bg-filter-pill-active-surface data-active:font-bold',
  'data-active:text-filter-pill-active-foreground data-active:shadow-none',
  'group-data-[variant=line]/tabs-list:data-active:bg-filter-pill-active-surface',
  'group-data-[variant=line]/tabs-list:data-active:text-filter-pill-active-foreground',
  'dark:group-data-[variant=line]/tabs-list:data-active:bg-filter-pill-active-surface',
  'dark:group-data-[variant=line]/tabs-list:data-active:text-filter-pill-active-foreground',
);

export const filterTabsPillTriggerClassName = cn(
  // Layout — Figma 7390:89032：px-16 + 文案区等效 py-8、rounded-80px
  'relative inline-flex h-auto w-auto min-h-0 flex-none shrink-0 items-center justify-center',
  'rounded-full border-0 px-4 py-2',
  'group-data-[variant=line]/tabs-list:rounded-full',
  'text-sm leading-5 whitespace-nowrap shadow-none after:hidden',
  filterTabsPillInactiveClassName,
  filterTabsPillActiveClassName,
  // 覆盖 ui/tabs 默认 hover:text-foreground，未选中悬停保持原文字色
  '[&:not([data-active])]:hover:text-filter-pill-inactive-foreground',
  'dark:[&:not([data-active])]:hover:text-filter-pill-inactive-foreground',
  'data-active:hover:text-filter-pill-active-foreground',
  'hover:[&:not([data-active])]:opacity-90',
);

/**
 * 管理类标签组件 - 带下划线的线条样式
 * 用于短剧管理、演员管理等主要导航标签
 */
export function CommonTabs({ items, value, onValueChange, t }: BaseTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className="flex w-full flex-col gap-0"
    >
      <div className={lineUnderlinedTabsWrapperClassName}>
        <TabsList variant="line" className={lineUnderlinedTabsListClassName}>
          {items.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={lineUnderlinedTabTriggerClassName}
            >
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}

/**
 * 筛选类标签组件 - 圆角 Pills 样式
 * 用于状态筛选、分类筛选等辅助筛选标签
 */
export function FilterTabs({ items, value, onValueChange, t }: BaseTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <div className="w-full max-w-full overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
        <TabsList variant="line" className={filterTabsPillsListClassName}>
          {items.map((filter) => (
            <TabsTrigger
              key={filter.value}
              value={filter.value}
              className={filterTabsPillTriggerClassName}
            >
              {t(filter.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
