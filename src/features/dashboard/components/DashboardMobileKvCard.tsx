import type { ReactNode } from 'react';

import { cn } from '@/utils';

export type DashboardMobileKvRow = {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
};

type DashboardMobileKvCardProps = {
  rows: readonly DashboardMobileKvRow[];
  className?: string;
  isLast?: boolean;
};

export function DashboardMobileKvCard({
  rows,
  className,
  isLast = false,
}: DashboardMobileKvCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col',
        !isLast && 'border-b-[0.5px] border-border pb-3',
        className,
      )}
    >
      {rows.map((row) => (
        <div
          key={typeof row.label === 'string' ? row.label : String(row.label)}
          className="flex items-center justify-between py-1"
        >
          <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            {row.label}
          </span>
          <span
            className={cn(
              'min-w-0 text-right text-xs leading-4 font-medium tracking-[0.04px] text-foreground',
              row.valueClassName,
            )}
          >
            {row.value}
          </span>
        </div>
      ))}
    </article>
  );
}
