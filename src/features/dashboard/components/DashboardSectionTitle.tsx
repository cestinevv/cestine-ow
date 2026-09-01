import { cn } from '@/utils';

type DashboardSectionTitleProps = {
  title: string;
  className?: string;
};

export function DashboardSectionTitle({
  title,
  className,
}: DashboardSectionTitleProps) {
  return (
    <h2
      className={cn(
        // Layout
        'border-l-2 border-primary px-2 md:border-l-4 md:pl-2',
        // Visual
        'text-sm leading-5 font-bold tracking-[-0.04px] text-foreground md:text-[22px] md:leading-7',
        className,
      )}
    >
      {title}
    </h2>
  );
}
