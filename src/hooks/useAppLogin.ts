import { reportError } from '@amazing-socrates/telemetry-kit';
import {
  type PrivyErrorCode,
  usePrivy,
  useLogin as usePrivyLogin,
} from '@privy-io/react-auth';
import { useLayoutEffect } from 'react';
import store2 from 'store2';

import type { LoginResponse } from '@/api/__generated__/wallet/model/loginResponse';
import {
  login as postUserWalletLogin,
  logout as postUserWalletLogout,
} from '@/api/__generated__/wallet/userwallet-auth/userwallet-auth';
import {
  INVITE_CODE_PATTERN,
  INVITE_CODE_SESSION_STORAGE_KEY,
} from '@/constants';
import { reloadPlayDetailPageIfActive } from '@/features/play/playPageRefresh';
import {
  AUTH_FLOW_TIMEOUT_MS,
  hydrateAuthFlowStoreFromStorage,
  useAuthFlowStore,
} from '@/stores/authFlowStore';
import useGlobalStore from '@/stores/global';

/**
 * Privy 只在 AppAuthBridge 绑定一次。
 * useAppLogin 会被 Header（两个 LoginButton）等很多地方调用，绝不能在 hook 里再注册 onComplete。
 */
const privyRef = {
  login: null as (() => void) | null,
  logout: null as (() => Promise<void>) | null,
  getAccessToken: null as (() => Promise<string | null>) | null,
  userId: '',
  canLogout: false,
};

let loginInFlight = false;
let logoutInFlight = false;
let lastPrivyUserId = '';
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

/** 本轮登出只发一次中心化 logout，直到下次登录成功才允许再发 */
let backendLogoutPromise: Promise<unknown> | null = null;

function stopAuthFlow() {
  if (watchdogTimer != null) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }

  useAuthFlowStore.getState().reset();
}

function clearLocalAuth(reloadPlay = true) {
  useGlobalStore.getState().clearUserInfo();
  loginInFlight = false;
  stopAuthFlow();
  if (reloadPlay) {
    reloadPlayDetailPageIfActive();
  }
}

async function raceTimeout(task: Promise<unknown>, ms: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      task,
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => resolve(), ms);
      }),
    ]);
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
  }
}

/** 中心化 logout：无 token 或本轮已发过，直接复用 / 跳过 */
function postBackendLogoutOnce() {
  if (!store2.get('userToken')) {
    return Promise.resolve();
  }

  if (!backendLogoutPromise) {
    backendLogoutPromise = postUserWalletLogout().catch(() => undefined);
  }

  return backendLogoutPromise;
}

/** 刷新后若仍停在登录中 / 登出中，按剩余时间续等，到期强制收尾 */
function syncWatchdog() {
  hydrateAuthFlowStoreFromStorage();

  if (watchdogTimer != null) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }

  const { phase, startedAt } = useAuthFlowStore.getState();
  if (phase === 'idle') {
    return;
  }

  const remainingMs =
    startedAt == null
      ? 0
      : Math.max(0, AUTH_FLOW_TIMEOUT_MS - (Date.now() - startedAt));

  const onTimeout = () => {
    watchdogTimer = null;
    const current = useAuthFlowStore.getState().phase;
    if (current === 'loggingOut') {
      void logout();
      return;
    }

    if (current === 'loggingIn') {
      // 登录超时只收 UI，不要 reload 打断 Privy 邮箱弹窗
      clearLocalAuth(false);
    }
  };

  if (remainingMs <= 0) {
    onTimeout();
    return;
  }

  watchdogTimer = setTimeout(onTimeout, remainingMs);
}

async function readPrivyAccessToken(
  getAccessToken: () => Promise<string | null>,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = await getAccessToken();
    if (token) {
      return token;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
  }

  return null;
}

/** 打开 Privy 登录弹窗。邮箱 OTP 可能很久，这里不启动 30s 超时 */
export function login() {
  const phase = useAuthFlowStore.getState().phase;

  // 登录弹窗已开时禁止重入，避免焦点回填 / 重复点击连环唤起
  if (phase === 'loggingIn' || phase === 'loggingOut' || loginInFlight) {
    return;
  }

  // 仅 UI「登录中」，不写入 sessionStorage，避免邮箱 OTP 中刷新后卡死
  useAuthFlowStore.getState().begin('loggingIn', { persist: false });

  try {
    // 已有 Privy 会话（例如 OTP 完成后超时没换到平台 token）直接换票
    if (privyRef.canLogout && privyRef.getAccessToken) {
      void handlePrivyLoginComplete({
        userId: privyRef.userId,
        getAccessToken: privyRef.getAccessToken,
      });
      return;
    }

    if (!privyRef.login) {
      stopAuthFlow();
      return;
    }

    privyRef.login();
  } catch {
    stopAuthFlow();
  }
}

/**
 * 先打中心化 logout（只一次），再 privyLogout。
 * Privy accountChanged 会再次进到这里，不能再发中心化接口。
 */
export async function logout() {
  if (logoutInFlight) {
    return;
  }

  logoutInFlight = true;

  try {
    if (useAuthFlowStore.getState().phase !== 'loggingOut') {
      useAuthFlowStore.getState().begin('loggingOut');
      syncWatchdog();
    }

    // 必须在 privyLogout 之前就占住「本轮已登出」，否则 accountChanged 会再打一次接口
    const backendLogout = postBackendLogoutOnce();

    const privyLogout =
      privyRef.canLogout && privyRef.logout
        ? privyRef.logout().catch(() => undefined)
        : Promise.resolve();

    await raceTimeout(
      Promise.allSettled([backendLogout, privyLogout]),
      AUTH_FLOW_TIMEOUT_MS,
    );

    clearLocalAuth();
  } finally {
    logoutInFlight = false;
  }
}

async function handlePrivyLoginComplete(args: {
  userId: string;
  getAccessToken: () => Promise<string | null>;
}) {
  const userToken = store2.get('userToken');
  if (
    loginInFlight ||
    (Boolean(args.userId) && lastPrivyUserId === args.userId && userToken) ||
    userToken
  ) {
    if (!loginInFlight) {
      stopAuthFlow();
    }
    return;
  }

  loginInFlight = true;
  lastPrivyUserId = args.userId;

  // 真正打后端登录时才持久化 + 30s 超时
  useAuthFlowStore.getState().begin('loggingIn');
  syncWatchdog();

  try {
    const privyToken = await readPrivyAccessToken(args.getAccessToken);
    if (!privyToken) {
      lastPrivyUserId = '';
      return;
    }

    const inviteCodeFromSession = store2.get(INVITE_CODE_SESSION_STORAGE_KEY);
    const inviteCode = inviteCodeFromSession?.trim() ?? '';

    const response = await postUserWalletLogin({
      privyToken,
      inviteCode: INVITE_CODE_PATTERN.test(inviteCode) ? inviteCode : null,
    });

    const loginPayload = response.data as { data?: LoginResponse };
    if (loginPayload?.data) {
      backendLogoutPromise = null;
      useGlobalStore.getState().setUserInfo(loginPayload.data);
      reloadPlayDetailPageIfActive();
    } else {
      lastPrivyUserId = '';
    }
  } catch {
    lastPrivyUserId = '';
  } finally {
    loginInFlight = false;
    stopAuthFlow();
  }
}

function handlePrivyLoginError(errorCode: PrivyErrorCode) {
  const { phase, startedAt } = useAuthFlowStore.getState();
  const error = new Error(`Privy login failed: ${errorCode}`);

  if (!loginInFlight) {
    lastPrivyUserId = '';
    stopAuthFlow();
  }

  if (errorCode === 'exited_auth_flow') {
    return;
  }

  console.error('[useAppLogin] privy.login.failed', {
    errorCode,
    authPhase: phase,
    authStartedAt: startedAt,
    loginInFlight,
    lastPrivyUserId,
    privyUserId: privyRef.userId,
    canLogout: privyRef.canLogout,
  });

  reportError(error, {
    category: 'js',
  });
}

/**
 * 全应用只挂一次（GlobalDialogs 内）。
 * 只绑定 Privy；中心化 login/logout 走 orval 单函数，避免 useMutation 重复触发。
 */
export function AppAuthBridge() {
  const {
    getAccessToken,
    logout: privyLogout,
    ready,
    authenticated,
    user,
  } = usePrivy();

  const { login: privyLogin } = usePrivyLogin({
    onComplete: ({ user: privyUser }) => {
      void handlePrivyLoginComplete({
        userId: privyUser.id,
        getAccessToken,
      });
    },
    onError: handlePrivyLoginError,
  });

  privyRef.login = privyLogin;
  privyRef.logout = privyLogout;
  privyRef.getAccessToken = getAccessToken;
  privyRef.userId = user?.id ?? '';
  privyRef.canLogout = Boolean(ready && authenticated);

  useLayoutEffect(() => {
    syncWatchdog();
  }, []);

  return null;
}

export function useAppLogin() {
  const phase = useAuthFlowStore((state) => state.phase);

  return {
    login,
    logout,
    isLogging: phase === 'loggingIn',
    isLoggingOut: phase === 'loggingOut',
  };
}
