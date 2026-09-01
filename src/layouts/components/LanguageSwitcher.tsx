import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import IconLanguage from '@/assets/svg/IconLanguage';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppBreakpoints } from '@/hooks/useAppBreakpoints';
import { cn, normalizeLocale, syncLocaleToCookie } from '@/utils';

import { SUPPORTED_LANGUAGES } from './supportedLanguages';

type LanguageSwitcherProps = {
  id?: string;
  triggerClassName?: string;
};

export default function LanguageSwitcher({
  id,
  triggerClassName,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const { isMatchMobile } = useAppBreakpoints();
  const activeLocale = normalizeLocale(i18n.language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            id={id}
            type="button"
            className={cn(
              'inline-flex items-center justify-center rounded-full text-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              isMatchMobile ? 'size-8 p-1.5' : 'p-2',
              triggerClassName,
            )}
            aria-label={t('语言')}
          >
            <IconLanguage
              className={cn(isMatchMobile ? 'size-5' : 'size-4.5')}
            />
          </button>
        }
      />
      <DropdownMenuContent
        align={isMatchMobile ? 'center' : 'end'}
        sideOffset={8}
        className={cn(
          // Layout & Positioning
          'w-fit max-w-[calc(100vw-2rem)] space-y-1 md:w-72 md:max-w-72',
          // Sizing & Spacing
          'p-3 md:p-4',
          // Visuals & Typography
          'rounded-2xl border border-language-switcher-border bg-popover shadow-[0_12px_32px_-16px_rgb(0_0_51/6%),0_8px_40px_0_rgb(0_0_0/5%)]',
        )}
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuCheckboxItem
            key={l.key}
            closeOnClick={activeLocale !== l.key}
            checked={activeLocale === l.key}
            className={cn(
              // Layout & Positioning
              'relative flex w-full items-center justify-start',
              // Sizing & Spacing
              'min-h-10 px-3 py-2 md:min-h-12 md:py-3',
              // Visuals & Typography
              'rounded-lg bg-transparent text-sm leading-4.5 font-medium text-language-switcher-item md:leading-5',
              // Interactions & States
              'focus:bg-language-switcher-active-bg focus:text-language-switcher-active [&_svg]:size-3',
              '**:data-[slot=dropdown-menu-checkbox-item-indicator]:right-3',
              activeLocale === l.key &&
                'bg-language-switcher-active-bg font-semibold text-language-switcher-active',
            )}
            onClick={() => {
              const lng = normalizeLocale(l.key);
              if (activeLocale === lng) {
                return;
              }
              void (async () => {
                await i18n.changeLanguage(lng);
                syncLocaleToCookie(lng);
                // Accept-Language 已更新，失效缓存以拉取本地化接口数据
                await queryClient.invalidateQueries();
                await router.invalidate();
              })();
            }}
          >
            {l.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
