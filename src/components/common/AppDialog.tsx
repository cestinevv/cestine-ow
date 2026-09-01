import type { CSSProperties, ReactNode } from 'react';
import IconX from '@/assets/svg/IconX';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils';

type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** 自定义可见标题区域；title 仍作为无障碍标题保留 */
  headerContent?: ReactNode;
  /** 弹窗内容层 className，仅用于业务局部覆盖视觉样式 */
  contentClassName?: string;
  /** 遮罩层 className；仅用于业务局部覆盖视觉样式 */
  overlayClassName?: string;
  /** 标题栏 className，仅用于自定义标题区域 */
  headerClassName?: string;
  /** 隐藏默认关闭按钮；自定义标题区域必须提供关闭入口 */
  hideCloseButton?: boolean;
  children: ReactNode;
  width?: number | string;
  /** 为 false 时弹层随内容增高、不设 max-h（短表单）；为 true 时在 max-h 内滚动 */
  bodyScroll?: boolean;
  /** 弹窗最大高度覆盖（仅 bodyScroll=true）。number 视为 px，string 直接作为 CSS 单位（如 '90dvh'） */
  maxHeight?: number | string;
  /** 正文容器 className，默认 `px-6 pb-6`；表格类弹窗可传 `px-0 pb-6` 去掉左右内边距 */
  bodyClassName?: string;
  /** 为 true 时隐藏标题栏与关闭按钮；title 仍以 sr-only 保留以供无障碍访问 */
  hideHeader?: boolean;
  /** 是否禁止点击遮罩关闭；默认在有标题栏时禁止、隐藏标题栏时允许，可显式覆盖 */
  disablePointerDismissal?: boolean;
};

export function AppDialog({
  open,
  onOpenChange,
  title,
  headerContent,
  contentClassName,
  overlayClassName,
  headerClassName,
  hideCloseButton = false,
  children,
  width = 400,
  bodyScroll = true,
  maxHeight,
  bodyClassName,
  hideHeader = false,
  disablePointerDismissal,
}: AppDialogProps) {
  const popupWidth = typeof width === 'number' ? `${String(width)}px` : width;
  const popupMaxHeight =
    typeof maxHeight === 'number' ? `${String(maxHeight)}px` : maxHeight;

  const resolvedDisablePointerDismissal =
    disablePointerDismissal ?? !hideHeader;

  // 标题栏关闭始终可用（含链上提交/确认中）；业务侧仅禁用底部操作按钮
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      disablePointerDismissal={resolvedDisablePointerDismissal}
    >
      <DialogContent
        bodyScroll={bodyScroll}
        overlayClassName={overlayClassName}
        className={cn(
          // Layout & Positioning
          'w-full md:max-w-(--app-dialog-width)',
          // Spacing
          'gap-0 p-0',
          // Visual
          'border-0 bg-background md:border-0',
          contentClassName,
        )}
        style={
          {
            '--app-dialog-width': popupWidth,
            ...(popupMaxHeight
              ? { '--app-dialog-max-height': popupMaxHeight }
              : {}),
          } as CSSProperties
        }
      >
        {hideHeader ? (
          <DialogTitle className="sr-only">{title}</DialogTitle>
        ) : (
          <DialogHeader
            className={cn(
              // Layout & Positioning
              'sticky top-0 z-10 flex w-full shrink-0 flex-row items-center justify-between',
              // Spacing
              'gap-4 px-6 py-5',
              // Visual
              'bg-background',
              headerClassName,
            )}
          >
            {headerContent ? (
              <>
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <div className="min-w-0 flex-1">{headerContent}</div>
              </>
            ) : (
              <DialogTitle
                className={cn(
                  // Layout & Positioning
                  'm-0 min-w-0 flex-1 text-left',
                  // Typography
                  'text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground',
                )}
              >
                {title}
              </DialogTitle>
            )}
            {hideCloseButton ? null : (
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full"
                    aria-label="Close"
                    onClick={handleClose}
                  />
                }
              >
                <IconX className="size-6 text-foreground" />
              </DialogClose>
            )}
          </DialogHeader>
        )}

        <div className={cn('w-full px-6 pb-6', bodyClassName)}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
