import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { RoleInfo } from '@/api/legacy/storyCompatModels';
import storyfunEmptyUrl from '@/assets/figma/profile-moderation/storyfun-blocked-empty.svg';
import IconChevronDown from '@/assets/svg/IconChevronDown';
import IconPlus from '@/assets/svg/IconPlus';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePlayRoleActorAvatars } from '@/features/play/hooks/usePlayRoleActorAvatars';
import {
  getPlayRoleBoundActor,
  getRoleAvatarFallback,
} from '@/features/play/playFormat';
import { openRouteInNewTab } from '@/routing/newTabRouteLink';
import { cn, formatNumber } from '@/utils';

type PlayImmersiveCharacterTabProps = {
  roles?: RoleInfo[];
};

/** Figma 2400:152777 — 沉浸播放右栏「角色」Tab 空态（story默认空状态） */
function PlayImmersiveCharacterEmptyState() {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        // Figma 2400:152396 — 空态靠上，距「签约更多角色 IP」区顶 111px，水平居中
        'flex min-h-0 w-full flex-1 flex-col items-center',
        'px-4 pt-[111px]',
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src={storyfunEmptyUrl}
          alt=""
          className="size-[68px] shrink-0"
          aria-hidden
        />
        <p className="m-0 text-center text-sm leading-5 text-muted-foreground">
          {t('暂未绑定角色IP')}
        </p>
      </div>
    </div>
  );
}

/** Figma 31:8996 / 2400:152777 — 沉浸播放右栏「角色」Tab，数据来自短剧详情 roles */
export function PlayImmersiveCharacterTab({
  roles = [],
}: PlayImmersiveCharacterTabProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { roleDisplays } = usePlayRoleActorAvatars(roles);
  const isEmpty = roles.length === 0;

  const handleOpenActorPlaza = () => {
    void router.navigate({ to: '/actor' });
  };

  const handleOpenActor = (actorId: string) => {
    openRouteInNewTab(router, {
      to: '/actor/$actorId',
      params: { actorId },
    });
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-secondary">
      <div className="shrink-0 p-4">
        <Button
          type="button"
          variant="ghost"
          onClick={handleOpenActorPlaza}
          className={cn(
            'flex h-auto w-full items-center justify-between rounded-xl border-[0.5px] border-border p-3',
            'bg-card text-foreground hover:bg-muted',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <IconPlus className="size-4" />
            </span>
            <span className="truncate text-[15px] leading-5.5 font-medium">
              {t('签约更多角色 IP')}
            </span>
          </span>
          <IconChevronDown className="size-8 shrink-0 -rotate-90 text-muted-foreground" />
        </Button>
      </div>

      {isEmpty ? (
        <PlayImmersiveCharacterEmptyState />
      ) : (
        <ul className="m-0 flex min-h-0 list-none flex-col gap-5 overflow-y-auto px-4 pb-4">
          {roles.map((role, index) => {
            const display = roleDisplays[index];
            const isPending = display.isPending;
            const actorId = display.actorId;
            const actorName = display.actorName?.trim() || t('待定演员');
            const roleName = display.roleName?.trim();

            const computingPower = getPlayRoleBoundActor(role)?.computingPower;
            const roleKey = role.id ?? role.name ?? index;

            return (
              <li
                key={roleKey}
                className="flex w-full items-start justify-between gap-3"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar
                    className={cn(
                      'size-10 shrink-0',
                      !isPending && 'border-[1.5px] border-warning',
                    )}
                  >
                    {display.avatar ? (
                      <AvatarImage src={display.avatar} alt="" />
                    ) : null}
                    <AvatarFallback className="bg-card text-sm text-foreground">
                      {getRoleAvatarFallback(actorName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <p className="m-0 min-w-0 wrap-break-word text-[15px] leading-5.5 text-foreground">
                      <span>{actorName}</span>
                      {roleName ? (
                        <>
                          {' '}
                          <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                            {t('饰 {{name}}', { name: roleName })}
                          </span>
                        </>
                      ) : null}
                    </p>
                    {typeof computingPower === 'number' &&
                    Number.isFinite(computingPower) &&
                    !isPending ? (
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[34px] bg-card px-1.5 py-0.5',
                          'text-[13px] leading-[18px] text-warning',
                        )}
                      >
                        {t('片酬 {{amount}} STORY/h', {
                          amount: formatNumber(computingPower, 4),
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>

                {!isPending && actorId ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      handleOpenActor(actorId);
                    }}
                    className={cn(
                      'h-8 shrink-0 rounded-full px-3 py-1.5 text-[13px] leading-4.5 font-normal',
                      'bg-foreground text-background hover:bg-foreground/80',
                    )}
                  >
                    {t('签约')}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
