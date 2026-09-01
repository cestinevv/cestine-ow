import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconChevronDown from '@/assets/svg/IconChevronDown';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

import { WHITEPAPER_TOC_KEYS } from '../whitepaperToc';

const MOBILE_TOC_STICKY_GAP = 16;

function getStickyTop(): number {
  const header = document.querySelector(
    'header.sticky.top-0',
  ) as HTMLElement | null;

  return (header?.offsetHeight ?? 72) + MOBILE_TOC_STICKY_GAP;
}

type Props = {
  activeTocIndex: number;
  onNavigate: (index: number) => void;
};

export function WhitepaperMobileToc({ activeTocIndex, onNavigate }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [stickyTop, setStickyTop] = useState(88);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const syncStickyTop = () => {
      setStickyTop(getStickyTop());
    };

    syncStickyTop();
    window.addEventListener('resize', syncStickyTop);

    return () => {
      window.removeEventListener('resize', syncStickyTop);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleToggleOpen = () => {
    setOpen((previous) => !previous);
  };

  const handleSelectSection = (index: number) => () => {
    onNavigate(index);
    setOpen(false);
  };

  const activeLabel = t(
    WHITEPAPER_TOC_KEYS[activeTocIndex] ?? WHITEPAPER_TOC_KEYS[0],
  );

  return (
    <nav
      ref={navRef}
      aria-label={t('白皮书目录')}
      className={cn(
        // Layout & Positioning
        'sticky z-40 mb-8 w-full self-start md:hidden',
      )}
      style={{ top: stickyTop }}
    >
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          onClick={handleToggleOpen}
          aria-expanded={open}
          aria-haspopup="true"
          className={cn(
            // Layout & Positioning
            'flex h-12 w-full items-center justify-between',
            // Spacing
            'gap-2.5 px-4 py-3',
            // Visual
            'rounded-xl border border-border bg-background/40 text-left shadow-none backdrop-blur-[7.5px]',
            // State
            'hover:bg-background/60',
          )}
        >
          <span className="min-w-0 flex-1 text-base leading-6 font-bold text-foreground">
            {activeLabel}
          </span>
          <IconChevronDown
            className={cn(
              'size-6 shrink-0 text-foreground transition-transform duration-200',
              open ? 'rotate-180' : '',
            )}
          />
        </Button>

        {open ? (
          <ul
            aria-label={t('白皮书目录')}
            className={cn(
              // Layout & Positioning
              'absolute inset-x-0 top-full z-50 mt-1.5 flex flex-col',
              // Spacing
              'gap-5 p-4',
              // Visual
              'rounded-xl border border-border bg-background shadow-[3px_4px_12px_0_rgb(0_0_0/0.08)]',
            )}
          >
            {WHITEPAPER_TOC_KEYS.map((item, index) => (
              <li key={item}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSelectSection(index)}
                  className={cn(
                    // Layout & Positioning
                    'h-auto w-full min-w-0 items-start justify-start',
                    // Spacing
                    'p-0',
                    // Visual
                    'whitespace-normal text-left text-base leading-6 break-words',
                    // State
                    'hover:bg-transparent',
                    index === activeTocIndex
                      ? 'font-medium text-foreground'
                      : 'font-normal text-muted-foreground hover:text-muted-foreground',
                  )}
                >
                  {t(item)}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </nav>
  );
}
