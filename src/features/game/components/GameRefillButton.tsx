import { useTranslation } from 'react-i18next';

import IconSquarePlus from '@/assets/svg/IconSquarePlus';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useIsActorStaminaSyncing } from '@/features/game/gameActorStaminaCache';
import { cn } from '@/utils';

type GameRefillButtonProps = {
  actorNftId?: string;
  isStaminaFull: boolean;
  onClick: () => void;
  /** 派遣卡窄屏：&lt;1024 仅显示稿面 square-plus icon（Figma 249:44221） */
  iconOnlyBelowLg?: boolean;
};

/** 与派遣卡「休息」同款描边按钮 */
const REFILL_OUTLINE_BUTTON_CLASS = cn(
  'h-9 flex-1 rounded-xl border-[1.5px] border-game-header-action-border bg-transparent px-3',
  'text-sm leading-5 font-medium text-game-header-title',
  'hover:bg-game-header-action-hover hover:text-game-header-title',
  'disabled:opacity-60',
);

export function GameRefillButton({
  actorNftId,
  isStaminaFull,
  onClick,
  iconOnlyBelowLg = false,
}: GameRefillButtonProps) {
  const { t } = useTranslation();
  const isStaminaSyncing = useIsActorStaminaSyncing(actorNftId);
  const isDisabled = isStaminaFull || isStaminaSyncing;

  const handleClick = () => {
    if (isDisabled) {
      return;
    }

    onClick();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={isDisabled}
      aria-label={iconOnlyBelowLg ? t('补充') : undefined}
      className={cn(
        REFILL_OUTLINE_BUTTON_CLASS,
        // 稿面以 1024 为分界：窄屏 icon-only，略收水平内边距
        iconOnlyBelowLg && 'max-lg:px-2',
      )}
      onClick={handleClick}
    >
      {isStaminaSyncing ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner className="size-4" />
          {iconOnlyBelowLg ? (
            <span className="max-lg:hidden">{t('补充')}</span>
          ) : (
            <span>{t('补充')}</span>
          )}
        </span>
      ) : iconOnlyBelowLg ? (
        <>
          <IconSquarePlus className="size-5 lg:hidden" />
          <span className="max-lg:hidden">{t('补充')}</span>
        </>
      ) : (
        t('补充')
      )}
    </Button>
  );
}
