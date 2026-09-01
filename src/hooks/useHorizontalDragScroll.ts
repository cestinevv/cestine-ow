import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';

const DRAG_THRESHOLD_PX = 5;

type DragState = {
  isPointerDown: boolean;
  isDragging: boolean;
  startX: number;
  scrollLeft: number;
};

/** 横向滚动容器：鼠标按住拖动滚动；触控仍走原生 overflow 滑动 */
export function useHorizontalDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    isPointerDown: false,
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const resetDrag = () => {
    dragStateRef.current.isPointerDown = false;
    dragStateRef.current.isDragging = false;
    setIsDragging(false);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) {
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    dragStateRef.current = {
      isPointerDown: true,
      isDragging: false,
      startX: event.clientX,
      scrollLeft: node.scrollLeft,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    const state = dragStateRef.current;

    if (!node || !state.isPointerDown) {
      return;
    }

    const deltaX = event.clientX - state.startX;

    if (!state.isDragging && Math.abs(deltaX) >= DRAG_THRESHOLD_PX) {
      state.isDragging = true;
      setIsDragging(true);
      node.setPointerCapture(event.pointerId);
    }

    if (state.isDragging) {
      node.scrollLeft = state.scrollLeft - deltaX;
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    const wasDragging = dragStateRef.current.isDragging;

    if (!node) {
      resetDrag();
      return;
    }

    if (node.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }

    if (wasDragging) {
      const preventClick = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopImmediatePropagation();
        node.removeEventListener('click', preventClick, true);
      };

      node.addEventListener('click', preventClick, true);
    }

    resetDrag();
  };

  return {
    ref,
    isDragging,
    dragHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
