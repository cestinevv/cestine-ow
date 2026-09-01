import type { ActorCollectionInfoResponse } from '@/api/__generated__/story/model/actorCollectionInfoResponse';
import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import { ActorDetailRouteLink } from '@/components/common/ActorDetailRouteLink';
import {
  getPlayDramaActors,
  getRoleAvatarFallback,
  type PlayDramaActorInfo,
} from '@/features/play/playFormat';
import { cn } from '@/utils';

type PlayDramaCardActorsProps = {
  /** 与列表接口 `actorCollections` 一致，展示角色合集而非角色 */
  actorCollections?: ActorCollectionInfoResponse[];
  item?: Pick<DramaListItemResponse, 'actorCollections'>;
  size?: 'sm' | 'md' | 'banner';
  className?: string;
};

const ACTOR_SIZE_CLASS = {
  sm: 'size-6',
  md: 'size-6',
  banner: 'size-8 md:size-10',
} as const;

export function PlayDramaCardActors({
  actorCollections,
  item,
  size = 'md',
  className,
}: PlayDramaCardActorsProps) {
  const actors = getPlayDramaActors({
    actorCollections: actorCollections ?? item?.actorCollections,
  });
  const sizeClass = ACTOR_SIZE_CLASS[size];
  const imageSize = size === 'banner' ? 40 : 24;

  if (actors.length === 0) {
    return null;
  }

  return (
    <ul className={cn('flex list-none gap-1.5 p-0', className)}>
      {actors.map((actor, index) => {
        const content = (
          <ActorAvatar
            actor={actor}
            imageSize={imageSize}
            sizeClass={sizeClass}
          />
        );
        const key = actor.id ?? actor.avatar ?? actor.name ?? index;

        return (
          <li key={key} className="shrink-0">
            {actor.id ? (
              <ActorDetailRouteLink
                actorId={actor.id}
                aria-label={actor.name}
                title={actor.name}
                className={cn(
                  'block rounded-full',
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
  );
}

function ActorAvatar({
  actor,
  imageSize,
  sizeClass,
}: {
  actor: PlayDramaActorInfo;
  imageSize: number;
  sizeClass: string;
}) {
  if (actor.avatar) {
    return (
      <img
        alt=""
        src={actor.avatar}
        width={imageSize}
        height={imageSize}
        loading="lazy"
        decoding="async"
        className={cn('rounded-full object-cover', sizeClass)}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        'onestory-bg-brand-gradient text-xs font-bold text-white',
        sizeClass,
      )}
    >
      {getRoleAvatarFallback(actor.name)}
    </span>
  );
}
