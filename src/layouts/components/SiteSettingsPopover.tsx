import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

import IconLanguage from '@/assets/svg/IconLanguage';
import IconPencil from '@/assets/svg/IconPencil';
import IconSiteNavSettings from '@/assets/svg/IconSiteNavSettings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useAppBreakpoints } from '@/hooks/useAppBreakpoints';
import { cn, normalizeLocale, syncLocaleToCookie } from '@/utils';

import { SUPPORTED_LANGUAGES } from './supportedLanguages';

type SiteSettingsPopoverProps = {
  className?: string;
};

/**
 * 侧栏设置：触发 → 设置浮层 → 深色模式行 / 语言 Sub → 相邻语言列表。
 * 结构与数值对齐 Figma 655:76680（暗色：white-to-secondary #212225）。
 */
export function SiteSettingsPopover({ className }: SiteSettingsPopoverProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setTheme, resolvedTheme } = useTheme();
  const { isUpLg } = useAppBreakpoints();
  const activeLocale = normalizeLocale(i18n.language);
  const isDarkTheme = resolvedTheme === 'dark';

  // ≥lg（1024.5）展开侧栏：稿面第一层在「设置」正上方；窄侧栏仍向右展开
  const isExpandedSideNav = isUpLg;

  // 触发条件：点击深色模式行整行
  const handleThemeToggleClick = () => {
    setTheme(isDarkTheme ? 'light' : 'dark');
  };

  // 触发条件：直接拨动 Switch
  const handleDarkModeCheckedChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  // 触发条件：语言列表选中项；切换后刷新 Accept-Language 相关缓存
  const handleLanguageSelect = (localeKey: string) => () => {
    const lng = normalizeLocale(localeKey);
    if (activeLocale === lng) {
      return;
    }

    void (async () => {
      await i18n.changeLanguage(lng);
      syncLocaleToCookie(lng);
      await queryClient.invalidateQueries();
      await router.invalidate();
    })();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className={cn(
              // Layout & Positioning
              'flex h-10 w-full items-center rounded-xl',
              // Spacing
              'justify-center gap-0 p-2 lg:justify-start lg:gap-3 lg:px-4 lg:py-2',
              // Visual
              'text-wallet-text-secondary',
              // State
              'hover:bg-site-nav-item-active hover:text-foreground',
              className,
            )}
            aria-label={t('设置')}
          >
            <IconSiteNavSettings className="size-6 shrink-0" />
            <span className="hidden truncate text-base leading-6 font-medium lg:block">
              {t('设置')}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent
        // 定位 — Figma 655:76680：展开侧栏时第一层贴「设置」正上方；窄侧栏向右
        side={isExpandedSideNav ? 'top' : 'right'}
        align={isExpandedSideNav ? 'start' : 'end'}
        sideOffset={8}
        collisionPadding={12}
        collisionAvoidance={
          isExpandedSideNav
            ? {
                // 上方空间充足：保持 top/start，贴住「设置」
                side: 'none',
                align: 'none',
                fallbackAxisSide: 'none',
              }
            : {
                side: 'none',
                align: 'shift',
                fallbackAxisSide: 'none',
              }
        }
        className={cn(
          // Layout — 固定宽覆盖默认 w-(--anchor-width)
          'flex w-[220px] min-w-[220px] flex-col overflow-hidden',
          // Spacing
          'gap-0 p-0',
          // Visual — Figma 655:76323：rounded 12 + white-to-secondary + 双层阴影
          'rounded-xl border-0 bg-site-settings-panel-surface',
          'shadow-[0_12px_32px_-16px_rgb(0_0_51/6%),0_8px_40px_0_rgb(0_0_0/5%)]',
        )}
      >
        <DropdownMenuItem
          closeOnClick={false}
          className={cn(
            // Layout
            'relative flex w-full cursor-pointer items-center',
            // Spacing — 行内 p16 / gap16
            'gap-4 rounded-none p-4',
            // Visual — 16/24 / weight 510
            'text-base leading-6 font-[510] text-foreground',
            // State
            'focus:bg-site-settings-lang-selected-bg',
          )}
          onClick={handleThemeToggleClick}
        >
          <IconPencil className="size-6 shrink-0" />
          <span className="min-w-0 flex-1">{t('深色模式')}</span>
          <Switch
            checked={isDarkTheme}
            onCheckedChange={handleDarkModeCheckedChange}
            onClick={(event) => {
              event.stopPropagation();
            }}
            className={cn(
              // Figma Switch：约 39.5×24，thumb ≈ 21；开态轨 Text/primary、钮 white-to-dark
              'h-6 w-10 data-[size=default]:h-6 data-[size=default]:w-10',
              'data-checked:bg-site-settings-switch-checked',
              'data-unchecked:bg-wallet-switch-track-unchecked',
              '*:data-[slot=switch-thumb]:size-[21px]',
              '*:data-[slot=switch-thumb]:bg-site-settings-switch-thumb!',
              'dark:*:data-[slot=switch-thumb]:bg-site-settings-switch-thumb!',
            )}
            aria-label={t('深色模式')}
          />
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(
              // Layout
              'flex w-full cursor-pointer items-center',
              // Spacing — 与深色模式行同级 p16 / gap16
              'gap-4 rounded-none p-4',
              // Visual
              'text-base leading-6 font-[510] text-foreground',
              // State — 覆盖默认 sm 样式
              'focus:bg-site-settings-lang-selected-bg data-open:bg-site-settings-lang-selected-bg data-popup-open:bg-site-settings-lang-selected-bg',
              '[&_svg:not([class*=size-])]:size-6',
            )}
          >
            <IconLanguage className="size-6 shrink-0" />
            <span className="min-w-0 flex-1">{t('语言')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            // 定位 — Figma：语言列表在第一层右侧，底边对齐（L 形）
            side="right"
            align="end"
            alignOffset={0}
            sideOffset={8}
            collisionPadding={12}
            collisionAvoidance={{
              side: 'none',
              align: 'shift',
              fallbackAxisSide: 'none',
            }}
            className={cn(
              // Layout — Figma 语言列表 width 288
              'flex w-72 max-h-[400px] flex-col overflow-y-auto',
              // Spacing — padding 17 / 内部 gap 4
              'gap-1 p-[17px]',
              // Visual — Figma 550:81129 white-to-secondary + border tertiary
              'rounded-xl border border-border bg-site-settings-panel-surface',
              'shadow-[0_12px_32px_-16px_rgb(0_0_51/6%),0_8px_40px_0_rgb(0_0_0/5%)]',
              // 覆盖 SubContent 默认 ring / 锚定宽度
              'ring-0',
            )}
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <DropdownMenuCheckboxItem
                key={language.key}
                closeOnClick={activeLocale !== language.key}
                checked={activeLocale === language.key}
                className={cn(
                  // Layout
                  'relative flex w-full items-center justify-start',
                  // Spacing — 选中项 padding 12
                  'gap-3 rounded-lg p-3',
                  // Visual — 16/24；选中底 thirdly / dark secondary
                  'text-base leading-6 font-[510] text-site-settings-lang-selected-fg',
                  // State
                  'focus:bg-site-settings-lang-selected-bg focus:text-site-settings-lang-selected-fg',
                  '**:data-[slot=dropdown-menu-checkbox-item-indicator]:right-3',
                  '[&_svg]:size-[12px]',
                  activeLocale === language.key &&
                    'bg-site-settings-lang-selected-bg',
                )}
                onClick={handleLanguageSelect(language.key)}
              >
                {language.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
