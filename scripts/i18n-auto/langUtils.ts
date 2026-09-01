// 语言检测工具
export function detectLanguage(text: string): 'zh' | 'en' | 'other' {
  if (!text || typeof text !== 'string') return 'en'
  
  // 统计中文字符数量
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g)
  const chineseCount = chineseChars ? chineseChars.length : 0
  
  // 统计英文字符数量（字母）
  const englishChars = text.match(/[a-zA-Z]/g)
  const englishCount = englishChars ? englishChars.length : 0
  
  // 如果没有中文也没有英文，默认英文
  if (chineseCount === 0 && englishCount === 0) return 'en'
  
  // 如果只有中文
  if (chineseCount > 0 && englishCount === 0) return 'zh'
  
  // 如果只有英文
  if (englishCount > 0 && chineseCount === 0) return 'en'
  
  // 混合情况：哪个多用哪个
  if (chineseCount > englishCount) return 'zh'
  
  return 'en'
}

// 清理对象，移除目标对象中源对象没有的键
export function cleanObject(source: any, target: any): any {
  if (typeof source !== 'object' || typeof target !== 'object') {
    return target
  }
  
  const cleaned: any = {}
  
  // 只保留源对象中存在的键
  for (const key in source) {
    if (key in target) {
      if (typeof source[key] === 'object' && typeof target[key] === 'object') {
        cleaned[key] = cleanObject(source[key], target[key])
      } else {
        cleaned[key] = target[key]
      }
    }
  }
  
  return cleaned
}
