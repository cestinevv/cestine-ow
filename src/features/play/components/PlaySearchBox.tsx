import type { FocusEvent, KeyboardEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconSearch from '@/assets/svg/IconSearch';
import IconX from '@/assets/svg/IconX';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils';

type PlaySearchBoxProps = {
  value: string;
  placeholder?: string;
  variant?: 'hero' | 'mobile' | 'toolbar';
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
};

export function PlaySearchBox({
  value,
  placeholder,
  variant = 'hero',
  autoFocus = false,
  onChange,
  onSubmit,
  onClear,
  onFocus,
  onBlur,
}: PlaySearchBoxProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    onSubmit?.();
  };

  const isHero = variant === 'hero';
  const isToolbar = variant === 'toolbar';
  const isMobile = variant === 'mobile';
  const hasValue = value.trim().length > 0;
  const showHeroActive = isHero && (isFocused || hasValue);

  return (
    <div
      className={cn(
        'flex min-w-0 items-center overflow-hidden',
        isHero
          ? cn(
              'h-11 rounded-full bg-black/15 pl-4 text-white',
              showHeroActive
                ? 'border border-primary'
                : 'border border-transparent',
            )
          : isToolbar
            ? 'h-10 rounded-full border border-site-search-border bg-site-nav-item-active px-4 text-foreground'
            : 'h-10 rounded-md bg-site-nav-item-active px-3 text-foreground shadow-sm',
      )}
    >
      <IconSearch
        aria-hidden
        className={cn(
          'size-5 shrink-0',
          isHero || isToolbar || isMobile ? 'hidden' : 'text-muted-foreground',
        )}
      />
      <Input
        type="text"
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        aria-autocomplete="none"
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          placeholder ?? (isMobile ? t('搜索...') : t('搜索短剧名称或简介'))
        }
        className={cn(
          'h-auto min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none',
          'focus:bg-transparent autofill:bg-transparent',
          '[&:-webkit-autofill]:shadow-[0_0_0_1000px_transparent_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:currentColor]',
          'text-sm leading-5',
          'focus-visible:border-0 focus-visible:ring-0',
          isHero
            ? 'px-0 py-0 text-white placeholder:text-white/70'
            : isToolbar
              ? 'px-0 py-0 text-foreground placeholder:text-muted-foreground'
              : 'px-0 py-0 text-foreground placeholder:text-muted-foreground',
        )}
      />
      {hasValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('清除搜索')}
          onClick={onClear}
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            'size-6 shrink-0 rounded-full p-0',
            isHero
              ? 'mr-2 text-white/80 hover:bg-white/10 hover:text-white'
              : cn(
                  'text-muted-foreground hover:bg-transparent hover:text-foreground',
                  isToolbar && 'mr-3',
                ),
          )}
        >
          <IconX className="size-4" />
        </Button>
      ) : null}
      {isHero ? (
        <Button
          type="button"
          onClick={onSubmit}
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            'h-11 rounded-none px-4 py-3 shadow-none',
            'text-sm leading-5 font-medium text-white',
            showHeroActive
              ? 'gap-1 bg-white/30 hover:bg-white/35'
              : 'w-[52px] bg-transparent hover:bg-transparent',
          )}
        >
          <IconSearch aria-hidden className="size-5" />
          {showHeroActive ? t('搜索') : null}
        </Button>
      ) : null}
      {isToolbar ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onSubmit}
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            'h-auto shrink-0 gap-1 rounded-none p-0 text-sm leading-5 font-medium hover:bg-transparent',
            hasValue
              ? 'text-onestory-brand-red hover:text-onestory-brand-red'
              : 'text-muted-foreground hover:text-onestory-brand-red',
          )}
        >
          <IconSearch aria-hidden className="size-5" />
          {t('搜索')}
        </Button>
      ) : null}
      {isMobile ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onSubmit}
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            'h-auto shrink-0 gap-0 rounded-none p-0 text-sm leading-5 font-medium hover:bg-transparent',
            hasValue
              ? 'text-onestory-brand-red hover:text-onestory-brand-red'
              : 'text-foreground hover:text-foreground',
          )}
        >
          <IconSearch aria-hidden className="size-5" />
          {t('搜索')}
        </Button>
      ) : null}
    </div>
  );
}
