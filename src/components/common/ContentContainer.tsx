import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/utils';

/** 全站版心水平留白：移动端 8px / 桌面 16px（Header / 剧场等与之对齐） */
export const CONTENT_CONTAINER_PADDING_CLASS = 'px-2 md:px-4';

/**
 * 吸顶条移动端横向铺满：与 {@link CONTENT_CONTAINER_PADDING_CLASS} 成对。
 * 改版心水平留白时须同步改此处（px-2 ↔ -mx-2；md 与版心 md:px-4 对齐后不再 bleed）。
 */
export const CONTENT_CONTAINER_STICKY_BLEED_CLASS =
  '-mx-2 px-2 md:mx-0 md:px-0';

type ContentContainerProps = ComponentPropsWithoutRef<'div'>;

export function ContentContainer({
  className,
  children,
  ...props
}: ContentContainerProps) {
  return (
    <div
      className={cn(
        `mx-auto w-full max-w-[1832px] ${CONTENT_CONTAINER_PADDING_CLASS}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
