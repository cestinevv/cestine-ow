import { cn } from '@/utils';

type PageTitleSectionProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

/**
 * 页面正标题 + 可选副标题（发布页、表单页标题区等共用）。
 */
export function PageTitleSection({
  title,
  subtitle,
  className,
}: PageTitleSectionProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <h1
        className={cn(
          'text-[26px] leading-8 font-bold tracking-[-0.08px] text-foreground',
          'md:text-[30px] md:leading-9 md:tracking-[-0.12px]',
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm leading-5 text-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
