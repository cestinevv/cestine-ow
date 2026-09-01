import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { MOBILE_MAX_WIDTH_MEDIA_QUERY } from '@/hooks/useAppBreakpoints';
import { Route } from '@/routes/whitepaper';

import {
  WHITEPAPER_ALL_ANCHOR_IDS,
  WHITEPAPER_HEADER_SECTION_IDS,
  WHITEPAPER_SECTION_IDS,
  WHITEPAPER_TOC_HEADER_GAP_PX,
} from '../whitepaperToc';

const MOBILE_TOC_BAR_HEIGHT = 48;
const MOBILE_TOC_STICKY_GAP = 16;
const TOC_ACTIVE_INDICATOR_H = 13;

function getGlobalHeader(): HTMLElement | null {
  return document.querySelector('header.sticky.top-0') as HTMLElement | null;
}

function isMobileViewport(): boolean {
  return window.matchMedia(MOBILE_MAX_WIDTH_MEDIA_QUERY).matches;
}

function getAnchorScrollOffset(): number {
  const headerHeight = getGlobalHeader()?.offsetHeight ?? 0;
  const mobileExtraOffset = isMobileViewport()
    ? MOBILE_TOC_STICKY_GAP + MOBILE_TOC_BAR_HEIGHT + MOBILE_TOC_STICKY_GAP
    : 0;

  return headerHeight + WHITEPAPER_TOC_HEADER_GAP_PX + mobileExtraOffset;
}

function scrollToAnchorId(sectionId: string, behavior: ScrollBehavior) {
  const targetElement = document.getElementById(sectionId);
  if (!targetElement) return;

  const anchorOffset = getAnchorScrollOffset();
  const targetTop =
    targetElement.getBoundingClientRect().top + window.scrollY - anchorOffset;

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior,
  });
}

function syncTocNavScroll(
  navElement: HTMLElement | null,
  activeItemElement: HTMLLIElement | null,
) {
  if (!navElement || !activeItemElement) return;

  const navRect = navElement.getBoundingClientRect();
  const itemRect = activeItemElement.getBoundingClientRect();
  const itemOffsetFromNavTop =
    itemRect.top - navRect.top + navElement.scrollTop;
  const navHeight = navElement.clientHeight;
  const itemHeight = activeItemElement.offsetHeight;
  const targetScroll = itemOffsetFromNavTop - navHeight / 2 + itemHeight / 2;

  navElement.scrollTop = Math.max(
    0,
    Math.min(targetScroll, navElement.scrollHeight - navHeight),
  );
}

export function useWhitepaperTocNavigation() {
  const navigate = Route.useNavigate();
  const [activeTocIndex, setActiveTocIndex] = useState(0);
  const [activeDotTop, setActiveDotTop] = useState(20);
  const tocNavRef = useRef<HTMLElement | null>(null);
  const tocListRef = useRef<HTMLUListElement | null>(null);
  const tocItemRefs = useRef<Array<HTMLLIElement | null>>([]);

  const syncTocListScroll = (index: number) => {
    syncTocNavScroll(tocNavRef.current, tocItemRefs.current[index] ?? null);
  };

  useEffect(() => {
    const updateActiveTocIndex = () => {
      const headerHeight = getGlobalHeader()?.offsetHeight ?? 0;
      const activationOffset = headerHeight + WHITEPAPER_TOC_HEADER_GAP_PX;
      let nextActiveIndex = 0;

      WHITEPAPER_SECTION_IDS.forEach((sectionId, index) => {
        const sectionElement = document.getElementById(sectionId);
        if (!sectionElement) return;
        const sectionTop = sectionElement.getBoundingClientRect().top;
        if (sectionTop <= activationOffset) {
          nextActiveIndex = index;
        }
      });

      const scrollHeight = document.documentElement.scrollHeight;
      const documentScrollable = scrollHeight > window.innerHeight + 2;
      const scrolledToBottom =
        documentScrollable &&
        window.scrollY + window.innerHeight >= scrollHeight - 1;

      if (scrolledToBottom) {
        for (
          let index = WHITEPAPER_SECTION_IDS.length - 1;
          index >= 0;
          index -= 1
        ) {
          const sectionId = WHITEPAPER_SECTION_IDS[index];
          if (sectionId && document.getElementById(sectionId)) {
            nextActiveIndex = index;
            break;
          }
        }
      }

      setActiveTocIndex((previousIndex) =>
        previousIndex === nextActiveIndex ? previousIndex : nextActiveIndex,
      );
    };

    const applyHashFromLocation = () => {
      const raw = window.location.hash.replace(/^#/, '');
      if (!raw) return;

      const anchorIndex = (
        WHITEPAPER_ALL_ANCHOR_IDS as readonly string[]
      ).indexOf(raw);
      if (anchorIndex < 0) return;

      scrollToAnchorId(raw, 'auto');

      const headerIndex = (
        WHITEPAPER_HEADER_SECTION_IDS as readonly string[]
      ).indexOf(raw);
      if (headerIndex < 0) {
        const tocIndex = (WHITEPAPER_SECTION_IDS as readonly string[]).indexOf(
          raw,
        );
        if (tocIndex >= 0) {
          setActiveTocIndex(tocIndex);
          window.requestAnimationFrame(() => {
            syncTocNavScroll(
              tocNavRef.current,
              tocItemRefs.current[tocIndex] ?? null,
            );
          });
        }
      }
    };

    const handleHashChange = () => {
      applyHashFromLocation();
      updateActiveTocIndex();
    };

    updateActiveTocIndex();
    window.addEventListener('scroll', updateActiveTocIndex, { passive: true });
    window.addEventListener('resize', updateActiveTocIndex);
    window.addEventListener('hashchange', handleHashChange);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        applyHashFromLocation();
        updateActiveTocIndex();
      });
    });

    return () => {
      window.removeEventListener('scroll', updateActiveTocIndex);
      window.removeEventListener('resize', updateActiveTocIndex);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useLayoutEffect(() => {
    const updateActiveDotTop = () => {
      const activeItemElement = tocItemRefs.current[activeTocIndex];
      if (!activeItemElement) return;

      const nextTop =
        activeItemElement.offsetTop +
        activeItemElement.offsetHeight / 2 -
        TOC_ACTIVE_INDICATOR_H / 2;
      setActiveDotTop(nextTop);
    };

    updateActiveDotTop();
    window.addEventListener('resize', updateActiveDotTop);

    return () => {
      window.removeEventListener('resize', updateActiveDotTop);
    };
  }, [activeTocIndex]);

  const handleNavigateToSection = (index: number) => {
    const targetId = WHITEPAPER_SECTION_IDS[index];
    if (!targetId) return;

    scrollToAnchorId(targetId, 'smooth');
    setActiveTocIndex(index);
    syncTocListScroll(index);
    void navigate({
      to: '/whitepaper',
      hash: targetId,
      replace: true,
    });
  };

  return {
    activeTocIndex,
    activeDotTop,
    tocNavRef,
    tocListRef,
    tocItemRefs,
    handleNavigateToSection,
  };
}
