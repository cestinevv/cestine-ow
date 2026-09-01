import { create } from 'zustand';

/** 登录 / 登出进行中的最长等待；超时后强制清空本地登录态 */
export const AUTH_FLOW_TIMEOUT_MS = 30_000;

const AUTH_FLOW_STORAGE_KEY = 'onestory-auth-flow';

export type AuthFlowPhase = 'idle' | 'loggingIn' | 'loggingOut';

type AuthFlowState = {
  phase: AuthFlowPhase;
  startedAt: number | null;
  /**
   * 进入登录中 / 登出中。
   * persist: false 只改 UI（Privy 邮箱 OTP 等待），不写 sessionStorage，避免刷新后卡死。
   */
  begin: (
    phase: Exclude<AuthFlowPhase, 'idle'>,
    options?: { persist?: boolean },
  ) => void;
  /** 回到空闲并清掉 sessionStorage */
  reset: () => void;
};

/** 把进行中状态写入 / 清掉 sessionStorage；隐私模式失败时忽略 */
function writeAuthFlowSession(phase: AuthFlowPhase, startedAt: number | null) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (phase === 'idle') {
      window.sessionStorage.removeItem(AUTH_FLOW_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      AUTH_FLOW_STORAGE_KEY,
      JSON.stringify({ phase, startedAt }),
    );
  } catch {
    // 隐私模式或配额满时忽略
  }
}

export const useAuthFlowStore = create<AuthFlowState>((set) => ({
  phase: 'idle',
  startedAt: null,
  begin: (phase, options) => {
    const startedAt = Date.now();
    if (options?.persist === false) {
      writeAuthFlowSession('idle', null);
    } else {
      writeAuthFlowSession(phase, startedAt);
    }
    set({ phase, startedAt });
  },
  reset: () => {
    writeAuthFlowSession('idle', null);
    set({ phase: 'idle', startedAt: null });
  },
}));

let didHydrateAuthFlowStore = false;

/**
 * 客户端把 sessionStorage 里的进行中状态灌进 store。
 * 只执行一次，避免刷新后首屏丢失「登录中 / 登出中」。
 */
export function hydrateAuthFlowStoreFromStorage() {
  if (typeof window === 'undefined' || didHydrateAuthFlowStore) {
    return;
  }

  didHydrateAuthFlowStore = true;

  try {
    const raw = window.sessionStorage.getItem(AUTH_FLOW_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as {
      phase?: unknown;
      startedAt?: unknown;
    };
    const phase =
      parsed.phase === 'loggingIn' || parsed.phase === 'loggingOut'
        ? parsed.phase
        : 'idle';

    if (phase === 'idle') {
      return;
    }

    const startedAt =
      typeof parsed.startedAt === 'number' && Number.isFinite(parsed.startedAt)
        ? parsed.startedAt
        : Date.now();

    useAuthFlowStore.setState({ phase, startedAt });
  } catch {
    // 坏数据或 sessionStorage 不可用时保持 idle
  }
}
