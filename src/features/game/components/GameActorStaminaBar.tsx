import { useTranslation } from 'react-i18next';

import IconBolt from '@/assets/svg/IconBolt';
import IconHelpCircle from '@/assets/svg/IconHelpCircle';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, formatNumber } from '@/utils';

type GameActorStaminaBarVariant = 'default' | 'warning' | 'empty';

type GameActorStaminaBarProps = {
  stamina?: number;
  staminaLimit?: number;
  showHelp?: boolean;
  boltFirst?: boolean;
  variant?: GameActorStaminaBarVariant;
  className?: string;
};

const STAMINA_BAR_VARIANT_CLASS: Record<
  GameActorStaminaBarVariant,
  { track: string; indicator: string }
> = {
  // Figma 198:44088 / 160:142838 — track secondary-to-primary / fill success·warning
  default: {
    track: 'bg-game-panel-row-surface',
    indicator: 'bg-game-panel-dot-success',
  },
  warning: {
    track: 'bg-game-panel-row-surface',
    indicator: 'bg-warning',
  },
  empty: {
    track: 'bg-game-panel-row-surface',
    indicator: 'bg-transparent',
  },
};

export function GameActorStaminaBar({
  stamina,
  staminaLimit,
  showHelp = false,
  boltFirst = false,
  variant = 'default',
  className,
}: GameActorStaminaBarProps) {
  const { t } = useTranslation();

  const progressValue =
    stamina !== undefined && staminaLimit !== undefined && staminaLimit > 0
      ? Math.min(100, Math.max(0, (stamina / staminaLimit) * 100))
      : undefined;

  const staminaLabel =
    stamina !== undefined && staminaLimit !== undefined
      ? `${formatNumber(stamina, 0)}/${formatNumber(staminaLimit, 0)}`
      : undefined;

  const variantClass = STAMINA_BAR_VARIANT_CLASS[variant];

  const boltIcon = (
    <IconBolt className="size-4 shrink-0 text-game-panel-dot-success" />
  );

  const progressBar = (
    <Progress
      value={progressValue ?? null}
      className="min-w-0 flex-1 gap-0"
      trackClassName={cn(
        // Figma 119:123296 — 轨道 6px 高、全圆角；填充右侧直角由 overflow 裁切
        'h-[6px] rounded-[12px]',
        variantClass.track,
      )}
      indicatorClassName={cn('rounded-none', variantClass.indicator)}
    />
  );

  return (
    <div className={cn('flex w-full items-center gap-1', className)}>
      {boltFirst ? (
        <>
          {boltIcon}
          {progressBar}
        </>
      ) : (
        <>
          {progressBar}
          {boltIcon}
        </>
      )}
      {staminaLabel ? (
        <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
          {staminaLabel}
        </span>
      ) : null}
      {showHelp ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center outline-none"
                aria-label={t('体力机制说明')}
              />
            }
          >
            <IconHelpCircle className="size-4 shrink-0 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="end"
            sideOffset={8}
            className={cn(
              'max-w-[349px] rounded-xl border-0 bg-card p-4',
              'text-xs leading-4 tracking-[0.04px] text-foreground',
              'shadow-[0px_12px_32px_-16px_rgba(0,0,51,0.06),0px_8px_40px_0px_rgba(0,0,0,0.05)]',
              '[&>*:last-child]:bg-card [&>*:last-child]:fill-card',
            )}
          >
            <div className="text-left">
              <p className="mb-0">{t('体力机制：')}</p>
              <p className="mb-0">
                {t(
                  '派遣中的角色每小时消耗 1 点体力。体力耗尽后停止产出，休息时自动恢复。可用 USDC 即时补充体力。',
                )}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
