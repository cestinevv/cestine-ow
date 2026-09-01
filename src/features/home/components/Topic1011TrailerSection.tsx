import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import IconPlay from '@/assets/svg/IconPlay';
import { ContentContainer } from '@/components/common/ContentContainer';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

import { topic1011Media } from '../topic1011Media';

export function Topic1011TrailerSection() {
  const { t } = useTranslation();

  // 预告片尚未上线，点击提示即将推出
  function handlePlayTrailerClick() {
    toast.info(t('即将推出'));
  }

  return (
    <section
      className={cn(
        // Layout
        'relative w-full overflow-hidden',
        // Visual
        'bg-topic-1011-surface',
      )}
    >
      <img
        src={topic1011Media.snowflake}
        alt=""
        className="pointer-events-none absolute top-20 left-16 hidden size-[72px] md:block"
      />
      <img
        src={topic1011Media.snowflake}
        alt=""
        className="pointer-events-none absolute right-8 bottom-24 hidden size-[82px] md:block"
      />

      <ContentContainer
        className={cn(
          // Layout
          'relative z-10 flex flex-col items-center',
          // Spacing — 移动 py-8 gap-4；桌面 gap-16 py-16
          'gap-4 py-8',
          'md:gap-16 md:py-16',
        )}
      >
        <header className="flex w-full flex-col items-center gap-3 md:gap-4">
          <p
            className={cn(
              'w-full text-center font-bold text-foreground',
              'text-sm leading-5',
              'md:text-xl md:leading-7 md:font-medium',
            )}
          >
            {t('定调之作')}
          </p>
          <h2
            className={cn(
              'w-full text-center font-bold text-foreground',
              'text-lg leading-[26px] tracking-[-0.04px]',
              'md:text-[40px] md:leading-none md:tracking-normal',
            )}
          >
            《1011》
          </h2>
          <p
            className={cn(
              'w-full text-center whitespace-pre-wrap text-muted-foreground',
              'text-sm leading-5',
              'md:text-xl md:leading-7',
            )}
          >
            {t('接下来的故事 由你们来讲')}
          </p>
        </header>

        <div
          className={cn(
            // Layout
            'relative w-full overflow-hidden',
            // Sizing — 移动固定 231；桌面随图
            'h-[231px] md:h-auto',
            // Visual
            'rounded-xl md:rounded-3xl',
          )}
        >
          <img
            src={topic1011Media.trailerPoster}
            alt=""
            width={1744}
            height={754}
            className="absolute inset-0 size-full object-cover object-bottom md:static md:block md:h-auto md:w-full"
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <div className="px-4 py-3 md:p-5">
              <p
                className={cn(
                  'font-bold text-white text-shadow-[0px_0px_2px_rgba(0,0,0,0.3)]',
                  'text-sm leading-5',
                  'md:text-[30px] md:leading-9 md:text-shadow-sm',
                )}
              >
                1011
              </p>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('播放预告片')}
                onClick={handlePlayTrailerClick}
                className={cn(
                  // Layout
                  'pointer-events-auto flex items-center justify-center rounded-full',
                  // Spacing — 移动约 44；桌面 88
                  'size-11 p-3.5 md:size-[88px] md:p-[26px]',
                  // Visual
                  'border border-white bg-white/15 text-white backdrop-blur-[5px] md:backdrop-blur-[10px]',
                  // State
                  'hover:bg-white/20 hover:opacity-90',
                )}
              >
                <IconPlay className="size-[18px] md:size-9" />
              </Button>
            </div>
            {/* 进度条仅桌面稿有 */}
            <div className="hidden bg-gradient-to-b from-transparent to-black/40 p-5 md:block">
              <div className="flex items-center justify-between text-xs leading-4 text-white">
                <span>00:05</span>
                <span>1:30:00</span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden bg-white/40">
                <div className="h-full w-[12%] rounded-full bg-white" />
              </div>
            </div>
            {/* 移动端占位，保持播放钮垂直居中 */}
            <div className="h-11 md:hidden" aria-hidden />
          </div>
        </div>
      </ContentContainer>
    </section>
  );
}
