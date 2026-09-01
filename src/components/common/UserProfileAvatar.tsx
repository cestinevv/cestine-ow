import { useState } from 'react';
import { UserAvatar } from '@/components/common/UserAvatar';
import { cn, resolveProfileAvatarUrl } from '@/utils';

type UserProfileAvatarProps = {
  userId?: string;
  /** 用户上传的自定义头像；无效或加载失败时回退 Stamp 默认头像 */
  avatarUrl?: string;
  size: number;
  alt?: string;
  className?: string;
  /** 无 userId 且无可用自定义头像时的单字 fallback */
  fallbackChar?: string;
};

type UserProfileAvatarCircleProps = UserProfileAvatarProps & {
  /** 首字母 fallback 时可选外圈（如个人中心 `ring-4`）；有上传图或 Stamp 时不显示 */
  ringClassName?: string;
  /** 容器尺寸类名，如 `size-28 md:size-32`；未传时按 `size` 像素定宽高 */
  containerClassName?: string;
};

/** 仅首字母 fallback 时展示 ring；自定义头像 / Stamp 默认图均不加描边 */
function shouldShowAvatarRing(
  userId?: string,
  avatarUrl?: string,
  fallbackChar?: string,
): boolean {
  if (resolveProfileAvatarUrl(avatarUrl) || userId?.trim()) {
    return false;
  }

  return Boolean(fallbackChar?.trim());
}

/**
 * 用户头像：有效自定义 URL → img；否则按 userId 展示 Stamp（`cdn.stamp.fyi`）。
 */
export function UserProfileAvatar({
  userId,
  avatarUrl,
  size,
  alt = '',
  className,
  fallbackChar,
}: UserProfileAvatarProps) {
  const stampUserId = userId?.trim();
  const resolvedCustomUrl = resolveProfileAvatarUrl(avatarUrl);
  const [failedCustomUrl, setFailedCustomUrl] = useState<string | null>(null);

  const showCustom =
    Boolean(resolvedCustomUrl) && failedCustomUrl !== resolvedCustomUrl;

  if (showCustom && resolvedCustomUrl) {
    return (
      <img
        alt={alt}
        src={resolvedCustomUrl}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        loading="lazy"
        onError={() => setFailedCustomUrl(resolvedCustomUrl)}
      />
    );
  }

  if (stampUserId) {
    return (
      <UserAvatar
        userId={stampUserId}
        size={size}
        alt={alt}
        className={className}
      />
    );
  }

  if (fallbackChar) {
    return (
      <span
        className={cn(
          'flex items-center justify-center rounded-full',
          'bg-language-switcher-active font-bold text-white',
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
        aria-hidden
      >
        {fallbackChar}
      </span>
    );
  }

  return null;
}

/** 与个人中心一致的头像圆形容器；`ringClassName` 仅在首字母 fallback 时生效 */
export function UserProfileAvatarCircle({
  ringClassName,
  containerClassName,
  size,
  className,
  userId,
  avatarUrl,
  fallbackChar,
  ...avatarProps
}: UserProfileAvatarCircleProps) {
  const showRing =
    Boolean(ringClassName) &&
    shouldShowAvatarRing(userId, avatarUrl, fallbackChar);

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        showRing ? ringClassName : undefined,
        containerClassName,
      )}
      style={containerClassName ? undefined : { width: size, height: size }}
    >
      <UserProfileAvatar
        {...avatarProps}
        userId={userId}
        avatarUrl={avatarUrl}
        fallbackChar={fallbackChar}
        size={size}
        className={cn('size-full', className)}
      />
    </div>
  );
}
