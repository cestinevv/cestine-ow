import { useEffect, useState } from 'react';

/** 与 `app.css` `@theme --breakpoint-md` / `--breakpoint-lg` 同步 */
export const BREAKPOINT_MD_PX = 768.5;
export const BREAKPOINT_LG_PX = 1024.5;

/** `<md` 视口（含 =768）：与 `--breakpoint-md: 768.5px` 取反 */
export const MOBILE_MAX_WIDTH_MEDIA_QUERY = `(max-width: ${BREAKPOINT_MD_PX - 0.01}px)`;

/** `≥md` 视口：与 `--breakpoint-md` 一致 */
export const MD_MIN_WIDTH_MEDIA_QUERY = `(min-width: ${BREAKPOINT_MD_PX}px)`;

export function useAppBreakpoints() {
  const [isMatchMobile, setIsMatchMobile] = useState(false);
  const [isMatchPad, setIsMatchPad] = useState(false);
  const [isMatchPc, setIsMatchPc] = useState(false);

  const [isUpSm, setIsUpSm] = useState(false);
  const [isDownSm, setIsDownSm] = useState(false);
  const [isUpMd, setIsUpMd] = useState(false);
  const [isDownMd, setIsDownMd] = useState(false);
  const [isUpLg, setIsUpLg] = useState(false);
  const [isDownLg, setIsDownLg] = useState(false);
  const [isUpXl, setIsUpXl] = useState(false);
  const [isDownXl, setIsDownXl] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      const sm = width >= 640;
      const md = width >= BREAKPOINT_MD_PX;
      const lg = width >= BREAKPOINT_LG_PX;
      const xl = width >= 1280;

      setIsUpSm(sm);
      setIsDownSm(!sm);
      setIsUpMd(md);
      setIsDownMd(!md);
      setIsUpLg(lg);
      setIsDownLg(!lg);
      setIsUpXl(xl);
      setIsDownXl(!xl);

      setIsMatchMobile(!md);
      setIsMatchPad(md && !lg);
      setIsMatchPc(lg);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMatchMobile,
    isMatchPad,
    isMatchPc,
    isUpMd,
    isUpXl,
    isDownXl,
    isDownLg,
    isUpLg,
    isDownSm,
    isUpSm,
    isDownMd,
  };
}
