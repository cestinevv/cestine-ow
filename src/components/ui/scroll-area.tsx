import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import { cn } from '@/utils/index';

function ScrollArea({
  className,
  children,
  orientation = 'vertical',
  hideScrollbar = false,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  orientation?: 'vertical' | 'horizontal' | 'both';
  hideScrollbar?: boolean;
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          'size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1',
          hideScrollbar &&
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {!hideScrollbar &&
      (orientation === 'vertical' || orientation === 'both') ? (
        <ScrollBar orientation="vertical" />
      ) : null}
      {!hideScrollbar &&
      (orientation === 'horizontal' || orientation === 'both') ? (
        <ScrollBar orientation="horizontal" />
      ) : null}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        // Layout & Positioning
        'flex touch-none select-none',
        'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1',
        'data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-col',
        // Visuals — 与候场面板细滚动条同色；默认隐藏
        'bg-transparent p-0 opacity-0 transition-opacity',
        // Interactions — Mac 式：悬停 / 滚动时出现（Base UI data-hovering / data-scrolling）
        'pointer-events-none',
        'data-hovering:pointer-events-auto data-hovering:opacity-100',
        'data-scrolling:pointer-events-auto data-scrolling:opacity-100 data-scrolling:duration-0',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-scrollbar"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
