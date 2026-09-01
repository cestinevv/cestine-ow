// 测试导入
import 'dotenv/config'
console.log('✅ dotenv loaded')

import fs from 'fs'
console.log('✅ fs loaded')

import path from 'path'
console.log('✅ path loaded')

import { LANGUAGES, SOURCE_LANG, LOCALES_DIR } from './config.js'
console.log('✅ config loaded:', { LANGUAGES, SOURCE_LANG, LOCALES_DIR })

import { getDiff } from './diff.js'
console.log('✅ diff loaded')

import { translateObject } from './translate.js'
console.log('✅ translate loaded')

import { detectLanguage, cleanObject } from './langUtils.js'
console.log('✅ langUtils loaded')

console.log('\n🎉 All imports successful!')
