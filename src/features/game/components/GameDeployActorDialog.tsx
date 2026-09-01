import { useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  getListAllActorsQueryKey,
  getListDeployedActorsQueryKey,
  getListRestActorsQueryKey,
  useDeployActor1,
  useListRestActors,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { PageActorDTO } from '@/api/__generated__/mining/model/pageActorDTO';
import IconBolt from '@/assets/svg/IconBolt';
import IconX from '@/assets/svg/IconX';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_PAGE_SIZE_STRING } from '@/constants';
import {
  getGameActorRowKey,
  getGameActorStaminaLimit,
} from '@/features/game/constants/gameActorConfig';
import { formatGameActorLevelName } from '@/features/game/constants/gameActorLevelFormat';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { useConfigStore } from '@/stores/config';
import { cn, formatNumber } from '@/utils';

type GameDeployActorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatActorCode(actor: ActorDTO): string | undefined {
  if (actor.actorTokenId === undefined) {
    return undefined;
  }

  return `#${formatNumber(actor.actorTokenId, 0)}`;
}

function formatActorMetaLine(
  actor: ActorDTO,
  t: TFunction,
): string | undefined {
  const parts: string[] = [];

  const actorCode = formatActorCode(actor);
  if (actorCode) {
    parts.push(actorCode);
  }

  const levelName = formatGameActorLevelName(t, {
    level: actor.level,
  });
  if (levelName) {
    parts.push(levelName);
  }

  if (actor.level !== undefined) {
    parts.push(`Lv${actor.level}`);
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function formatStaminaLabel(
  actor: ActorDTO,
  staminaLimit: number | undefined,
): string | undefined {
  if (actor.stamina === undefined || staminaLimit === undefined) {
    return undefined;
  }

  return `${formatNumber(actor.stamina, 0)}/${formatNumber(staminaLimit, 0)}`;
}

function getActorListKey(actor: ActorDTO): string {
  return getGameActorRowKey(actor);
}

export function GameDeployActorDialog({
  open,
  onOpenChange,
}: GameDeployActorDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const initConfig = useConfigStore((state) => state.initConfig);
  const staminaLimit = getGameActorStaminaLimit(initConfig ?? undefined);
  const [deployingActorNftId, setDeployingActorNftId] = useState<
    string | undefined
  >();

  const {
    data: restActorsResponse,
    isLoading,
    isError,
  } = useListRestActors(
    { pageNum: '1', pageSize: DEFAULT_PAGE_SIZE_STRING },
    {
      query: {
        enabled: open,
        retry: false,
      },
    },
  );

  const restActors = useMemo(() => {
    const page = unwrapOrvalPayload<PageActorDTO>(restActorsResponse);
    return page?.records ?? [];
  }, [restActorsResponse]);

  // Orval：单人派遣为 useDeployActor1（useDeployActor 现为「派遣所有演员」）
  const deployMutation = useDeployActor1({
    mutation: {
      onSuccess: () => {
        toast.success(t('派遣成功'));
        void queryClient.invalidateQueries({
          queryKey: getListDeployedActorsQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getListRestActorsQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getListAllActorsQueryKey(),
        });
        setDeployingActorNftId(undefined);
        onOpenChange(false);
      },
      onError: () => {
        setDeployingActorNftId(undefined);
      },
    },
  });

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleDeployActor = (actor: ActorDTO) => {
    const actorNftId = actor.actorNftId?.trim();
    if (!actorNftId || deployMutation.isPending) {
      return;
    }

    setDeployingActorNftId(actorNftId);
    deployMutation.mutate({ data: { actorNftId } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        bare
        bodyScroll={false}
        className={cn(
          'flex w-full flex-col overflow-hidden',
          'gap-0 p-0',
          'md:max-w-[424px]',
        )}
      >
        <div
          className={cn(
            'flex min-h-0 w-full flex-1 flex-col',
            'gap-6 p-6',
            'max-h-[var(--app-dialog-max-height,90dvh)]',
          )}
        >
          <header
            className={cn(
              'flex w-full shrink-0 items-start justify-between',
              'gap-4',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogTitle
                className={cn(
                  'm-0 min-w-0 text-left',
                  'text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground',
                )}
              >
                {t('选择派遣角色')}
              </DialogTitle>
              <p
                className={cn(
                  'text-xs leading-4 font-normal tracking-[0.04px]',
                  'text-muted-foreground',
                )}
              >
                {t('选择一位空闲中的角色进行派遣')}
              </p>
            </div>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full"
                >
                  <IconX className="size-6 shrink-0" />
                </Button>
              }
            />
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <AppLoadingContainer
              data={restActors}
              isLoading={isLoading}
              isError={isError}
              minHeight={156}
              emptyDescription={t('暂无可派遣角色')}
            >
              <ul className="flex max-h-[min(360px,50dvh)] flex-col gap-2 overflow-y-auto">
                {restActors.map((actor) => {
                  const listKey = getActorListKey(actor);
                  const actorName = actor.actorName?.trim();
                  const avatarAlt = actorName
                    ? t('{{name}} 的角色头像', { name: actorName })
                    : t('角色头像');
                  const metaLine = formatActorMetaLine(actor, t);
                  const staminaLabel = formatStaminaLabel(actor, staminaLimit);
                  const avatarUrl = actor.avatarUrl?.trim();
                  const actorNftId = actor.actorNftId?.trim();
                  const isDeploying =
                    actorNftId !== undefined &&
                    deployingActorNftId === actorNftId;

                  return (
                    <li key={listKey}>
                      <button
                        type="button"
                        disabled={deployMutation.isPending}
                        onClick={() => handleDeployActor(actor)}
                        className={cn(
                          'flex w-full items-center',
                          'gap-6 p-4',
                          'rounded-2xl border border-border bg-card',
                          'text-left transition-colors',
                          'hover:border-game-deploy-slot-highlight-border hover:bg-game-deploy-slot-highlight-surface',
                          'disabled:cursor-not-allowed disabled:opacity-60',
                          isDeploying &&
                            'border-game-deploy-slot-highlight-border bg-game-deploy-slot-highlight-surface',
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="relative h-[50px] w-[60px] shrink-0 overflow-hidden rounded bg-muted">
                            {avatarUrl ? (
                              <img
                                alt={avatarAlt}
                                src={avatarUrl}
                                className="size-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : null}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            {actorName ? (
                              <span
                                className={cn(
                                  'truncate text-base leading-6 font-bold tracking-normal',
                                  'text-foreground',
                                )}
                              >
                                {actorName}
                              </span>
                            ) : null}
                            {metaLine ? (
                              <span
                                className={cn(
                                  'truncate text-xs leading-4 font-normal tracking-[0.04px]',
                                  'text-muted-foreground',
                                )}
                              >
                                {metaLine}
                              </span>
                            ) : null}
                          </div>

                          {staminaLabel ? (
                            <div className="flex shrink-0 items-center gap-0.5">
                              <IconBolt className="size-4 text-muted-foreground" />
                              <span
                                className={cn(
                                  'text-xs leading-4 font-normal tracking-[0.04px]',
                                  'text-muted-foreground',
                                )}
                              >
                                {staminaLabel}
                              </span>
                            </div>
                          ) : null}

                          {isDeploying ? (
                            <Spinner className="size-4 shrink-0 text-onestory-brand-red" />
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </AppLoadingContainer>

            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-11 w-full rounded-xl',
                'text-sm leading-5 font-bold',
              )}
              onClick={handleCancel}
            >
              {t('关闭')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
