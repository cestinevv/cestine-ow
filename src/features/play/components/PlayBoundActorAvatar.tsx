import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getRoleAvatarFallback } from '@/features/play/playFormat';
import { cn } from '@/utils';

type PlayBoundActorAvatarProps = {
  avatar?: string;
  name?: string;
  className?: string;
};

/** 已绑定演员头像。 */
export function PlayBoundActorAvatar({
  avatar,
  name,
  className,
}: PlayBoundActorAvatarProps) {
  return (
    <Avatar className={cn('size-8', className)}>
      {avatar ? <AvatarImage alt="" src={avatar} /> : null}
      <AvatarFallback className="text-xs font-bold text-white">
        {getRoleAvatarFallback(name)}
      </AvatarFallback>
    </Avatar>
  );
}
