/**
 * 格式化用户头像 URL
 * @param id - 用户 ID
 * @param size - 尺寸（单个数字或宽高对象）
 * @param type - 头像类型
 * @param hash - 缓存哈希
 */
export function formatUserAvatar(
  id: string,
  size: number | { width: number; height: number },
  type?:
    | 'avatar'
    | 'user-cover'
    | 'space'
    | 'space-cover'
    | 'space-logo'
    | 'token',
  hash?: string,
) {
  if (id === '') {
    return '';
  }
  let sizeParam = '';
  sizeParam =
    typeof size === 'number'
      ? `?s=${size * 2}`
      : `?w=${size.width}&h=${size.height}`;
  const cacheParam = hash ? `&cb=${hash}` : '';
  return `https://cdn.stamp.fyi/${type || 'avatar'}/${id}${sizeParam}${cacheParam}`;
}
