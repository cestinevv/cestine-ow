import type { Story } from '@ladle/react';
import { useState } from 'react';

import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

import { AppDialog } from './AppDialog';

export const Default: Story = () => {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-4">
      <Button type="button" onClick={() => setOpen(true)}>
        打开对话框
      </Button>
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="解锁第 25 集"
        width={424}
      >
        <div className="flex w-full flex-col gap-4">
          <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
            对话框内容区域保持灵活，由 children 自行组织布局。
          </div>
          <div className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            头部是公共区域，并且 sticky 置顶。
          </div>
        </div>
      </AppDialog>
    </div>
  );
};

export const HideHeader: Story = () => {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-4">
      <Button type="button" onClick={() => setOpen(true)}>
        打开（无标题栏）
      </Button>
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="无障碍标题（sr-only）"
        hideHeader
        width={424}
        bodyScroll={false}
      >
        <div className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-foreground">
          hideHeader：隐藏标题栏与关闭按钮，title 仍保留给读屏。点遮罩可关闭。
        </div>
      </AppDialog>
    </div>
  );
};

export const FooterButtons: Story = () => {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-4">
      <Button type="button" onClick={() => setOpen(true)}>
        打开（标准底部按钮）
      </Button>
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="确认操作"
        width={424}
      >
        <div className="flex flex-col gap-6">
          <p className="text-center text-sm leading-5 text-muted-foreground">
            Figma 970:115321 — 主按钮 foreground/background，次按钮 1.5px
            描边，rounded-xl。
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className={cn(APP_DIALOG_SECONDARY_BUTTON_CLASS, 'h-11')}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              className={cn(APP_DIALOG_PRIMARY_BUTTON_CLASS, 'h-11')}
              onClick={() => setOpen(false)}
            >
              确认
            </Button>
          </div>
        </div>
      </AppDialog>
    </div>
  );
};

export const BodyScroll: Story = () => {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-4">
      <Button type="button" onClick={() => setOpen(true)}>
        打开长内容
      </Button>
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="长内容滚动"
        width={424}
        bodyScroll
        maxHeight={320}
      >
        <div className="flex flex-col gap-3">
          {Array.from({ length: 12 }, (_, index) => index + 1).map((n) => (
            <div
              key={n}
              className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground"
            >
              滚动块 {n}
            </div>
          ))}
        </div>
      </AppDialog>
    </div>
  );
};
