// 工具（变量保护等）

/** key 首字符是否为汉字（用于 locale 排序分组） */
function startsWithHan(key: string): boolean {
  return /^[\u4e00-\u9fff]/.test(key)
}

/**
 * locale JSON 的 key 排序（多分支并行加翻译时降低 merge 冲突）：
 * - 首字符非汉字：保持 JS 默认字典序（数字 / 字母 / 符号按 Unicode 码点）
 * - 首字符为汉字：按拼音序（依赖 Node ICU 的 `zh-CN` collation）
 * - 非汉字 key 整体排在汉字 key 之前（与原先 Unicode 分区一致）
 * - 禁止只把新 key append 到文件末尾；各语言 JSON 必须共用同一排序结果
 */
export function compareLocaleKeys(a: string, b: string): number {
  const aHan = startsWithHan(a)
  const bHan = startsWithHan(b)

  if (aHan !== bHan) {
    return aHan ? 1 : -1
  }

  if (aHan) {
    return a.localeCompare(b, 'zh-CN')
  }

  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** 按 compareLocaleKeys 重排 locale 对象 */
export function sortLocaleRecord(
  data: Record<string, string>,
): Record<string, string> {
  return Object.keys(data)
    .sort(compareLocaleKeys)
    .reduce(
      (acc, key) => {
        acc[key] = data[key]
        return acc
      },
      {} as Record<string, string>,
    )
}

export function protectVars(text: string) {
  const matches = text.match(/\{\{.*?\}\}/g) || []
  let protectedText = text

  matches.forEach((m, i) => {
    // 使用 XML 标签保护变量，DeepL 会自动忽略标签内容
    protectedText = protectedText.replace(m, `<x id="${i}">${m}</x>`)
  })

  return { protectedText, matches }
}

export function restoreVars(text: string, matches: string[]) {
  let result = text
  matches.forEach((m, i) => {
    // 恢复时移除 XML 标签，保留原始变量
    const pattern = new RegExp(`<x id="${i}">.*?</x>`, 'g')
    result = result.replace(pattern, m)
  })
  return result
}