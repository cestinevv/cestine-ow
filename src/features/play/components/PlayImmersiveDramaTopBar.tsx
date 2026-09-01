import { useNavigate, useRouter } from '@tanstack/react-router';
import {
  type FocusEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import IconSearch from '@/assets/svg/IconSearch';
import IconX from '@/assets/svg/IconX';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  isSearchKeywordValid,
  normalizeSearchKeyword,
  SEARCH_KEYWORD_MAX_LENGTH,
  SEARCH_KEYWORD_MIN_LENGTH,
  SEARCH_KEYWORD_VALIDATION_TOAST_ID,
} from '@/features/search/searchTypes';
import { cn } from '@/utils';

type PlayImmersiveDramaTopBarProps = {
  onClose: () => void;
  onSearchStart: () => void;
  onSearchError: () => void;
};

/**
 * 短剧二级播放页顶栏 — Figma「web二级视频播放页」102:108964
 * 关闭圆钮 + 半透明搜索条（进入全局搜索的短剧 Tab）。
 * 默认低透明度弱化存在感；指针移入关闭/搜索区域后再提亮。
 */
export function PlayImmersiveDramaTopBar({
  onClose,
  onSearchStart,
  onSearchError,
}: PlayImmersiveDramaTopBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const [isChromeActive, setIsChromeActive] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const isSearchNavigatingRef = useRef(false);

  useEffect(() => {
    setIsHydrated(true);
    void router
      .preloadRoute({
        to: '/search',
        search: { type: 'drama' },
      })
      .catch(() => undefined);
  }, [router]);

  const handleSubmitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('q');
    const normalizedKeyword = normalizeSearchKeyword(
      typeof query === 'string' ? query : '',
    );
    if (!isSearchKeywordValid(normalizedKeyword)) {
      toast.info(t('请输入 2～50 个字符'), {
        id: SEARCH_KEYWORD_VALIDATION_TOAST_ID,
      });
      return;
    }
    if (isSearchNavigatingRef.current) {
      return;
    }

    isSearchNavigatingRef.current = true;
    onSearchStart();
    void navigate({
      to: '/search',
      search: { q: normalizedKeyword, type: 'drama' },
    }).catch(() => {
      isSearchNavigatingRef.current = false;
      onSearchError();
    });
  };

  // 移入关闭/搜索热区时提亮
  const handleChromeActivate = () => {
    setIsChromeActive(true);
  };

  // 离开热区且未聚焦搜索时恢复淡态
  const handleChromeDeactivate = () => {
    setIsChromeActive(false);
  };

  const handleSearchFocus = () => {
    setIsChromeActive(true);
  };

  const handleSearchBlur = (event: FocusEvent<HTMLInputElement>) => {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Element &&
      nextTarget.closest('[data-play-immersive-top-chrome]')
    ) {
      return;
    }

    setIsChromeActive(false);
  };

  return (
    <header
      className={cn(
        // Layout — Figma pl32 / pt32；相对播放器绝对定位
        'pointer-events-none absolute inset-x-0 top-0 z-40',
        'flex items-center',
        // Spacing
        'gap-8 px-8 pt-8',
      )}
    >
      {/* 仅左上角关闭+搜索为热区，不监听整块播放区 */}
      <div
        data-play-immersive-top-chrome
        onPointerEnter={handleChromeActivate}
        onPointerLeave={handleChromeDeactivate}
        className={cn(
          // Layout
          'pointer-events-auto flex items-center',
          // Spacing
          'gap-8',
          // State — 默认很淡，移入后提亮
          'transition-opacity duration-200',
          isChromeActive ? 'opacity-100' : 'opacity-35',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          aria-label={t('关闭')}
          className={cn(
            // Layout
            'flex size-16 shrink-0 items-center justify-center',
            // Visual — 外圈 white-alpha/8 + 内钮 color20%
            'rounded-full border border-white/60 p-[13px]',
            'bg-[rgba(119,119,119,0.25)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)]',
            // State
            'hover:bg-[rgba(119,119,119,0.35)] hover:text-white',
          )}
        >
          <IconX className="size-9 text-white" />
        </Button>

        <form
          action="/search"
          method="get"
          noValidate={isHydrated}
          onSubmit={handleSubmitSearch}
          className={cn(
            // Layout
            'flex h-auto w-[282px] items-center justify-between',
            // Spacing
            'gap-2 overflow-hidden rounded-full px-4 py-2.5',
            // Visual
            'border border-white/60 bg-[rgba(119,119,119,0.25)]',
            'shadow-[0_1px_8px_0_rgba(0,0,0,0.08)]',
          )}
        >
          <input type="hidden" name="type" value="drama" />
          <Input
            type="text"
            name="q"
            required
            minLength={SEARCH_KEYWORD_MIN_LENGTH}
            maxLength={SEARCH_KEYWORD_MAX_LENGTH}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder={t('搜索...')}
            className={cn(
              'h-auto min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 shadow-none',
              'text-sm leading-5 font-medium text-white',
              'placeholder:text-white/60',
              'focus-visible:border-0 focus-visible:ring-0',
            )}
          />
          <Button
            type="submit"
            variant="ghost"
            className={cn(
              'inline-flex h-auto shrink-0 items-center gap-1 p-0',
              'text-sm leading-5 font-medium text-white/60',
              'hover:bg-transparent hover:text-white',
            )}
          >
            <IconSearch className="size-5" />
            {t('搜索')}
          </Button>
        </form>
      </div>
    </header>
  );
}
