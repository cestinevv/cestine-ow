// # 核心翻译逻辑（DeepL）
import { protectVars, restoreVars } from './utils.js'
import { VITE_DEEPL_API_KEY } from './config.js'
import { detectLanguage } from './langUtils.js'

const DEEPL_LANG_MAP: Record<string, string> = {
  'zh-CN': 'ZH',
  'en': 'EN-US',
  'ja': 'JA',
  'ko': 'KO',
  'tr': 'TR',
  'es': 'ES',
}

/** 检测 key 是否包含中文 */
export function keyContainsChinese(key: string): boolean {
  const chineseChars = key.match(/[\u4e00-\u9fa5]/g)
  return chineseChars !== null && chineseChars.length > 0
}

/** i18next 复数 key（如 `{{count}}天前_other`），不可对 zh-CN 强制 value === key */
export function isI18nPluralKey(key: string): boolean {
  return /_(?:one|other)$/.test(key)
}

/** zh-CN 复数词条展示模板：去掉 `_one` / `_other` 后缀 */
export function zhCnPluralDisplayValue(key: string): string {
  return key.replace(/_(?:one|other)$/, '')
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: 'zh' | 'en',
  key?: string,
) {
  if (!text) return text

  const { protectedText, matches } = protectVars(text)
  
  // 🔧 如果传入了 key，优先根据 key 判断源语言
  let detectedSourceLang: 'zh' | 'en' | 'other'
  if (key) {
    // 如果 key 包含中文，认为源语言是中文；否则认为是英文
    detectedSourceLang = keyContainsChinese(key) ? 'zh' : 'en'
  } else {
    detectedSourceLang = sourceLang || detectLanguage(text)
  }

  if (detectedSourceLang === 'other') return text

  // ⭐ zh-CN 特殊处理：
  // 1. key 含中文时，展示文案以 key（中文）为准，不调用 DeepL
  // 2. key 是英文时，需要翻译成中文
  if (targetLang === 'zh-CN') {
    if (key && isI18nPluralKey(key)) {
      return zhCnPluralDisplayValue(key)
    }
    if (key && keyContainsChinese(key)) {
      return key
    }
    // key 是英文，继续执行翻译流程（不要提前返回）
  }

  // 目标英文，源也是英文，原样返回
  if (targetLang === 'en' && detectedSourceLang === 'en') {
    return text
  }

  // 目标中文，源也是中文，原样返回（value 可能本身是中文）
  // 注意：这里不会影响英文 key 的翻译，因为英文 key 的 detectedSourceLang 是 'en'
  if (targetLang === 'zh-CN' && detectedSourceLang === 'zh') {
    return text
  }

  const deeplTargetLang = DEEPL_LANG_MAP[targetLang] || targetLang.toUpperCase()
  const deeplSourceLang = detectedSourceLang === 'zh' ? 'ZH' : 'EN'

  try {
    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `DeepL-Auth-Key ${VITE_DEEPL_API_KEY}`,
      },
      body: JSON.stringify({
        text: [protectedText],
        source_lang: deeplSourceLang,
        target_lang: deeplTargetLang,
        tag_handling: 'xml',
      }),
    })

    if (!res.ok) {
      console.error(`[Error] DeepL API error: ${res.status}`)
      return text
    }

    const data = await res.json()
    let translated = data.translations?.[0]?.text || text

    return restoreVars(translated, matches)
  } catch (error) {
    console.error(`[Error] Translation failed:`, error)
    return text
  }
}

export async function translateObject(
  obj: Record<string, any>,
  targetLang: string,
) {
  const result: Record<string, any> = {}

  for (const key in obj) {
    const value = obj[key]

    if (typeof value === 'object') {
      result[key] = await translateObject(value, targetLang)
    } else if (typeof value === 'string') {
      const detectedLang = detectLanguage(value)
      const srcLang = detectedLang === 'other' ? undefined : detectedLang
      result[key] = await translateText(value, targetLang, srcLang, key)

      if (result[key] !== value) {
        console.log(`[${targetLang}] ${value} -> ${result[key]}`)
      }
    } else {
      result[key] = value
    }
  }

  return result
}