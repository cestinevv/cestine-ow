import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTheme } from 'next-themes';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconCircleCheck from '@/assets/svg/IconCircleCheck';
import IconLanguage from '@/assets/svg/IconLanguage';
import IconMoreArrow from '@/assets/svg/IconMoreArrow';
import IconPencil from '@/assets/svg/IconPencil';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn, normalizeLocale, syncLocaleToCookie } from '@/utils';

import { MobileDrawerSubpage } from './MobileDrawerSubpage';
import {
  type MobileSettingsDrawerSide,
  type MobileSettingsPage,
  requestMobileSettingsDrawerRestore,
} from './mobileSettingsDrawerRestore';
import { SUPPORTED_LANGUAGES } from './supportedLanguages';

type MobileSettingsFlowProps = {
  drawerSide: MobileSettingsDrawerSide;
  initialPage?: MobileSettingsPage;
  onBack: () => void;
};

/** 移动设置子页链路：设置 → 语言 → 语言选择。 */
export function MobileSettingsFlow({
  drawerSide,
  initialPage = 'settings',
  onBack,
}: MobileSettingsFlowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();
  const { i18n, t } = useTranslation();
  const darkModeSwitchId = useId();
  const [page, setPage] = useState<MobileSettingsPage>(initialPage);
  const activeLocale = normalizeLocale(i18n.language);
  const isDarkTheme = resolvedTheme === 'dark';

  const handleLanguagePageOpen = () => {
    setPage('language');
  };

  const handleLanguagePageBack = () => {
    setPage('settings');
  };

  const handleDarkModeCheckedChange = (checked: boolean) => {
    requestMobileSettingsDrawerRestore(drawerSide, 'settings');
    setTheme(checked ? 'dark' : 'light');
  };

  const handleLanguageSelect = (localeKey: string) => {
    const locale = normalizeLocale(localeKey);
    if (locale === activeLocale) {
      return;
    }

    requestMobileSettingsDrawerRestore(drawerSide, 'language');
    void (async () => {
      await i18n.changeLanguage(locale);
      syncLocaleToCookie(locale);
      await queryClient.invalidateQueries();
      await router.invalidate();
    })();
  };

  if (page === 'language') {
    return (
      <MobileDrawerSubpage titleKey="语言" onBack={handleLanguagePageBack}>
        <div className="flex flex-col" role="radiogroup" aria-label={t('语言')}>
          {SUPPORTED_LANGUAGES.map((language) => {
            const isSelected = activeLocale === language.key;

            return (
              <Button
                key={language.key}
                type="button"
                variant="ghost"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleLanguageSelect(language.key)}
                className={cn(
                  'h-12 w-full justify-between rounded-none border-x-0 border-t-0 border-b border-border px-0',
                  'text-sm leading-5 font-normal text-foreground',
                  'hover:bg-muted hover:text-foreground focus-visible:border-border focus-visible:bg-muted focus-visible:ring-0 focus-visible:outline-none',
                )}
              >
                <span>{language.label}</span>
                <IconCircleCheck
                  selected={isSelected}
                  className="size-6 shrink-0"
                />
              </Button>
            );
          })}
        </div>
      </MobileDrawerSubpage>
    );
  }

  return (
    <MobileDrawerSubpage titleKey="设置" onBack={onBack}>
      <div className="flex h-14 w-full items-center gap-4 border-x-0 border-t-0 border-b border-border">
        <IconPencil className="size-6 shrink-0 text-foreground" />
        <label
          htmlFor={darkModeSwitchId}
          className="min-w-0 flex-1 cursor-pointer text-base leading-6 font-[510] text-foreground"
        >
          {t('深色模式')}
        </label>
        <Switch
          id={darkModeSwitchId}
          checked={isDarkTheme}
          onCheckedChange={handleDarkModeCheckedChange}
          className={cn(
            'h-6 w-10 data-[size=default]:h-6 data-[size=default]:w-10',
            'data-checked:bg-site-settings-switch-checked',
            'data-unchecked:bg-wallet-switch-track-unchecked',
            '*:data-[slot=switch-thumb]:size-[21px]',
            '*:data-[slot=switch-thumb]:bg-site-settings-switch-thumb!',
            'dark:*:data-[slot=switch-thumb]:bg-site-settings-switch-thumb!',
          )}
          aria-label={t('深色模式')}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={handleLanguagePageOpen}
        className={cn(
          'h-14 w-full justify-start gap-4 rounded-none border-x-0 border-t-0 border-b border-border px-0',
          'text-base leading-6 font-[510] text-foreground',
          'hover:bg-muted hover:text-foreground focus-visible:border-border focus-visible:bg-muted focus-visible:ring-0 focus-visible:outline-none',
        )}
      >
        <IconLanguage aria-hidden className="size-6 shrink-0 text-foreground" />
        <span className="min-w-0 flex-1 text-left">{t('语言')}</span>
        <IconMoreArrow className="h-5 w-2.5 shrink-0 text-muted-foreground" />
      </Button>
    </MobileDrawerSubpage>
  );
}
