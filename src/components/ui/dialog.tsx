import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import type * as React from 'react';

import { cn } from '@/utils';

function Dialog({
  disablePointerDismissal = true,
  ...props
}: DialogPrimitive.Root.Props) {
  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      disablePointerDismissal={disablePointerDismissal}
      {...props}
    />
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50',
        'bg-black/50 supports-backdrop-filter:backdrop-blur-md',
        'md:bg-black/40 md:supports-backdrop-filter:backdrop-blur-xs',
        'transition-opacity duration-150',
        'data-ending-style:opacity-0 data-starting-style:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  bodyScroll = true,
  bare = false,
  overlayClassName,
  ...props
}: DialogPrimitive.Popup.Props & {
  /** 为 false 时弹层随内容增高，内层不出现纵向滚动条（用于内容可控的短表单弹窗） */
  bodyScroll?: boolean;
  /** 为 true 时不包 scroll 壳，子节点直接挂在 Popup（供 AppDialog 等自行拆分标题/正文滚动） */
  bare?: boolean;
  /** 遮罩层局部样式；播放器等需要保持背景内容清晰时使用 */
  overlayClassName?: string;
}) {
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Viewport
        className={cn(
          'fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-4',
        )}
      >
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            // 外层只负责定位 / 圆角 / 边框 / 视觉表达，并通过 overflow-hidden 把内部滚动条裁切到圆角内
            'relative flex w-full max-w-none flex-col overflow-hidden md:max-w-lg',
            bodyScroll
              ? 'h-auto overflow-hidden'
              : 'h-auto max-h-none md:max-h-none',
            'border-t border-border bg-card bg-clip-padding text-card-foreground shadow-lg md:border md:border-border',
            'rounded-b-none rounded-t-3xl md:rounded-2xl',
            'transition-[opacity,transform] duration-200 ease-out',
            'data-ending-style:translate-y-full data-starting-style:translate-y-full',
            'md:data-ending-style:translate-y-0 md:data-starting-style:translate-y-0',
            'md:data-ending-style:scale-95 md:data-ending-style:opacity-0 md:data-starting-style:scale-95 md:data-starting-style:opacity-0',
            className,
            // 移动端（<md）弹层宽度必须贴齐视口：`max-w-*` 等仅允许写在 `md:` 前缀下，避免大屏手机被误限宽
            'max-md:max-w-none',
          )}
          {...props}
        >
          {bare ? (
            children
          ) : (
            <div
              data-slot="dialog-content-scroll"
              className={cn(
                'relative flex w-full flex-col',
                bodyScroll
                  ? [
                      // 滚动区直接限高：内容少时随内容增高，超出 var/fallback 后在自身内部滚动
                      'max-h-[var(--app-dialog-max-height,90dvh)] min-h-0 overflow-y-auto',
                      // 阻止滚动到顶/底时的回弹与穿透，避免露出底色
                      'overscroll-none',
                      // 自定义滚动条：去掉默认 track 灰底/边框，仅保留圆角细滑块
                      '[scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]',
                      '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent',
                      '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:bg-clip-padding [&::-webkit-scrollbar-thumb]:border-y-[6px] [&::-webkit-scrollbar-thumb]:border-transparent',
                      'max-md:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]',
                    ]
                  : 'overflow-visible',
              )}
            >
              {children}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        'text-lg font-bold leading-[26px] tracking-[-0.04px]',
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
