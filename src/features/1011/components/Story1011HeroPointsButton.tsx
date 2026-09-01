import { useTranslation } from 'react-i18next';

import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import { formatNumber } from '@/utils/formatNumber';

import { story1011Media } from '../constants/story1011Media';

type Story1011HeroPointsButtonProps = {
  totalPoints: number | undefined;
  onClick: () => void;
  /**
   * chip：磨砂信息卡内（桌面 / `<lg`）
   * inline：保留给旧移动行内样式
   */
  variant?: 'chip' | 'inline';
};

/** Hero 积分区：金币与数字；「积分」+ 箭头打开流水 — Figma 7785:94225 / 7785:94341 */
export function Story1011HeroPointsButton({
  totalPoints,
  onClick,
  variant = 'chip',
}: Story1011HeroPointsButtonProps) {
  const { t } = useTranslation();
  const isChip = variant === 'chip';

  return (
    <div
      className={cn(
        'inline-flex w-fit items-center',
        // 积分行 fill 在稿面 visible:false；H5 gap 6px — Figma 7785:94341
        isChip && 'gap-1.5 drop-shadow-[0_0_16px_rgba(0,0,0,0.2)]',
        variant === 'inline' && 'gap-1.5',
      )}
    >
      <img
        src={story1011Media.pointsCoin}
        alt=""
        width={34}
        height={34}
        className="size-[34px] object-cover"
      />
      <span
        className={cn(
          'flex items-baseline whitespace-nowrap',
          isChip ? 'gap-1.5' : 'gap-2',
        )}
      >
        <span
          className={cn(
            'font-bold tabular-nums',
            isChip
              ? 'text-[30px] leading-9 tracking-[-0.12px] text-foreground'
              : 'text-sm leading-5 tracking-[-0.04px] text-white',
          )}
        >
          {/* 未拿到积分时按产品约定展示 0，避免 Hero 出现占位横杠 */}
          {formatNumber(totalPoints ?? 0)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onClick}
          className={cn(
            'inline-flex h-auto min-h-0 shrink-0 items-center gap-0 px-0 py-0',
            'hover:bg-transparent',
            isChip
              ? 'text-foreground/72 hover:text-foreground'
              : 'text-white/72 hover:text-white',
          )}
        >
          <span className="text-xs leading-4 tracking-[0.04px]">
            {t('积分')}
          </span>
          <IconChevronLeft
            className="-ml-0.5 size-[18px] shrink-0 rotate-180"
            aria-hidden
          />
        </Button>
      </span>
    </div>
  );
}
