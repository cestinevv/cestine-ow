import type { ReactNode } from 'react';

import { cn } from '@/utils';

export type AppTruncatedTextProps = {
  children: ReactNode;
  className?: string;
  /** 悬停展示全文；未传且 children 为字符串时自动取 children */
  title?: string;
  /** 占位符，等于该值时不展示 title */
  fallback?: string;
};

function resolveTitle(
  children: ReactNode,
  title: string | undefined,
  fallback: string,
): string | undefined {
  if (title !== undefined) {
    return title || undefined;
  }

  if (
    typeof children === 'string' &&
    children !== '' &&
    children !== fallback
  ) {
    return children;
  }

  return undefined;
}

/** `table-fixed` 列内截断时，表头/单元格需附加的 class */
export const TABLE_TRUNCATE_CELL_CLASS = 'max-w-0 overflow-hidden';

export function shouldTruncateTableColumn(
  columnId: string,
  truncateColumnId: string,
): boolean {
  return columnId === truncateColumnId;
}

export function AppTruncatedText({
  children,
  className,
  title,
  fallback = '-',
}: AppTruncatedTextProps) {
  return (
    <span
      className={cn('block min-w-0 truncate', className)}
      title={resolveTitle(children, title, fallback)}
    >
      {children}
    </span>
  );
}
