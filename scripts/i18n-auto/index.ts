// # 入口（CLI）
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { LANGUAGES, SOURCE_LANG, LOCALES_DIR } from './config.js'
import { getDiff } from './diff.js'
import {
  isI18nPluralKey,
  keyContainsChinese,
  translateObject,
  zhCnPluralDisplayValue,
} from './translate.js'
import { cleanObject } from './langUtils.js'
import { sortLocaleRecord } from './utils.js'

async function run() {
  console.log('🔑 VITE_DEEPL_API_KEY:', process.env.VITE_DEEPL_API_KEY ? '✅ 已设置' : '❌ 未设置')

  const sourcePath = path.join(LOCALES_DIR, `${SOURCE_LANG}.json`)
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))

  console.log(`\n📝 源语言文件 (${SOURCE_LANG})\n`)

  for (const lang of LANGUAGES) {
    // 源语言 zh-CN 也需要处理（翻译英文 key），但逻辑不同
    const isSourceLang = lang === SOURCE_LANG

    const targetPath = path.join(LOCALES_DIR, `${lang}.json`)

    let target: Record<string, any> = {}
    if (fs.existsSync(targetPath)) {
      const fileContent = fs.readFileSync(targetPath, 'utf-8').trim()
      if (fileContent) {
        try {
          target = JSON.parse(fileContent)
        } catch (error) {
          console.log(`⚠️  ${lang}.json 文件损坏，将重新创建`)
        }
      }
    }

    // 1. 清理目标文件中源文件没有的键（废弃词条）
    const removedKeys = Object.keys(target).filter((k) => !(k in source))
    if (removedKeys.length > 0) {
      console.log(`🗑️  ${lang}: 删除 ${removedKeys.length} 个废弃的键`)
    }
    const cleaned = cleanObject(source, target)

    // 2. diff 计算增量部分
    const diff = getDiff(source, cleaned)

    // 3. 特殊处理 zh-CN：检查英文 key 是否需要翻译
    if (isSourceLang) {
      for (const key of Object.keys(source)) {
        const value = cleaned[key] as string
        // 如果 key 是英文，但 value 也是同样的英文（未翻译），则加入 diff
        if (!keyContainsChinese(key) && typeof value === 'string' && value === key) {
          diff[key] = key
        }
      }
    } else {
      // 对于其他语言：检查中文 key 是否已正确翻译
      for (const key of Object.keys(source)) {
        const sourceValue = source[key] as string
        const targetValue = cleaned[key] as string
        // 如果 key 是中文，但 value 和源语言相同（未翻译），则加入 diff
        if (keyContainsChinese(key) && typeof targetValue === 'string' && targetValue === sourceValue) {
          diff[key] = sourceValue
        }
      }
    }

    // 4. 特殊处理：zh-CN 中 key 含中文时，强制 value === key（忽略差异，直接覆盖）
    const shouldWrite =
      removedKeys.length > 0 ||
      Object.keys(diff).length > 0 ||
      (isSourceLang &&
        Object.keys(cleaned).some((k) => {
          const v = cleaned[k as keyof typeof cleaned]
          if (isI18nPluralKey(k)) {
            return typeof v === 'string' && v !== zhCnPluralDisplayValue(k)
          }
          return keyContainsChinese(k) && typeof v === 'string' && v !== k
        }))

    if (!shouldWrite) {
      console.log(`✅ ${lang} 无需翻译`)
      continue
    }

    console.log(`🚀 翻译 ${lang}...`)

    // diff 里只含缺失部分，translateObject 会对每个 value 调用 DeepL
    // ——对于 zh-CN，translateText 会在 key 含中文时跳过翻译直接返回 key（已在 translate.ts 处理）
    // ——对于其他语言，translateText 会按 DeepL 结果写入英文
    const translated = await translateObject(diff, lang)

    const merged: Record<string, any> = { ...cleaned, ...translated }

    // zh-CN 后处理：普通中文 key 强制 value === key；复数 key 使用去掉后缀的展示模板
    if (isSourceLang) {
      for (const k of Object.keys(merged)) {
        if (typeof merged[k] !== 'string') {
          continue
        }
        if (isI18nPluralKey(k)) {
          merged[k] = zhCnPluralDisplayValue(k)
          continue
        }
        if (keyContainsChinese(k)) {
          merged[k] = k
        }
      }
    }

    fs.writeFileSync(
      targetPath,
      JSON.stringify(sortLocaleRecord(merged), null, 2) + '\n',
    )
    console.log(`✅ ${lang} 完成`)
  }

  console.log(`\n🎉 所有语言翻译完成！`)
}

run()