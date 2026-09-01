import { Link, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function NotFound({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="space-y-4 p-4 flex flex-col items-center justify-center min-h-[50vh]">
      <div className="text-muted-foreground text-center">
        {children || <p>{t('您要查找的页面不存在。')}</p>}
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md uppercase font-bold text-sm transition-colors cursor-pointer"
        >
          {t('返回')}
        </button>
        <Link
          to="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md uppercase font-bold text-sm transition-colors no-underline"
        >
          {t('重新开始')}
        </Link>
      </div>
    </div>
  );
}
