import { useTranslation } from 'react-i18next';
import type { RoleInfo } from '@/api/legacy/storyCompatModels';
import { ActorDetailRouteLink } from '@/components/common/ActorDetailRouteLink';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePlayRoleActorAvatars } from '@/features/play/hooks/usePlayRoleActorAvatars';
import { getRoleAvatarFallback } from '@/features/play/playFormat';
import { cn } from '@/utils';

/** 稿面前三位主要角色展示品牌色描边头像（Figma 4970:26233） */
const PLAY_DETAIL_HIGHLIGHTED_ROLE_COUNT = 3;

type PlayDetailCharactersSectionProps = {
  roles?: RoleInfo[];
  className?: string;
};

export function PlayDetailCharactersSection({
  roles = [],
  className,
}: PlayDetailCharactersSectionProps) {
  const { t } = useTranslation();
  const { roleDisplays } = usePlayRoleActorAvatars(roles);

  if (roles.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="play-detail-roles-heading"
      className={cn('flex flex-col gap-4', className)}
    >
      <h2
        id="play-detail-roles-heading"
        className={cn(
          'text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground',
        )}
      >
        {t('主要角色')}
      </h2>
      <ul
        className={cn(
          'flex list-none gap-6 overflow-x-auto p-0 py-0.5',
          'lg:gap-8 lg:overflow-visible lg:py-0',
        )}
      >
        {roles.map((role, index) => {
          const roleKey = role.id ?? role.name ?? index;
          const display = roleDisplays[index];
          const displayName = display.isPending
            ? t('待定演员')
            : display.actorName?.trim();
          const subtitle = display.roleName
            ? t('饰 {{name}}', { name: display.roleName })
            : undefined;
          const avatarFallbackLabel = display.isPending
            ? t('待定演员')
            : displayName;
          const isHighlighted = index < PLAY_DETAIL_HIGHLIGHTED_ROLE_COUNT;
          const showAvatarRing = isHighlighted && !display.isPending;
          const content = (
            <>
              <div
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full',
                  showAvatarRing && 'p-0.5',
                )}
              >
                <Avatar
                  className={cn(
                    'size-14 lg:size-[100px]',
                    showAvatarRing && 'ring-2 ring-brand',
                  )}
                >
                  {display.avatar ? (
                    <AvatarImage src={display.avatar} alt="" />
                  ) : null}
                  <AvatarFallback className="text-sm text-foreground">
                    {getRoleAvatarFallback(avatarFallbackLabel)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div
                className={cn(
                  'flex w-full min-w-0 flex-col items-center gap-1 text-center',
                )}
              >
                {displayName ? (
                  <h3
                    className={cn(
                      'w-full truncate text-sm font-bold leading-5',
                      showAvatarRing ? 'text-brand' : 'text-muted-foreground',
                    )}
                  >
                    {displayName}
                  </h3>
                ) : null}
                {subtitle ? (
                  <p
                    className={cn(
                      'w-full truncate text-xs leading-4 text-muted-foreground',
                    )}
                  >
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </>
          );

          return (
            <li
              key={roleKey}
              className={cn(
                'flex w-[72px] shrink-0 flex-col items-center gap-2',
                'lg:w-[100px]',
              )}
            >
              {display.actorId ? (
                <ActorDetailRouteLink
                  actorId={display.actorId}
                  className={cn(
                    'flex w-full flex-col items-center gap-2',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  {content}
                </ActorDetailRouteLink>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
