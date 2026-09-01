import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

type DashboardPreviewSectionHeaderProps = {
  title: ReactNode;
  actionLabel: string;
  onAction: () => void;
  className?: string;
};

export function DashboardPreviewSectionHeader({
  title,
  actionLabel,
  onAction,
  className,
}: DashboardPreviewSectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <h3 className="min-w-0 text-base leading-5 font-bold text-foreground md:text-lg md:leading-[26px]">
        {title}
      </h3>
      <Button
        type="button"
        variant="outline"
        className="h-8 shrink-0 rounded-full px-4 text-sm leading-5 font-bold text-foreground md:h-11 md:px-6"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
