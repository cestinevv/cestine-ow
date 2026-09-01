import { type RefObject, useEffect, useRef } from 'react';

import { isGestureBlockedTarget } from '@/features/play/hooks/usePlayWatchEpisodeGesture';

const WHEEL_THRESHOLD_PX = 48;
const KEY_COOLDOWN_MS = 420;
/** 覆盖一次上下滑出入场动画，避免滚轮惯性在动画结束前再次切条 */
const WHEEL_IDLE_MS = 720;
const LINE_DELTA_PX = 16;

type UsePlayNavigateInputOptions = {
  enabled?: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** 滚轮作用域；不传则监听 window（仍会跳过可滚动/禁滑区域） */
  targetRef?: RefObject<HTMLElement | null>;
};

/**
 * 模块级锁：切条可能重挂播放器，实例内 cooldown 会被清掉，
 * 同一次滚轮惯性会再切一条。
 */
let wheelLocked = false;
let wheelIdleTimer: number | null = null;
let lastNavAt = 0;
let navigateInputInstanceSeed = 0;
let isGlobalListenerMounted = false;

type NavigateInputInstance = {
  id: number;
  enabledRef: RefObject<boolean>;
  canPrevRef: RefObject<boolean>;
  canNextRef: RefObject<boolean>;
  onPrevRef: RefObject<() => void>;
  onNextRef: RefObject<() => void>;
  targetRefInternal: RefObject<RefObject<HTMLElement | null> | undefined>;
  wheelAccumRef: RefObject<number>;
};

let navigateInputInstances: NavigateInputInstance[] = [];

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;

  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT'
  );
}

function normalizeWheelDeltaY(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * LINE_DELTA_PX;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }

  return event.deltaY;
}

function scheduleWheelUnlock() {
  if (wheelIdleTimer !== null) {
    window.clearTimeout(wheelIdleTimer);
  }

  wheelIdleTimer = window.setTimeout(() => {
    wheelLocked = false;
    wheelIdleTimer = null;
  }, WHEEL_IDLE_MS);
}

function getLastEnabledInstance() {
  for (let index = navigateInputInstances.length - 1; index >= 0; index -= 1) {
    const instance = navigateInputInstances[index];

    if (instance.enabledRef.current) {
      return instance;
    }
  }
}

function getWheelInstance(target: EventTarget | null) {
  for (let index = navigateInputInstances.length - 1; index >= 0; index -= 1) {
    const instance = navigateInputInstances[index];

    if (!instance.enabledRef.current) {
      continue;
    }

    const scope = instance.targetRefInternal.current?.current;

    if (scope && target instanceof Node && !scope.contains(target)) {
      continue;
    }

    return instance;
  }
}

function tryNavigate(
  instance: NavigateInputInstance,
  direction: 'prev' | 'next',
) {
  if (!instance.enabledRef.current) {
    return false;
  }

  const now = Date.now();

  if (now - lastNavAt < KEY_COOLDOWN_MS) {
    return false;
  }

  if (direction === 'prev') {
    if (!instance.canPrevRef.current) {
      return false;
    }

    lastNavAt = now;
    instance.onPrevRef.current();
    return true;
  }

  if (!instance.canNextRef.current) {
    return false;
  }

  lastNavAt = now;
  instance.onNextRef.current();
  return true;
}

function handleGlobalKeyDown(event: KeyboardEvent) {
  if (isEditableKeyboardTarget(event.target)) {
    return;
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return;
  }

  const instance = getLastEnabledInstance();

  if (!instance) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  tryNavigate(instance, event.key === 'ArrowUp' ? 'prev' : 'next');
}

function handleGlobalWheel(event: WheelEvent) {
  // 浏览器缩放手势
  if (event.ctrlKey) {
    return;
  }

  if (isGestureBlockedTarget(event.target)) {
    return;
  }

  // 侧栏等可滚动区域不抢切条
  if (
    event.target instanceof Element &&
    event.target.closest('[data-play-immersive-side-panel]')
  ) {
    return;
  }

  const instance = getWheelInstance(event.target);

  if (!instance) {
    return;
  }

  const deltaY = normalizeWheelDeltaY(event);

  if (deltaY === 0) {
    return;
  }

  // 横向滚动不切条
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
    return;
  }

  event.preventDefault();

  if (wheelLocked) {
    return;
  }

  instance.wheelAccumRef.current += deltaY;

  if (Math.abs(instance.wheelAccumRef.current) < WHEEL_THRESHOLD_PX) {
    return;
  }

  const direction = instance.wheelAccumRef.current > 0 ? 'next' : 'prev';
  instance.wheelAccumRef.current = 0;
  wheelLocked = true;
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (tryNavigate(instance, direction)) {
    scheduleWheelUnlock();
    return;
  }

  wheelLocked = false;
}

function mountGlobalListeners() {
  if (isGlobalListenerMounted || typeof window === 'undefined') {
    return;
  }

  isGlobalListenerMounted = true;
  window.addEventListener('keydown', handleGlobalKeyDown, true);
  window.addEventListener('wheel', handleGlobalWheel, {
    passive: false,
    capture: true,
  });
}

function unmountGlobalListenersIfIdle() {
  if (!isGlobalListenerMounted || navigateInputInstances.length > 0) {
    return;
  }

  isGlobalListenerMounted = false;
  window.removeEventListener('keydown', handleGlobalKeyDown, true);
  window.removeEventListener('wheel', handleGlobalWheel, true);
}

/**
 * 播放页切条输入：滚轮 / 键盘上下箭头。
 * 触摸滑动仍由 `usePlayWatchEpisodeGesture` 负责。
 */
export function usePlayNavigateInput({
  enabled = true,
  canPrev,
  canNext,
  onPrev,
  onNext,
  targetRef,
}: UsePlayNavigateInputOptions) {
  const instanceIdRef = useRef(0);
  const enabledRef = useRef(enabled);
  const canPrevRef = useRef(canPrev);
  const canNextRef = useRef(canNext);
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  const targetRefInternal = useRef(targetRef);
  const wheelAccumRef = useRef(0);

  if (instanceIdRef.current === 0) {
    navigateInputInstanceSeed += 1;
    instanceIdRef.current = navigateInputInstanceSeed;
  }

  enabledRef.current = enabled;
  canPrevRef.current = canPrev;
  canNextRef.current = canNext;
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;
  targetRefInternal.current = targetRef;

  useEffect(() => {
    const instance: NavigateInputInstance = {
      id: instanceIdRef.current,
      enabledRef,
      canPrevRef,
      canNextRef,
      onPrevRef,
      onNextRef,
      targetRefInternal,
      wheelAccumRef,
    };

    navigateInputInstances = navigateInputInstances
      .filter((item) => item.id !== instance.id)
      .concat(instance);
    mountGlobalListeners();

    return () => {
      navigateInputInstances = navigateInputInstances.filter(
        (item) => item.id !== instance.id,
      );
      wheelAccumRef.current = 0;
      unmountGlobalListenersIfIdle();
    };
  }, []);
}
