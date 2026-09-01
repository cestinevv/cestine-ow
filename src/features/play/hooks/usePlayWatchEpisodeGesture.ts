import { useDrag } from '@use-gesture/react';
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { useCallback, useEffect, useRef } from 'react';

const SLIDE_DURATION_MS = 280;
const SNAP_BACK_MS = 240;
const SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DISTANCE_THRESHOLD = 0.2;
const VELOCITY_THRESHOLD = 0.45;
const RUBBER_BAND = 0.35;
/** 上下都曾滑过该比例屏高，视为来回滑动 */
const OSCILLATION_TRAVEL_RATIO = 0.1;
/** 主方向行程须明显大于反方向，避免来回晃误触 */
const DIRECTION_DOMINANCE_RATIO = 1.35;
/** 速度切集须达到的最小行程，避免点击按钮等微动误触 */
const VELOCITY_MIN_TRAVEL_RATIO = 0.08;
/** 轻点/点击允许的最大位移（px），超过才视为滑动手势 */
const TAP_SLOP_PX = 40;

export type PlayWatchEpisodeSlideDirection = 'up' | 'down';

type UsePlayWatchEpisodeGestureOptions = {
  enabled?: boolean;
  canSwipeUp?: boolean;
  canSwipeDown?: boolean;
  /** 返回 onSwap（切集瞬间执行）；返回 null 表示不切换（边界/锁定等） */
  onCommit?: (direction: PlayWatchEpisodeSlideDirection) => (() => void) | null;
};

/** 阻止触摸冒泡到滑动手势层，避免按钮点击被 @use-gesture 吞掉 */
export function playWatchStopGestureBubble(
  event: ReactPointerEvent | ReactTouchEvent,
) {
  event.stopPropagation();
}

/** 判断目标元素是否在"禁止手势"区域内（可被 tap 层复用） */
export function isGestureBlockedTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest('[data-play-watch-scroll]') ||
      target.closest('[data-play-watch-no-swipe]'),
  );
}

/** 跟手垂直滑切 + 程序化切集动画（@use-gesture/react） */
export function usePlayWatchEpisodeGesture({
  enabled = true,
  canSwipeUp = true,
  canSwipeDown = true,
  onCommit,
}: UsePlayWatchEpisodeGestureOptions) {
  const slideNodeRef = useRef<HTMLDivElement | null>(null);
  const isAnimatingRef = useRef(false);
  const animationTimersRef = useRef<number[]>([]);
  const gesturePeaksRef = useRef({ minY: 0, maxY: 0 });

  const enabledRef = useRef(enabled);
  const canSwipeUpRef = useRef(canSwipeUp);
  const canSwipeDownRef = useRef(canSwipeDown);
  const onCommitRef = useRef(onCommit);

  enabledRef.current = enabled;
  canSwipeUpRef.current = canSwipeUp;
  canSwipeDownRef.current = canSwipeDown;
  onCommitRef.current = onCommit;

  const clearAnimationTimers = useCallback(() => {
    for (const timerId of animationTimersRef.current) {
      window.clearTimeout(timerId);
    }
    animationTimersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timerId = window.setTimeout(callback, delay);
    animationTimersRef.current.push(timerId);
    return timerId;
  }, []);

  const snapBack = useCallback(
    (node: HTMLDivElement) => {
      clearAnimationTimers();
      isAnimatingRef.current = false;
      node.style.transition = `transform ${SNAP_BACK_MS}ms ${SLIDE_EASING}`;
      node.style.transform = 'translateY(0)';
    },
    [clearAnimationTimers],
  );

  const runExitEnter = useCallback(
    (
      direction: PlayWatchEpisodeSlideDirection,
      onSwap: () => void,
      fromPx = 0,
    ) => {
      const node = slideNodeRef.current;
      if (!node) {
        onSwap();
        return false;
      }

      clearAnimationTimers();
      isAnimatingRef.current = true;

      const height = node.clientHeight || window.innerHeight;
      const exitOffset = direction === 'up' ? -height : height;
      const enterOffset = direction === 'up' ? height : -height;

      if (fromPx !== 0) {
        node.style.transition = 'none';
        node.style.transform = `translateY(${fromPx}px)`;
      }

      requestAnimationFrame(() => {
        if (!node.isConnected) {
          onSwap();
          isAnimatingRef.current = false;
          return;
        }

        node.style.transition = `transform ${SLIDE_DURATION_MS}ms ${SLIDE_EASING}`;
        node.style.transform = `translateY(${exitOffset}px)`;

        schedule(() => {
          onSwap();

          // 切条可能重挂整页，旧节点已卸载则结束动画
          if (!node.isConnected) {
            isAnimatingRef.current = false;
            return;
          }

          node.style.transition = 'none';
          node.style.transform = `translateY(${enterOffset}px)`;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!node.isConnected) {
                isAnimatingRef.current = false;
                return;
              }

              node.style.transition = `transform ${SLIDE_DURATION_MS}ms ${SLIDE_EASING}`;
              node.style.transform = 'translateY(0)';

              schedule(() => {
                isAnimatingRef.current = false;
              }, SLIDE_DURATION_MS);
            });
          });
        }, SLIDE_DURATION_MS);
      });

      return true;
    },
    [clearAnimationTimers, schedule],
  );

  const runSlide = useCallback(
    (direction: PlayWatchEpisodeSlideDirection, onSwap: () => void) => {
      if (isAnimatingRef.current) {
        clearAnimationTimers();
        isAnimatingRef.current = false;
      }

      return runExitEnter(direction, onSwap, 0);
    },
    [clearAnimationTimers, runExitEnter],
  );

  const isSliding = useCallback(() => isAnimatingRef.current, []);

  const resolveCommitDirection = (
    height: number,
    my: number,
    vy: number,
    peaks: { minY: number; maxY: number },
  ): PlayWatchEpisodeSlideDirection | null => {
    const upTravel = Math.max(0, -peaks.minY);
    const downTravel = Math.max(0, peaks.maxY);
    const oscillationMinPx = height * OSCILLATION_TRAVEL_RATIO;
    const distanceMinPx = height * DISTANCE_THRESHOLD;

    const hasOscillation =
      upTravel >= oscillationMinPx && downTravel >= oscillationMinPx;
    const upDominates = upTravel > downTravel * DIRECTION_DOMINANCE_RATIO;
    const downDominates = downTravel > upTravel * DIRECTION_DOMINANCE_RATIO;

    if (hasOscillation && !upDominates && !downDominates) {
      return null;
    }

    const distanceCommitUp = upTravel >= distanceMinPx && upTravel > downTravel;
    const distanceCommitDown =
      downTravel >= distanceMinPx && downTravel > upTravel;

    const velocityMinPx = height * VELOCITY_MIN_TRAVEL_RATIO;
    const velocityCommitUp =
      vy < -VELOCITY_THRESHOLD &&
      upTravel >= velocityMinPx &&
      upTravel > downTravel;
    const velocityCommitDown =
      vy > VELOCITY_THRESHOLD &&
      downTravel >= velocityMinPx &&
      downTravel > upTravel;

    const wantsUp = distanceCommitUp || velocityCommitUp;
    const wantsDown = distanceCommitDown || velocityCommitDown;

    if (wantsUp && !wantsDown) {
      return 'up';
    }

    if (wantsDown && !wantsUp) {
      return 'down';
    }

    if (wantsUp && wantsDown) {
      return upTravel >= downTravel ? 'up' : 'down';
    }

    if (
      Math.abs(my) < distanceMinPx * 0.5 &&
      Math.abs(vy) < VELOCITY_THRESHOLD
    ) {
      return null;
    }

    return null;
  };

  useDrag(
    ({ movement: [, my], velocity: [, vy], last, first, event, cancel }) => {
      if (!enabledRef.current) {
        if (first) {
          cancel();
        }
        return;
      }

      if (isGestureBlockedTarget(event.target)) {
        cancel();
        return;
      }

      const node = slideNodeRef.current;
      if (!node) {
        return;
      }

      if (first) {
        gesturePeaksRef.current = { minY: 0, maxY: 0 };

        if (isAnimatingRef.current) {
          clearAnimationTimers();
          isAnimatingRef.current = false;
          node.style.transition = 'none';
        }
      }

      gesturePeaksRef.current.minY = Math.min(gesturePeaksRef.current.minY, my);
      gesturePeaksRef.current.maxY = Math.max(gesturePeaksRef.current.maxY, my);

      if (!last) {
        let dragY = my;

        if (!canSwipeUpRef.current && dragY < 0) {
          dragY *= RUBBER_BAND;
        }

        if (!canSwipeDownRef.current && dragY > 0) {
          dragY *= RUBBER_BAND;
        }

        node.style.transition = 'none';
        node.style.transform = `translateY(${dragY}px)`;
        return;
      }

      const upTravel = Math.max(0, -gesturePeaksRef.current.minY);
      const downTravel = Math.max(0, gesturePeaksRef.current.maxY);
      const totalTravel = Math.max(upTravel, downTravel);

      // 位移小于阈值视为轻点，仅做回弹；播放/暂停由 MobileTapLayer 独立处理
      if (totalTravel < TAP_SLOP_PX && Math.abs(my) < TAP_SLOP_PX) {
        snapBack(node);
        return;
      }

      const height = node.clientHeight || window.innerHeight;
      const direction = resolveCommitDirection(
        height,
        my,
        vy,
        gesturePeaksRef.current,
      );

      if (direction === 'up' && canSwipeUpRef.current) {
        const onSwap = onCommitRef.current?.('up') ?? null;
        if (onSwap) {
          runExitEnter('up', onSwap, my);
          return;
        }

        snapBack(node);
        return;
      }

      if (direction === 'down' && canSwipeDownRef.current) {
        const onSwap = onCommitRef.current?.('down') ?? null;
        if (onSwap) {
          runExitEnter('down', onSwap, my);
          return;
        }

        snapBack(node);
        return;
      }

      snapBack(node);
    },
    {
      target: slideNodeRef,
      axis: 'y',
      pointer: { touch: true },
      filterTaps: false,
      eventOptions: { passive: false },
      enabled: true,
    },
  );

  useEffect(() => {
    return () => {
      clearAnimationTimers();
    };
  }, [clearAnimationTimers]);

  return {
    slideRef: slideNodeRef,
    runSlide,
    isSliding,
  };
}
