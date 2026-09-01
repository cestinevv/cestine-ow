import type { ReactNode } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/utils';

type GameDialogSubmitLabelProps = {
  isPending: boolean;
  children: ReactNode;
  className?: string;
};

/** 弹窗主操作按钮提交态，与 ActorSignDialog「确认签约」一致 */
export function GameDialogSubmitLabel({
  isPending,
  children,
  className,
}: GameDialogSubmitLabelProps) {
  if (!isPending) {
    return children;
  }

  return (
    <span
      className={cn('inline-flex items-center justify-center gap-2', className)}
    >
      <Spinner className="size-4" />
      <span>{children}</span>
    </span>
  );
}
