import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import IconChevronDown from '@/assets/svg/IconChevronDown';
import { cn } from '@/utils';

const GROUP_TITLE_CLASS = cn(
  'm-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px]',
  'text-foreground',
);

const FAQ_TITLE_CLASS = cn(
  'm-0 min-w-0 flex-1 text-left text-sm leading-5 font-bold tracking-normal',
  'text-foreground',
);

const BODY_TEXT_CLASS = 'm-0 text-sm leading-5 tracking-normal text-foreground';
const MUTED_TEXT_CLASS =
  'm-0 text-sm leading-5 tracking-normal text-muted-foreground';

const CALLOUT_CLASS = cn('rounded-2xl bg-mining-card-surface p-4');

const EXAMPLE_CALLOUT_CLASS = cn(
  'flex flex-col gap-4 rounded-xl bg-mining-rules-example-surface p-4',
);

const TABLE_WRAP_CLASS = cn(
  'grid w-full overflow-hidden rounded-xl border-[0.5px] border-border',
);

const TABLE_HEADER_CELL_CLASS = cn(
  'flex h-14 min-w-0 items-center px-4',
  'bg-[color:var(--mining-divider-border)]',
  'text-xs leading-4 font-medium tracking-[0.04px] text-muted-foreground',
);

const TABLE_BODY_CELL_CLASS = cn(
  'flex min-h-[52px] min-w-0 items-center px-4 py-4',
  'border-t-[0.5px] border-border',
  'text-sm leading-5 text-muted-foreground',
);

function getTableCellBorderClass(columnIndex: number) {
  return columnIndex > 0 ? 'border-l-[0.5px] border-border' : undefined;
}

export function MiningRulesGroupTitle({ children }: { children: ReactNode }) {
  return <h3 className={GROUP_TITLE_CLASS}>{children}</h3>;
}

export function MiningRulesCallout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(CALLOUT_CLASS, className)}>{children}</div>;
}

export function MiningRulesExampleBlock({
  titleKey,
  body,
}: {
  titleKey: string;
  body: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className={EXAMPLE_CALLOUT_CLASS}>
      <p className="m-0 text-sm leading-5 font-bold text-foreground">
        {t(titleKey)}
      </p>
      <div className={BODY_TEXT_CLASS}>{body}</div>
    </div>
  );
}

type MiningRulesTableProps = {
  headerKeys: readonly string[];
  rows: readonly (readonly string[])[];
  renderCell?: (
    cellKey: string,
    columnIndex: number,
    rowIndex: number,
  ) => ReactNode;
};

export function MiningRulesTable({
  headerKeys,
  rows,
  renderCell,
}: MiningRulesTableProps) {
  const { t } = useTranslation();

  return (
    <div
      className={TABLE_WRAP_CLASS}
      style={{
        gridTemplateColumns: `repeat(${headerKeys.length}, minmax(0, 1fr))`,
      }}
    >
      {headerKeys.map((headerKey, columnIndex) => (
        <div
          key={headerKey}
          className={cn(
            TABLE_HEADER_CELL_CLASS,
            getTableCellBorderClass(columnIndex),
          )}
        >
          {t(headerKey)}
        </div>
      ))}
      {rows.map((row, rowIndex) =>
        headerKeys.map((headerKey, columnIndex) => {
          const cellKey = row[columnIndex] ?? '';
          const cellContent = renderCell
            ? renderCell(cellKey, columnIndex, rowIndex)
            : t(cellKey);

          return (
            <div
              key={`${headerKey}-${String(rowIndex)}-${String(columnIndex)}`}
              className={cn(
                TABLE_BODY_CELL_CLASS,
                getTableCellBorderClass(columnIndex),
              )}
            >
              {cellContent}
            </div>
          );
        }),
      )}
    </div>
  );
}

type MiningRulesFaqItemProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
};

export function MiningRulesFaqItem({
  title,
  open,
  onToggle,
  children,
}: MiningRulesFaqItemProps) {
  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className={FAQ_TITLE_CLASS}>{title}</span>
        <IconChevronDown
          className={cn(
            'size-6 shrink-0 text-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <div className="flex w-full flex-col gap-3">{children}</div>
      ) : null}
    </div>
  );
}

export { BODY_TEXT_CLASS, MUTED_TEXT_CLASS };
