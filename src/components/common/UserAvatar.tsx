import { cn, formatUserAvatar } from '@/utils';

interface UserAvatarProps {
  userId: string;
  size?: number;
  className?: string;
  alt?: string;
}

export function UserAvatar({
  userId,
  size = 40,
  className,
  alt = 'User avatar',
}: UserAvatarProps) {
  const avatarUrl = formatUserAvatar(userId, size, 'avatar');

  return (
    <img
      src={avatarUrl}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full object-cover', className)}
      loading="lazy"
    />
  );
}
