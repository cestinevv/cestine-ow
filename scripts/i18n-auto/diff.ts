// # 增量翻译

export function getDiff(source: any, target: any) {
  const diff: Record<string, any> = {}

  Object.keys(source).forEach((key) => {
    if (!target[key]) {
      diff[key] = source[key]
    } else if (
      typeof source[key] === 'object' &&
      typeof target[key] === 'object'
    ) {
      const nested = getDiff(source[key], target[key])
      if (Object.keys(nested).length > 0) {
        diff[key] = nested
      }
    }
  })

  return diff
}