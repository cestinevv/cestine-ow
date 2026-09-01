import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import IconTrash from '@/assets/svg/IconTrash';
import IconX from '@/assets/svg/IconX';
import { Button } from '@/components/ui/button';
import { PlaySearchBox } from '@/features/play/components/PlaySearchBox';
import {
  clearSearchHistory,
  readSearchHistory,
  removeSearchHistory,
  SEARCH_HISTORY_CHANGE_EVENT,
} from '@/features/search/searchHistory';
import { cn } from '@/utils';

type SearchFieldProps = {
  value: string;
  variant: 'mobile' | 'toolbar';
  autoFocus?: boolean;
  placeholder?: string;
  validationVisible: boolean;
  onChange: (value: string) => void;
  onSubmit: (keyword?: string) => void;
  onClear: () => void;
};

export function SearchField({
  value,
  variant,
  autoFocus = false,
  placeholder,
  validationVisible,
  onChange,
  onSubmit,
  onClear,
}: SearchFieldProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const isMobile = variant === 'mobile';

  useEffect(() => {
    const handleHistoryChange = () => setHistory(readSearchHistory());
    handleHistoryChange();
    window.addEventListener(SEARCH_HISTORY_CHANGE_EVENT, handleHistoryChange);
    window.addEventListener('storage', handleHistoryChange);

    return () => {
      window.removeEventListener(
        SEARCH_HISTORY_CHANGE_EVENT,
        handleHistoryChange,
      );
      window.removeEventListener('storage', handleHistoryChange);
    };
  }, []);

  const showHistory =
    isFocused && !value.trim() && !validationVisible && history.length > 0;

  const handleHistoryRemove = (keyword: string) => {
    setHistory(removeSearchHistory(keyword));
  };

  const handleHistoryClear = () => {
    setHistory(clearSearchHistory());
    toast.success(t('搜索历史已清空'));
  };

  return (
    <div className="relative w-full">
      <PlaySearchBox
        value={value}
        variant={variant}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={onChange}
        onSubmit={() => onSubmit()}
        onClear={onClear}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {validationVisible ? (
        <p className="absolute top-full left-3 z-50 mt-1 hidden text-xs leading-4 text-destructive md:block">
          {t('请输入 2～50 个字符')}
        </p>
      ) : null}

      {showHistory ? (
        <section
          className={cn(
            'z-40 flex flex-col overflow-hidden',
            isMobile
              ? 'fixed inset-x-0 top-12 bottom-0 gap-4 bg-background px-2 py-3'
              : cn(
                  'absolute top-full right-0 left-0 mt-2 max-h-72 rounded-2xl py-2',
                  'border-[0.5px] border-border bg-card shadow-[0_1px_8px_rgba(0,0,0,0.08)]',
                ),
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between text-base leading-6 text-muted-foreground',
              isMobile ? 'px-2 pt-2' : 'px-4 pt-2 pb-4',
            )}
          >
            <h2 className="font-normal">{t('最近搜索')}</h2>
            <Button
              type="button"
              variant="ghost"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleHistoryClear}
              className="h-auto gap-1 rounded p-0 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <IconTrash className="size-5" />
              {t('清空历史')}
            </Button>
          </div>

          <ul
            className={cn(
              'min-h-0 overflow-y-auto [scrollbar-width:thin]',
              '[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full',
              isMobile
                ? cn(
                    '-mx-2 w-[calc(100%+1rem)] flex-1 [scrollbar-color:var(--muted-foreground)_transparent]',
                    '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/70',
                  )
                : cn(
                    'border-t-[0.5px] border-border/60 [scrollbar-gutter:stable] [scrollbar-color:var(--border)_transparent]',
                    '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:border-y-2 [&::-webkit-scrollbar-thumb]:border-transparent',
                    '[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:bg-clip-padding',
                  ),
            )}
          >
            {history.map((item) => (
              <li
                key={item}
                className={cn(
                  'group/history-row flex h-11 items-center',
                  isMobile
                    ? 'mx-2 border-t-[0.5px] border-border/60'
                    : 'rounded hover:bg-muted',
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSubmit(item)}
                  className={cn(
                    'h-full min-w-0 flex-1 justify-start truncate rounded-none text-base leading-6 font-normal text-foreground hover:bg-transparent',
                    isMobile ? 'px-2' : 'px-4',
                  )}
                >
                  <span className="truncate">{item}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleHistoryRemove(item)}
                  aria-label={t('删除搜索记录')}
                  className={cn(
                    'mr-2 shrink-0 rounded p-0 text-muted-foreground',
                    isMobile ? 'size-5' : 'size-6',
                    'hover:bg-transparent hover:text-onestory-brand-red active:text-onestory-brand-red',
                    'md:group-hover/history-row:text-onestory-brand-red',
                  )}
                >
                  <IconX className="size-5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
