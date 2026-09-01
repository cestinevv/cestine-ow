import { useTheme } from 'next-themes';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { cn } from '@/utils';

/** 高于 Dialog(z-50) / 播放层(z-200) / Sheet(z-210)，保证 Toast 永远在最顶层 */
const TOASTER_Z_INDEX = 9999;

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  const [toastRoot, setToastRoot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setToastRoot(document.body);
  }, []);

  if (!toastRoot) {
    return null;
  }

  return createPortal(
    <Sonner
      theme={(resolvedTheme as ToasterProps['theme']) ?? 'dark'}
      position="top-center"
      richColors={false}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'border-border bg-card text-foreground [&_[data-icon]]:text-foreground data-[type=success]:[&_[data-icon]]:text-success data-[type=error]:[&_[data-icon]]:text-destructive data-[type=warning]:[&_[data-icon]]:text-warning data-[type=info]:[&_[data-icon]]:text-sky-600',
          title: 'text-foreground',
          description: 'text-muted-foreground',
          closeButton: 'border-border bg-card text-foreground hover:bg-muted',
          actionButton: 'bg-foreground text-background hover:bg-foreground/90',
          cancelButton: 'bg-muted text-foreground hover:bg-muted/80',
        },
      }}
      {...props}
      className={cn('z-[9999]', props.className)}
      style={{ ...props.style, zIndex: TOASTER_Z_INDEX }}
    />,
    toastRoot,
  );
}

export { Toaster };
