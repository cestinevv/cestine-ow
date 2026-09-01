import type { PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';

import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

type GameDeployCarouselEdgeNavProps = {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** Figma 266:50846「左右切换」— 半透明圆角角标，随溢出滚动显隐 */
const EDGE_NAV_BUTTON_CLASS = cn(
  // Sizing & Spacing
  'size-11 shrink-0 rounded-full p-2.5',
  // Visuals & Typography — Figma overlays black-alpha/3 + white-alpha/3 + blur
  'border border-white/15 bg-black/15 text-white shadow-[0_0_32px_rgba(0,0,0,0.2)] backdrop-blur-[10px]',
  // Interactions & States
  'hover:bg-black/25 hover:text-white',
  'focus-visible:ring-2 focus-visible:ring-ring',
);

/** 定位壳只负责 translate，避免与 backdrop-blur 叠在同一节点导致命中区域漂移 */
const EDGE_NAV_POSITION_CLASS = cn(
  // Layout & Positioning
  'pointer-events-auto absolute top-1/2 -translate-y-1/2',
);

export function GameDeployCarouselEdgeNav({
  canScrollPrev,
  canScrollNext,
  onPrev,
  onNext,
}: GameDeployCarouselEdgeNavProps) {
  const { t } = useTranslation();

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const handlePrevClick = () => {
    onPrev();
  };

  const handleNextClick = () => {
    onNext();
  };

  if (!canScrollPrev && !canScrollNext) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={cn(
        // Layout & Positioning
        'pointer-events-none absolute inset-0 z-20',
      )}
    >
      {canScrollPrev ? (
        <div className={cn(EDGE_NAV_POSITION_CLASS, 'left-0')}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('向左查看派遣角色')}
            onPointerDown={handlePointerDown}
            onClick={handlePrevClick}
            className={EDGE_NAV_BUTTON_CLASS}
          >
            <IconChevronLeft className="size-6" />
          </Button>
        </div>
      ) : null}
      {canScrollNext ? (
        <div className={cn(EDGE_NAV_POSITION_CLASS, 'right-0')}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('向右查看派遣角色')}
            onPointerDown={handlePointerDown}
            onClick={handleNextClick}
            className={EDGE_NAV_BUTTON_CLASS}
          >
            <IconChevronLeft className="size-6 rotate-180" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
