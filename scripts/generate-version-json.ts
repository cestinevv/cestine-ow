import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * 须在 `vite build` 之前执行：Nitro 会在构建期把 `public/` 编入静态资源清单；
 * 若构建后才写入 `version.json`，磁盘上有文件但运行时仍会 404。
 */
const version = process.env.VITE_APP_VERSION?.trim() || 'dev';
const timestamp = new Date().toISOString();
const payload = JSON.stringify({ version, timestamp }, null, 2);
const publicPath = join(process.cwd(), 'public', 'version.json');

mkdirSync(dirname(publicPath), { recursive: true });
writeFileSync(publicPath, `${payload}\n`, 'utf8');
console.log(`[version] wrote ${publicPath} (version=${version})`);
