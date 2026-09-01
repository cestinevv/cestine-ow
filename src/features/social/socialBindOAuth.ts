import {
  type getAuthorizationUrlResponse,
  getGetAuthorizationUrlUrl,
} from '@/api/__generated__/wallet/social-account-binding/social-account-binding';
import { appAxiosInstance } from '@/api/appRequest';

/** X OAuth 绑定结果跨窗通知（落地页 → 发起页） */
export const TWITTER_BIND_RESULT_MESSAGE_TYPE =
  'story:twitter-bind-result' as const;

let twitterBindResultSignal = 0;

export type TwitterBindResultStatus = 'success' | 'failed';

export type TwitterBindResultMessage = {
  type: typeof TWITTER_BIND_RESULT_MESSAGE_TYPE;
  status: TwitterBindResultStatus;
};

export function isTwitterBindResultMessage(
  data: unknown,
): data is TwitterBindResultMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const message = data as Partial<TwitterBindResultMessage>;

  return (
    message.type === TWITTER_BIND_RESULT_MESSAGE_TYPE &&
    (message.status === 'success' || message.status === 'failed')
  );
}

/** 通知父窗口绑定结果（同源） */
export function postTwitterBindResultToOpener(
  status: TwitterBindResultStatus,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!window.opener || window.opener.closed) {
    return;
  }

  window.opener.postMessage(
    {
      type: TWITTER_BIND_RESULT_MESSAGE_TYPE,
      status,
    } satisfies TwitterBindResultMessage,
    window.location.origin,
  );
}

/** 标记当前页面已收到一次绑定结果，用于与关窗兜底互斥。 */
export function markTwitterBindResultSignal(): void {
  twitterBindResultSignal += 1;
}

/** 读取最近一次绑定结果标记，供发起页判断本轮是否已被落地页结算。 */
export function getTwitterBindResultSignal(): number {
  return twitterBindResultSignal;
}

/** 若当前页在授权弹窗内，处理完后关闭自身 */
export function closeTwitterOAuthPopupIfOpened(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.opener && !window.opener.closed) {
    window.close();
  }
}

/** 获取 X 授权跳转地址（redirect_uri 由后端写死） */
export async function fetchTwitterAuthorizationUrl(): Promise<getAuthorizationUrlResponse> {
  return appAxiosInstance<getAuthorizationUrlResponse>(
    getGetAuthorizationUrlUrl(),
    {
      method: 'GET',
    },
  );
}

const X_OAUTH_POPUP_NAME = 'story_x_oauth';
const X_OAUTH_POPUP_WIDTH = 600;
const X_OAUTH_POPUP_HEIGHT = 720;

function buildTwitterOAuthPopupFeatures(): string {
  const left = Math.max(
    0,
    Math.round(window.screenX + (window.outerWidth - X_OAUTH_POPUP_WIDTH) / 2),
  );
  const top = Math.max(
    0,
    Math.round(
      window.screenY + (window.outerHeight - X_OAUTH_POPUP_HEIGHT) / 2,
    ),
  );

  return [
    `width=${X_OAUTH_POPUP_WIDTH}`,
    `height=${X_OAUTH_POPUP_HEIGHT}`,
    `left=${left}`,
    `top=${top}`,
    'popup=yes',
    'menubar=no',
    'toolbar=no',
    'location=yes',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
}

/**
 * 同步打开居中空白小窗口，并写入加载文案（由调用方传入已翻译字符串）。
 * 必须在用户点击的同步调用栈内执行；await 之后再 window.open 会被浏览器当成新标签页。
 */
export function openTwitterOAuthPopup(loadingMessage?: string): Window | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const popup = window.open(
    'about:blank',
    X_OAUTH_POPUP_NAME,
    buildTwitterOAuthPopupFeatures(),
  );

  if (!popup) {
    return null;
  }

  const message = loadingMessage?.trim() || '…';

  try {
    popup.document.open();
    popup.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(message)}</title><style>html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;font:14px/1.4 system-ui,sans-serif;color:#1c2024;background:#f0f0f3}</style></head><body><p>${escapeHtml(message)}</p></body></html>`,
    );
    popup.document.close();
  } catch {
    // 个别环境下写 about:blank 可能失败，仍保留小窗供后续导航
  }

  return popup;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** 将已打开的小窗口导航到 X 授权页 */
export function navigateTwitterOAuthPopup(
  popup: Window,
  authUrl: string,
): void {
  popup.location.href = authUrl;
}

/** 监听授权弹窗关闭，关闭后回调（用于刷新绑定状态） */
export function watchTwitterOAuthPopup(
  popup: Window,
  onClosed: () => void,
): () => void {
  const timer = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(timer);
      onClosed();
      return;
    }

    // 弹窗回到同源时可读 URL；跨域（X / API JSON）会抛错，无法代关
    try {
      const { href, origin } = popup.location;

      if (origin !== window.location.origin) {
        return;
      }

      const url = new URL(href);

      // 误落到同源其它路径且带 OAuth error 时，拉回落地页（保留 ?error=）
      if (
        url.searchParams.has('error') &&
        !url.pathname.includes('social-bind')
      ) {
        const errorValue = url.searchParams.get('error') || 'access_denied';
        popup.location.replace(
          `${window.location.origin}/social-bind?error=${encodeURIComponent(errorValue)}`,
        );
      }
    } catch {
      // 跨域中（授权页或网关 callback JSON），等落地 302 或用户关窗
    }
  }, 400);

  return () => {
    window.clearInterval(timer);
  };
}
