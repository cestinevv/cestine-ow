'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/index';

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        'group/tabs flex gap-2 data-horizontal:flex-col',
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  [
    // Layout & Positioning
    'group/tabs-list inline-flex w-fit items-center justify-center',
    'group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col',
    // Visuals & Typography
    'rounded-lg p-[3px] text-muted-foreground',
    // States & Variants
    'data-[variant=line]:rounded-none',
  ],
  {
    variants: {
      variant: {
        default: 'bg-muted',
        // History / Figma 历史记录导航：行高 56px（h-14），与 min-h-14 稿面一致
        line: 'gap-0 bg-transparent p-0 group-data-horizontal/tabs:h-14',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // Layout & Positioning
        'relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5',
        'group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start',
        // Visuals & Typography
        'rounded-md border border-transparent px-1.5 py-0.5',
        'text-sm font-medium whitespace-nowrap text-muted-foreground',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Interactions & States
        'transition-all hover:cursor-pointer [&:not([data-active])]:hover:text-foreground data-active:hover:cursor-default',
        'focus-visible:ring-0 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
        'dark:text-muted-foreground dark:[&:not([data-active])]:hover:text-foreground',
        // Variant specific states
        'group-data-[variant=default]/tabs-list:data-active:shadow-sm',
        'group-data-[variant=line]/tabs-list:data-active:shadow-none group-data-[variant=line]/tabs-list:rounded-none',
        'group-data-[variant=line]/tabs-list:flex-none group-data-[variant=line]/tabs-list:w-auto',
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent',
        'dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent',
        'group-data-[variant=line]/tabs-list:data-active:font-bold',
        // Active states（default 变体；line 页签激活色由业务 className 指定）
        'group-data-[variant=default]/tabs-list:data-active:bg-background group-data-[variant=default]/tabs-list:data-active:text-foreground',
        'dark:group-data-[variant=default]/tabs-list:data-active:border-input dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30 dark:group-data-[variant=default]/tabs-list:data-active:text-foreground',
        // Line indicator
        'after:absolute after:bg-foreground after:opacity-0 after:transition-all',
        'group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5',
        'group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:inset-x-auto group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:left-1/2 group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:-translate-x-1/2 group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:w-6 group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:h-1 group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:rounded-none group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:bottom-0',
        'group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5',
        'group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
