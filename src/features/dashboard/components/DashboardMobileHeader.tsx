import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

export function DashboardMobileHeader() {
  const { t } = useTranslation();
  const router = useRouter();

  // 移动端返回上一页；无历史记录时回到首页。
  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
      return;
    }

    void router.navigate({ to: '/' });
  };

  return (
    <header
      className={cn(
        'flex h-11 w-full items-center justify-between px-4 bg-points-page-surface-muted',
        'md:hidden',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 rounded-none p-0 text-foreground hover:bg-transparent hover:text-foreground"
          onClick={handleBack}
          aria-label={t('返回')}
        >
          <IconChevronLeft aria-hidden className="size-6" />
        </Button>
      </div>
      <p className="min-w-0 flex-1 text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
        {t('平台资金看板')}
      </p>
      <div className="flex min-w-0 flex-1 justify-end" aria-hidden />
    </header>
  );
}
