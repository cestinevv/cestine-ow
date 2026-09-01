/**
 * @file bootstrapObservability.ts
 * @description 宿主可观测性启动：唯一读 import.meta.env 并调用 telemetry-kit init
 */

import { init } from '@amazing-socrates/telemetry-kit';
import { AUTH_ERROR_CODES, BUSINESS_SUCCESS_CODE } from '@/api/appRequest';

/**
 * @description 在应用早期调用一次；包内不读 env，业务码/鉴权规则由主站注入
 */
export function bootstrapObservability(): void {
  // release 与 Vite Source Map 上传同源（VITE_APP_VERSION）
  // 一期不传 router：通用 BrowserTracing 即可；二期再接 TanStack 专用集成
  // 回放走 kit 默认：production 关；dev/test 开（testenv 已放开 DSN，会采集；development 仍注释 DSN）
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION?.trim() || undefined,
    platform: 'StoryFun',
    defaultTags: { product: 'OneStory' },
    // 控台只打 feedbackId 方便对单；debug diagnostics 会带出采样/回放等配置，不打印
    debug: false,
    printFeedbackIdToConsole: true,
    getBusinessCode: (data) => {
      if (data && typeof data === 'object' && 'code' in data) {
        return (data as { code?: number | string }).code;
      }
      return undefined;
    },
    isBusinessSuccess: (code) => code === BUSINESS_SUCCESS_CODE || code === 200,
    isAuthFailure: ({ httpStatus, businessCode }) => {
      if (httpStatus === 401 || httpStatus === 403) {
        return true;
      }
      if (businessCode == null) {
        return false;
      }
      return AUTH_ERROR_CODES.has(Number(businessCode));
    },
  });
}
