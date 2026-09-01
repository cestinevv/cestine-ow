// # 提取代码中的 t() 词条
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { LANGUAGES, LOCALES_DIR, SOURCE_LANG } from './config.js'
import { cleanObject } from './langUtils.js'
import { isI18nPluralKey, zhCnPluralDisplayValue } from './translate.js'
import { sortLocaleRecord } from './utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** 递归查找所有符合扩展名的文件 */
function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = []
  
  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      
      if (entry.isDirectory()) {
        // 跳过 node_modules 等目录
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath)
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (extensions.includes(ext)) {
          files.push(fullPath)
        }
      }
    }
  }
  
  walk(dir)
  return files
}

/** key 不含汉字则不进入翻译体系（与 agent-to-react-translation 规则一致） */
function isNonTranslatableKey(key: string): boolean {
  return !/[\u4e00-\u9fff]/.test(key)
}

/**
 * 将源码字符串字面量中的转义还原为运行时值。
 * 否则 `\n` 会以「反斜杠 + n」伪 key 写入 locale（与运行时真实换行 key 重复）。
 */
function unescapeStringLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/** 规范化并决定是否收集；含换行的公式类 key 需手补，避免伪 `\\n` key */
function collectKey(raw: string): string | null {
  const key = unescapeStringLiteral(raw).trim()

  if (
    !key ||
    key.includes('{{') ||
    key.includes('\n') ||
    isNonTranslatableKey(key)
  ) {
    return null
  }

  return key
}

/** 从代码中提取所有 t("xxx") 或 t('xxx') 的内容 */
function extractFromCode(code: string): string[] {
  const keys: string[] = []

  // 1. 匹配 t("xxx") 或 t('xxx')，支持包含引号的字符串
  const patterns = [
    /t\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,?\s*\)/gm, // t("xxx") 支持转义
    /t\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,?\s*\)/gm, // t('xxx') 支持转义
    /t\s*\(\s*`([^`]+)`\s*,?\s*\)/gm, // t(`xxx`) 模板字符串
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(code)) !== null) {
      const key = collectKey(match[1])
      if (key) {
        keys.push(key)
      }
    }
  }

  // 2. 提取对象字面量中的字符串（支持 t(变量) 模式）
  const objectStringPatterns = [
    /:\s*"((?:[^"\\]|\\.)*)"/gm,
    /:\s*'((?:[^'\\]|\\.)*)'/gm,
  ]

  for (const pattern of objectStringPatterns) {
    let match
    while ((match = pattern.exec(code)) !== null) {
      const key = collectKey(match[1])
      if (key) {
        keys.push(key)
      }
    }
  }

  // 3. 提取数组字面量中的字符串
  const arrayStringPatterns = [
    /\[\s*"((?:[^"\\]|\\.)*)"/gm,
    /\[\s*'((?:[^'\\]|\\.)*)'/gm,
  ]

  for (const pattern of arrayStringPatterns) {
    let match
    while ((match = pattern.exec(code)) !== null) {
      const key = collectKey(match[1])
      if (key) {
        keys.push(key)
      }
    }
  }

  // 4. 从数组中继续提取后续的字符串元素
  const arrayItemPatterns = [
    /,\s*"((?:[^"\\]|\\.)*)"/gm,
    /,\s*'((?:[^'\\]|\\.)*)'/gm,
  ]

  for (const pattern of arrayItemPatterns) {
    let match
    while ((match = pattern.exec(code)) !== null) {
      const key = collectKey(match[1])

      // 含中文的文案即使带 00:00 / 公式冒号也应收录（collectKey 已过滤无汉字）
      if (key) {
        keys.push(key)
      }
    }
  }

  return keys
}

/** 提取所有 tsx/ts 文件中的词条 */
function extractAllKeys(srcDir: string): Set<string> {
  const allKeys = new Set<string>()
  
  // 查找所有 tsx 和 ts 文件
  const files = findFiles(srcDir, ['.ts', '.tsx'])
  
  console.log(`📂 找到 ${files.length} 个文件`)
  
  for (const file of files) {
    // 跳过 .d.ts 文件
    if (file.endsWith('.d.ts')) continue
    
    const code = fs.readFileSync(file, 'utf-8')
    const keys = extractFromCode(code)
    keys.forEach((k) => allKeys.add(k))
  }
  
  return allKeys
}

/** 拼接 src 下 ts/tsx 源码语料（跳过 locales 目录），用于判定 locale key 是否仍被引用 */
function buildSourceCorpus(srcDir: string): string {
  const files = findFiles(srcDir, ['.ts', '.tsx']).filter((file) => {
    if (file.endsWith('.d.ts')) return false
    if (file.includes(`${path.sep}locales${path.sep}`)) return false
    return true
  })

  let corpus = ''
  for (const file of files) {
    corpus += `${fs.readFileSync(file, 'utf-8')}\n`
  }

  return corpus
}

/** locale key 是否在源码语料中出现（复数 key 用去掉后缀的 base 匹配） */
function isLocaleKeyReferenced(key: string, corpus: string): boolean {
  const needle = isI18nPluralKey(key) ? zhCnPluralDisplayValue(key) : key
  return corpus.includes(needle)
}

/** 主函数 */
function run() {
  const srcDir = path.resolve(__dirname, '../../src')
  const sourcePath = path.join(LOCALES_DIR, `${SOURCE_LANG}.json`)
  
  console.log('🔍 正在提取代码中的词条...\n')
  
  // 1. 从代码中提取所有 key，并构建源码语料用于废弃 key 判定
  const extractedKeys = extractAllKeys(srcDir)
  const sourceCorpus = buildSourceCorpus(srcDir)
  console.log(`\n✅ 共提取到 ${extractedKeys.size} 个唯一词条\n`)
  
  // 2. 读取现有的 zh-CN.json
  let existingData: Record<string, string> = {}
  if (fs.existsSync(sourcePath)) {
    try {
      const fileContent = fs.readFileSync(sourcePath, 'utf-8').trim()
      if (fileContent) {
        existingData = JSON.parse(fileContent)
      }
    } catch (error) {
      console.log(`⚠️  ${SOURCE_LANG}.json 文件损坏，将重新创建\n`)
    }
  }
  
  // 3. 合并：新词条添加进去，key === value（中文）；并清理历史误入 / 源码未引用的 key
  let addedCount = 0
  let nonTranslatableRemovedCount = 0
  let unusedRemovedCount = 0
  const merged: Record<string, string> = { ...existingData }

  for (const key of Object.keys(merged)) {
    // 历史误入：源码 `\n` 未 unescape 时写成「反斜杠 + n」伪 key
    if (isNonTranslatableKey(key) || key.includes('\\n')) {
      delete merged[key]
      nonTranslatableRemovedCount++
      continue
    }

    if (!isLocaleKeyReferenced(key, sourceCorpus)) {
      delete merged[key]
      unusedRemovedCount++
    }
  }
  
  for (const key of extractedKeys) {
    if (isNonTranslatableKey(key)) continue
    if (!(key in merged)) {
      merged[key] = isI18nPluralKey(key) ? zhCnPluralDisplayValue(key) : key
      addedCount++
    }
  }
  
  // 4. 按 key 排序：非汉字默认字典序，汉字按拼音序
  const sorted = sortLocaleRecord(merged)
  
  // 5. 写回 zh-CN.json
  fs.writeFileSync(sourcePath, JSON.stringify(sorted, null, 2) + '\n')

  // 6. 同步其它语言：只保留 zh-CN 仍存在的 key（不触发 DeepL）
  let syncedLocaleCount = 0
  for (const lang of LANGUAGES) {
    if (lang === SOURCE_LANG) continue

    const targetPath = path.join(LOCALES_DIR, `${lang}.json`)
    let target: Record<string, string> = {}

    if (fs.existsSync(targetPath)) {
      try {
        const fileContent = fs.readFileSync(targetPath, 'utf-8').trim()
        if (fileContent) {
          target = JSON.parse(fileContent)
        }
      } catch {
        console.log(`⚠️  ${lang}.json 文件损坏，将按 ${SOURCE_LANG} 重建\n`)
      }
    }

    const cleaned = cleanObject(sorted, target) as Record<string, string>
    const synced = sortLocaleRecord(cleaned)
    fs.writeFileSync(targetPath, JSON.stringify(synced, null, 2) + '\n')
    syncedLocaleCount++
  }
  
  console.log(`✅ 已更新 ${SOURCE_LANG}.json`)
  console.log(`   新增 ${addedCount} 个词条`)
  console.log(`   移除 ${nonTranslatableRemovedCount} 个无需翻译词条`)
  console.log(`   移除 ${unusedRemovedCount} 个源码未引用词条`)
  console.log(`   总计 ${Object.keys(sorted).length} 个词条`)
  console.log(`   已同步 ${syncedLocaleCount} 个其它语言文件\n`)
  
  if (addedCount > 0) {
    console.log('💡 请运行 npm run i18n:translate 来翻译到其他语言\n')
  } else if (nonTranslatableRemovedCount > 0 || unusedRemovedCount > 0) {
    console.log('✨ 已清理废弃词条\n')
  } else {
    console.log('✨ 所有词条已是最新，无需更新\n')
  }
}

run()
