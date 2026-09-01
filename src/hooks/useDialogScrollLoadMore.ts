import { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

/** 向上查找最近的纵向滚动容器，供 useInView 作为 root */
function getVerticalScrollParent(el: HTMLElement | null): Element | null {
  let node = el?.parentElement ?? null;

  while (node) {
    const { overflowY } = window.getComputedStyle(node);

    if (overflowY === 'auto' || overflowY === 'scroll') {
      return node;
    }

    node = node.parentElement;
  }

  return null;
}

/**
 * Dialog 内无限滚动：
 * - 以弹窗内层 overflow 容器为 intersection root（避免相对视口误判）
 * - 须先有用户滚动，再允许翻页（避免打开即连拉）
 * - 每次哨兵进入可视区只触发一页；须离开可视区后再次进入才允许下一页
 */
export function useDialogScrollLoadMore(open: boolean) {
  const [scrollRoot, setScrollRoot] = useState<Element | null>(null);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const loadArmedRef = useRef(true);

  const { ref, inView } = useInView({
    root: scrollRoot,
    threshold: 0,
  });

  useEffect(() => {
    if (open) {
      return;
    }

    setHasUserScrolled(false);
    setScrollRoot(null);
    loadArmedRef.current = true;
  }, [open]);

  useEffect(() => {
    if (!inView) {
      loadArmedRef.current = true;
    }
  }, [inView]);

  useEffect(() => {
    if (!open || !scrollRoot) {
      return;
    }

    const handleScroll = () => {
      setHasUserScrolled(true);
    };

    scrollRoot.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollRoot.removeEventListener('scroll', handleScroll);
    };
  }, [open, scrollRoot]);

  // 哨兵挂载后绑定 Dialog 内层 overflow 滚动区为 intersection root。
  const handleSentinelRef = (node: HTMLDivElement | null) => {
    ref(node);
    setScrollRoot(node ? getVerticalScrollParent(node) : null);
  };

  const canFetchNextPage = Boolean(
    open && scrollRoot && hasUserScrolled && inView && loadArmedRef.current,
  );

  // 消费一次翻页资格；哨兵离开可视区后会重新上膛
  const markLoadMoreTriggeredRef = useRef(() => {
    loadArmedRef.current = false;
  });

  return {
    handleSentinelRef,
    canFetchNextPage,
    markLoadMoreTriggered: markLoadMoreTriggeredRef.current,
  };
}
