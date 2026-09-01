import { reportError } from '@amazing-socrates/telemetry-kit';
import type { ErrorComponentProps } from '@tanstack/react-router';
import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  useEffect(() => {
    reportError(error, { category: 'component' });
  }, [error]);

  console.error(error);

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <ErrorComponent error={error} />
      <div className="flex gap-2 items-center flex-wrap">
        <button
          type="button"
          onClick={() => {
            void router.invalidate();
          }}
          className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md uppercase font-bold text-sm transition-colors cursor-pointer"
        >
          {t('再试一次')}
        </button>
        {isRoot ? (
          <Link
            to="/"
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md uppercase font-bold text-sm transition-colors no-underline"
          >
            {t('首页')}
          </Link>
        ) : (
          <button
            type="button"
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md uppercase font-bold text-sm transition-colors cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
          >
            {t('返回')}
          </button>
        )}
      </div>
    </div>
  );
}
