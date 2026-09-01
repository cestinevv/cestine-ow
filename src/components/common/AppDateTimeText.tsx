import dayjs from 'dayjs';
import type { ReactNode } from 'react';

import { cn, formatDateFromMillisecond } from '@/utils';

type AppDateTimeTextLayout = 'inline' | 'responsive-split';

export type AppDateTimeTextProps = {
  /** 毫秒时间戳（与 `formatDateFromMillisecond` 一致） */
  value?: string | number | null;
  /** dayjs 格式串，默认 `YYYY-MM-DD HH:mm:ss` */
  pattern?: string;
  /** 无效或缺失时的展示文案 */
  fallback?: ReactNode;
  /** `inline` 单行；`responsive-split` 为 `<lg` 日期/时间分行，`lg+` 同行且固定间距 */
  layout?: AppDateTimeTextLayout;
  className?: string;
  /** 有效值时是否渲染语义化 `<time>` */
  asTime?: boolean;
};

function parseMilliseconds(
  value: string | number | null | undefined,
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const ms = Number(value);
  if (!Number.isFinite(ms)) {
    return undefined;
  }

  return ms;
}

export function AppDateTimeText({
  value,
  pattern = 'YYYY-MM-DD HH:mm:ss',
  fallback = '-',
  layout = 'inline',
  className,
  asTime = true,
}: AppDateTimeTextProps) {
  const ms = parseMilliseconds(value);

  if (ms === undefined) {
    return <span className={className}>{fallback}</span>;
  }

  const formatted = formatDateFromMillisecond(ms, pattern);
  const dateTimeAttr = dayjs(ms).toISOString();
  const Tag = asTime ? 'time' : 'span';

  if (layout === 'inline' || !formatted.includes(' ')) {
    return (
      <Tag
        className={cn('block min-w-0 whitespace-nowrap', className)}
        dateTime={asTime ? dateTimeAttr : undefined}
      >
        {formatted}
      </Tag>
    );
  }

  const spaceIndex = formatted.indexOf(' ');
  const datePart = formatted.slice(0, spaceIndex);
  const timePart = formatted.slice(spaceIndex + 1);

  if (!timePart) {
    return (
      <Tag
        className={cn('block min-w-0 whitespace-nowrap', className)}
        dateTime={asTime ? dateTimeAttr : undefined}
      >
        {formatted}
      </Tag>
    );
  }

  return (
    <Tag
      className={cn(
        'flex min-w-0 flex-col gap-0',
        'lg:flex-row lg:items-baseline lg:gap-1',
        className,
      )}
      dateTime={asTime ? dateTimeAttr : undefined}
    >
      <span className="whitespace-nowrap">{datePart}</span>
      <span className="whitespace-nowrap">{timePart}</span>
    </Tag>
  );
}
