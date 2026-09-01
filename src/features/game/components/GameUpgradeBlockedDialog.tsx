import { useNavigate, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { resolveActorDetailRouteId } from '@/features/game/constants/gameActorNft';
import type { GameActorUpgradeRequirementState } from '@/features/game/getGameActorUpgradeRequirementState';
import { openRouteInNewTab } from '@/routing/newTabRouteLink';
import { cn, formatNumber } from '@/utils';

type GameUpgradeBlockedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 跳转前关闭本弹窗与上层「升级角色」列表弹窗 */
  onNavigateAway?: () => void;
  actor: ActorDTO | null;
  requirement: GameActorUpgradeRequirementState | null;
};

function formatActorTitle(actor: ActorDTO): string {
  const name = actor.actorName?.trim() ?? '';
  const code =
    actor.actorTokenId !== undefined
      ? `#${formatNumber(actor.actorTokenId, 0)}`
      : '';

  return `${name}${code ? ` ${code}` : ''}`.trim();
}

export function GameUpgradeBlockedDialog({
  open,
  onOpenChange,
  onNavigateAway,
  actor,
  requirement,
}: GameUpgradeBlockedDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();

  const actorDetailId = actor
    ? resolveActorDetailRouteId({
        actorNftId: actor.actorNftId,
        actorCollectionId: actor.actorCollectionId,
      })
    : undefined;
  const showHeatBlock = Boolean(requirement && !requirement.isHeatMet);
  const showMaterialBlock = Boolean(requirement && !requirement.isMaterialMet);
  const actorTitle = actor ? formatActorTitle(actor) : '';

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleLeave = () => {
    if (onNavigateAway) {
      onNavigateAway();
      return;
    }

    onOpenChange(false);
  };

  // 看参演短剧 / 去获取角色 → /actor/$actorId（演员详情）
  const handleWatchDrama = () => {
    if (!actorDetailId) {
      return;
    }

    openRouteInNewTab(router, {
      to: '/actor/$actorId',
      params: { actorId: actorDetailId },
    });
    handleLeave();
  };

  // 去创作短剧 → /create
  const handleCreateDrama = () => {
    void navigate({ to: '/create' });
    handleLeave();
  };

  const handleGetActor = () => {
    if (!actorDetailId) {
      return;
    }

    openRouteInNewTab(router, {
      to: '/actor/$actorId',
      params: { actorId: actorDetailId },
    });
    handleLeave();
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('升级 {{name}}', { name: actorTitle })}
      hideHeader
      width={400}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      <div className="flex flex-col gap-6">
        <header className="text-center">
          <h2 className="m-0 text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('升级 {{name}}', { name: actorTitle })}
          </h2>
        </header>

        {showHeatBlock ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-5 font-bold text-foreground">
                {t('还需 {{count}} 完播', {
                  count: formatNumber(requirement?.heatRemaining ?? 0, 0),
                })}
              </p>
              <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                {t('观看该角色参演的短剧，或为它创作新剧，都可提升完播')}
              </p>
            </div>
            <Button
              type="button"
              className={cn(
                'h-9 w-full rounded-xl',
                'bg-foreground text-background',
                'text-sm leading-5 font-bold',
                'hover:bg-foreground/90 hover:text-background',
              )}
              disabled={!actorDetailId}
              onClick={handleWatchDrama}
            >
              {t('看参演短剧')}
            </Button>
            <Button
              type="button"
              className={cn(
                'h-9 w-full rounded-xl',
                'bg-foreground text-background',
                'text-sm leading-5 font-bold',
                'hover:bg-foreground/90 hover:text-background',
              )}
              onClick={handleCreateDrama}
            >
              {t('去创作短剧')}
            </Button>
          </div>
        ) : null}

        {showMaterialBlock ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-5 font-bold text-foreground">
                {t('还需 {{count}} 张同IP同等级角色', {
                  count: formatNumber(requirement?.materialRemaining ?? 0, 0),
                })}
              </p>
              <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                {t('去角色主页签约更多「{{name}}」', {
                  name: actor?.actorName?.trim() ?? '',
                })}
              </p>
            </div>
            <Button
              type="button"
              className={cn(
                'h-9 w-full rounded-xl',
                'bg-foreground text-background',
                'text-sm leading-5 font-bold',
                'hover:bg-foreground/90 hover:text-background',
              )}
              disabled={!actorDetailId}
              onClick={handleGetActor}
            >
              {t('去获取角色')}
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
          onClick={handleClose}
        >
          {t('关闭')}
        </Button>
      </div>
    </AppDialog>
  );
}
