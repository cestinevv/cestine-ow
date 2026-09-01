/**
 * 将 `objectKey` 拼为可公开访问的静态资源 URL（由 `VITE_MINI_DRAMA_ASSET_BASE_URL` 提供桶/CDN 根，不含末尾 `/`）。
 */
export function buildMiniDramaPublicObjectUrl(
  objectKey: string | undefined | null,
): string | undefined {
  const base = String(import.meta.env.VITE_MINI_DRAMA_ASSET_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '');
  const key = objectKey?.trim().replace(/^\/+/, '');

  if (!base || !key) {
    return undefined;
  }

  return `${base}/${key}`;
}

/** 平台默认头像（非用户上传），应回退 Stamp 马赛克 */
const PLATFORM_DEFAULT_AVATAR_PATTERNS: ReadonlyArray<RegExp> = [
  /cdn\.stamp\.fyi\/avatar\//i,
  /avatar_test\.png(?:[?#]|$)/i,
  // 未上传过照片：仅文件名 avatar-xx.png，路径前缀不限
  /(?:^|\/)avatar-[^/?#]+\.png(?:[?#]|$)/i,
];

/** 是否为平台下发的默认占位头像（非用户实际上传） */
export function isPlatformDefaultAvatarUrl(url: string): boolean {
  return PLATFORM_DEFAULT_AVATAR_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * 将接口 `avatarUrl` 规范为可请求的自定义头像地址。
 * - 空 / 平台默认 URL → `undefined`（由 userId 回退 Stamp）
 * - 纯 objectKey → 拼 `VITE_MINI_DRAMA_ASSET_BASE_URL`
 * - 其余完整 http(s) → 视为用户上传
 */
export function resolveProfileAvatarUrl(
  avatarUrl?: string | null,
): string | undefined {
  const raw = avatarUrl?.trim();
  if (!raw) {
    return undefined;
  }

  // 文件名为 avatar-xx.png 视为未上传，交给 Stamp（必须有 userId）
  if (isPlatformDefaultAvatarUrl(raw)) {
    return undefined;
  }

  if (!/^https?:\/\//i.test(raw)) {
    return buildMiniDramaPublicObjectUrl(raw);
  }

  return raw;
}

/** 接口字段是否表示用户已上传的自定义头像（用于保存、展示分流） */
export function hasUserUploadedProfileAvatar(
  avatarUrl?: string | null,
): boolean {
  return Boolean(resolveProfileAvatarUrl(avatarUrl));
}
