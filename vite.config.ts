import { fileURLToPath, URL } from 'node:url';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig, loadEnv } from 'vite';
import { reactClickToComponent } from 'vite-plugin-react-click-to-component';
import { resolveSentryBuild } from './scripts/vite.sentry';

export default defineConfig(({ mode }) => {
  // 加载全部前缀 env（含 SENTRY_*）；勿把 Auth Token 暴露给客户端代码
  const env = loadEnv(mode, process.cwd(), '');
  const isLadle = process.env.VITE_LADLE === 'true';
  const useDevHttps =
    !isLadle &&
    mode !== 'production' &&
    process.env.VITE_DEV_PLAIN_HTTP !== '1';

  const extraTlsHosts =
    process.env.VITE_DEV_TLS_EXTRA_HOSTS?.split(',')
      .map((h) => h.trim())
      .filter(Boolean) ?? [];

  const sentry = resolveSentryBuild(mode, env);

  return {
    server: {
      host: true,
      port: 3050,
      allowedHosts: ['.actqa.com'],
    },
    build: {
      minify: mode === 'production' ? 'esbuild' : false,
      // hidden：仅上传开启时生成 map，且不在产物里挂 //# sourceMappingURL
      sourcemap: sentry.sourcemap,
    },
    // esbuild: {
    //   drop: mode === 'production' ? ['console', 'debugger'] : [],
    // },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [
      ...(useDevHttps
        ? [
            basicSsl({
              name: 'onestory-dev',
              domains: [
                'localhost',
                '127.0.0.1',
                'dev-web.actqa.com',
                '*.actqa.com',
                ...extraTlsHosts,
              ],
              ttlDays: 60,
            }),
          ]
        : []),
      ...(isLadle
        ? []
        : [
            tanstackStart({
              router: {
                routesDirectory: 'routes',
              },
            }),
            nitro(),
            viteReact(),
            babel({
              presets: [reactCompilerPreset()],
            }),
          ]),
      tailwindcss(),
      reactClickToComponent(),
      ...sentry.plugins,
    ],
  };
});
