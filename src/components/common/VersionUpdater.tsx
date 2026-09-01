import { RocketIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

const CHECK_MS = 60_000;
const BUILD_VERSION = import.meta.env.VITE_APP_VERSION?.trim() || 'dev';

const FORCE_SHOW_BANNER = false;

function shouldCheckVersion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;

  return (
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    !hostname.endsWith('.localhost')
  );
}

function reloadWithCacheClear() {
  const reload = () => globalThis.location.reload();

  if ('caches' in globalThis) {
    void caches
      .keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(reload);
    return;
  }

  reload();
}

type VersionUpdateBannerProps = {
  onRefresh: () => void;
  onDismiss: () => void;
  /** 预览时取消 fixed，便于 Ladle 内联展示 */
  inline?: boolean;
};

/** 版本更新提示条（可独立预览） */
export function VersionUpdateBanner({
  onRefresh,
  onDismiss,
  inline = false,
}: VersionUpdateBannerProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-live="polite"
      className={cn(
        // Layout & Positioning
        inline
          ? 'relative w-fit min-w-[333px] max-w-full'
          : cn(
              'fixed right-4 bottom-20 left-4 z-50 md:right-10 md:bottom-5 md:left-auto',
              // 桌面按按钮文案自适应加宽，避免长文案语言撑破
              'md:w-fit md:min-w-[333px] md:max-w-[calc(100vw-5rem)]',
            ),
        // Sizing & Spacing
        'p-4',
        // Visuals
        'rounded-lg bg-background shadow-2xl',
      )}
    >
      <h2 className="mb-6 flex items-center justify-center gap-2 text-center text-lg leading-[26px] font-medium text-foreground md:mb-8">
        <RocketIcon aria-hidden className="size-5 shrink-0" />
        {t('检测到版本更新')}
      </h2>
      <p className="mb-4 text-center text-sm leading-5 text-foreground">
        {t('我们发布了新版本，请刷新页面以获取最新功能与修复。')}
      </p>
      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          onClick={onRefresh}
          className={cn(
            'h-10 flex-1 rounded-lg px-4 whitespace-nowrap',
            'text-sm leading-5 font-medium',
            'bg-foreground text-background hover:bg-foreground/90',
          )}
        >
          {t('立即刷新')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDismiss}
          className={cn(
            'h-10 flex-1 rounded-lg px-4 whitespace-nowrap',
            'text-sm leading-5 font-medium text-foreground',
          )}
        >
          {t('稍后再说')}
        </Button>
      </div>
    </section>
  );
}

export function VersionUpdater() {
  const [visible, setVisible] = useState(FORCE_SHOW_BANNER);
  const hasPromptedRef = useRef(FORCE_SHOW_BANNER);

  const checkVersion = useCallback(async () => {
    if (!shouldCheckVersion() || document.hidden || hasPromptedRef.current) {
      return;
    }

    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { version?: string };
      const serverVersion = data.version?.trim();

      if (serverVersion && serverVersion !== BUILD_VERSION) {
        hasPromptedRef.current = true;
        setVisible(true);
      }
    } catch {
      // 静默忽略，避免影响主流程
    }
  }, []);

  useEffect(() => {
    if (!shouldCheckVersion()) {
      return;
    }

    void checkVersion();

    const intervalId = window.setInterval(() => {
      void checkVersion();
    }, CHECK_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        void checkVersion();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkVersion]);

  if (!visible) {
    return null;
  }

  return (
    <VersionUpdateBanner
      onRefresh={reloadWithCacheClear}
      onDismiss={() => setVisible(false)}
    />
  );
}
