/**
 * @file vite.sentry.ts
 * @description Vite 构建期 Source Map 上传：按 mode 默认策略 + SENTRY_UPLOAD 开关；失败不挡发版
 */

import { sentryVitePlugin } from '@sentry/vite-plugin';
import type { PluginOption } from 'vite';

/**
 * @interface ISentryBuildOptions
 * @description resolveSentryBuild 返回给 vite.config 使用的片段
 */
export interface ISentryBuildOptions {
  /** 是否启用 hidden sourcemap + 上传插件 */
  enabled: boolean;
  /** Vite build.sourcemap */
  sourcemap: 'hidden' | false;
  /** 条件展开进 plugins */
  plugins: PluginOption[];
}

/**
 * @description 是否应上传 Source Map
 * - development：默认不传；仅 SENTRY_UPLOAD=1 且凭证齐全时上传（本地预验）
 * - testenv / production：默认传（凭证写在对应 .env.*）；SENTRY_UPLOAD=0 可关掉（测网后期可关）
 * @param mode - Vite mode
 * @param uploadFlag - SENTRY_UPLOAD 原始值（'' | '0' | '1' | …）
 * @returns 是否允许进入上传门槛（尚须校验凭证与 release）
 */
function shouldAttemptUpload(mode: string, uploadFlag: string): boolean {
  if (uploadFlag === '0') {
    return false;
  }

  if (uploadFlag === '1') {
    return true;
  }

  // 未设置开关：仅测网 / 生产构建默认上传
  return mode === 'testenv' || mode === 'production';
}

/**
 * @description 从 loadEnv 与 process.env 解析上传配置
 * @param mode - Vite defineConfig 的 mode
 * @param env - loadEnv(mode, cwd, '') 的结果（可含 SENTRY_*）
 * @returns sourcemap 与 plugins 片段
 */
export function resolveSentryBuild(
  mode: string,
  env: Record<string, string>,
): ISentryBuildOptions {
  const release = (
    env.VITE_APP_VERSION ||
    process.env.VITE_APP_VERSION ||
    ''
  ).trim();

  const authToken = env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN || '';
  const org = env.SENTRY_ORG || process.env.SENTRY_ORG || '';
  const project = env.SENTRY_PROJECT || process.env.SENTRY_PROJECT || '';
  const uploadFlag = (
    process.env.SENTRY_UPLOAD ||
    env.SENTRY_UPLOAD ||
    ''
  ).trim();

  const enabled =
    shouldAttemptUpload(mode, uploadFlag) &&
    Boolean(authToken) &&
    Boolean(org) &&
    Boolean(project) &&
    Boolean(release);

  if (!enabled) {
    return {
      enabled: false,
      sourcemap: false,
      plugins: [],
    };
  }

  return {
    enabled: true,
    sourcemap: 'hidden',
    plugins: [
      sentryVitePlugin({
        org,
        project,
        authToken,
        release: {
          name: release,
        },
        sourcemaps: {
          filesToDeleteAfterUpload: [
            './dist/**/*.map',
            './.output/**/*.map',
          ],
        },
        telemetry: false,
        // 上传失败只告警，不中断 Vite / Docker 发版
        errorHandler: (err) => {
          console.warn(
            '[sentry] Source Map 上传失败，构建继续（发版不阻断）:',
            err,
          );
        },
      }),
    ],
  };
}
