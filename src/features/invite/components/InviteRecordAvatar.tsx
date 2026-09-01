import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';

type InviteRecordAvatarProps = {
  userId?: string;
  avatarUrl?: string;
  alt?: string;
  /** 无头像时在 Fallback 中展示的首字符（通常取昵称首字） */
  fallbackChar?: string;
};

export function InviteRecordAvatar({
  userId,
  avatarUrl,
  alt = '',
  fallbackChar,
}: InviteRecordAvatarProps) {
  const normalizedFallback =
    typeof fallbackChar === 'string' && fallbackChar.trim()
      ? fallbackChar.trim().charAt(0).toUpperCase()
      : undefined;

  return (
    <UserProfileAvatarCircle
      userId={userId}
      avatarUrl={avatarUrl}
      size={44}
      alt={alt}
      fallbackChar={normalizedFallback}
      containerClassName="size-11 shrink-0"
    />
  );
}
