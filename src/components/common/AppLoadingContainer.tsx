import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import IconNoData from '@/assets/svg/IconNoData';
import { Spinner } from '@/components/ui/spinner';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/utils';

function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return `${value}px`;
  }

  return value;
}

type AppLoadingContainerProps<T = unknown> = {
  /**
   * 列表数据。
   * - 未传 `isLoading` 时：`null` 表示加载中（兼容旧写法）。
   * - 推荐联调显式传 `isLoading`，并将本字段稳定为 `readonly T[]`（加载中可传 `[]`）。
   */
  data: readonly T[] | null;
  /**
   * 是否展示整块加载态（Spinner）。与 TanStack Query 首屏无缓存时的 `isLoading` 语义对齐。
   * - `true`：强制加载中（即使 `data` 非空也不渲染 `children`）。
   * - `false`：不进入加载态，仅由 `data` 区分空列表与有数据。
   * - `undefined`：若 `data === null` 则视为加载中，否则按数组长度判断。
   */
  isLoading?: boolean;
  /**
   * 是否展示错误态。
   */
  isError?: boolean;
  minHeight?: number | string;
  maxHeight?: number | string;
  children: ReactNode;
  /** 完整空态内容覆盖；用于需要还原业务 Figma 结构的页面 */
  emptyContent?: ReactNode;
  /** 空态展示覆盖；不传则使用 i18n 默认「暂无数据」 */
  emptyDescription?: ReactNode;
  /** 空态文案下方的操作区（如加号跳转按钮）；传入时空态布局对齐候场侧栏紧凑样式 */
  emptyAction?: ReactNode;
  /** loading / error / empty 状态容器样式覆盖 */
  stateClassName?: string;
  /**
   * 是否作为 TableBody 内容渲染，如果为 true，将使用 TableRow 和 TableCell 包裹状态，保留外部表头
   */
  asTable?: boolean;
  /**
   * 如果 asTable 为 true，必传，当前表格的总列数
   */
  colSpan?: number;
  /**
   * 是否在容器内嵌套 `overflow-auto` 滚动区。
   * 卡片网格等依赖整卡 `transform` 悬停抬升时须为 `false`，避免 `overflow-hidden` 裁切位移。
   */
  scrollable?: boolean;
};

export default function AppLoadingContainer<T = unknown>({
  data,
  isLoading,
  isError,
  minHeight,
  maxHeight,
  children,
  emptyContent,
  emptyDescription,
  emptyAction,
  stateClassName,
  asTable = false,
  colSpan,
  scrollable = true,
}: AppLoadingContainerProps<T>) {
  const { t } = useTranslation();

  const minHeightCss = toCssSize(minHeight) ?? `300px`;
  const maxHeightCss = toCssSize(maxHeight);

  const rootStyle: CSSProperties = {
    minHeight: minHeightCss,
    ...(maxHeightCss ? { maxHeight: maxHeightCss } : {}),
  };

  const showLoading =
    isLoading === true || (isLoading === undefined && data === null);
  const rows = data ?? [];
  const hasRows = !showLoading && !isError && rows.length > 0;

  if (hasRows) {
    if (asTable) {
      return <>{children}</>;
    }
    if (!scrollable) {
      return (
        <div className={cn('flex w-full min-w-0 flex-col')} style={rootStyle}>
          {children}
        </div>
      );
    }

    return (
      <div
        className={cn(
          // Layout & Positioning
          'flex w-full min-w-0 flex-col overflow-hidden',
        )}
        style={rootStyle}
      >
        <div
          className={cn(
            // Layout & Positioning
            'min-h-0 w-full flex-1 overflow-auto',
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  const content = (
    <section
      className={cn(
        // Layout & Positioning
        'flex w-full min-w-0 flex-1 flex-col items-center justify-center',
        // Spacing
        'gap-2',
        stateClassName,
      )}
      // minHeight 须落在状态层，loading Spinner / 空态才能在整块区域内垂直居中
      style={rootStyle}
    >
      {showLoading ? (
        <Spinner className="size-6 text-foreground" strokeWidth={2.75} />
      ) : isError ? (
        <p
          className={cn(
            // Layout & Positioning
            'max-w-sm text-balance text-center',
            // Visual & Typography
            asTable
              ? 'text-[13px] leading-[18px] text-history-table-header'
              : 'text-sm text-muted-foreground md:text-base',
          )}
        >
          {t('加载失败')}
        </p>
      ) : emptyContent ? (
        emptyContent
      ) : emptyAction ? (
        <div
          className={cn(
            'flex min-h-0 w-full flex-1 flex-col items-center justify-center',
            'gap-3',
          )}
        >
          <div className="flex w-20 flex-col items-center">
            <IconNoData className="size-20 shrink-0" />
            <p className="w-full text-center text-xs leading-[18px] text-muted-foreground">
              {emptyDescription ?? t(asTable ? '暂无记录' : '暂无数据')}
            </p>
          </div>
          {emptyAction}
        </div>
      ) : (
        <>
          <IconNoData className="size-22 shrink-0" />
          <p
            className={cn(
              // Layout & Positioning
              'max-w-sm text-balance text-center',
              // Visual & Typography
              asTable
                ? 'text-[13px] leading-[18px] text-history-table-header'
                : 'text-sm text-muted-foreground md:text-base',
            )}
          >
            {emptyDescription ?? t(asTable ? '暂无记录' : '暂无数据')}
          </p>
        </>
      )}
    </section>
  );

  if (asTable) {
    return (
      <TableRow className={cn('border-0', 'hover:bg-transparent')}>
        <TableCell colSpan={colSpan} className={cn('p-0 align-middle')}>
          {content}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div
      className={cn(
        // Layout & Positioning
        'flex w-full min-w-0 flex-col overflow-hidden',
      )}
      style={rootStyle}
    >
      {content}
    </div>
  );
}
