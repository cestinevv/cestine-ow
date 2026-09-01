import type { ComponentType, SVGProps } from 'react';

import IconSiteNav1011Off from '@/assets/svg/IconSiteNav1011Off';
import IconSiteNav1011On from '@/assets/svg/IconSiteNav1011On';
import IconSiteNavAgentOff from '@/assets/svg/IconSiteNavAgentOff';
import IconSiteNavAgentOn from '@/assets/svg/IconSiteNavAgentOn';
import IconSiteNavDramaOff from '@/assets/svg/IconSiteNavDramaOff';
import IconSiteNavDramaOn from '@/assets/svg/IconSiteNavDramaOn';
import IconSiteNavHomeOff from '@/assets/svg/IconSiteNavHomeOff';
import IconSiteNavHomeOn from '@/assets/svg/IconSiteNavHomeOn';
import IconSiteNavIpOff from '@/assets/svg/IconSiteNavIpOff';
import IconSiteNavIpOn from '@/assets/svg/IconSiteNavIpOn';
import IconSiteNavMeOff from '@/assets/svg/IconSiteNavMeOff';
import IconSiteNavMeOn from '@/assets/svg/IconSiteNavMeOn';
import IconSiteNavWhitepaperOff from '@/assets/svg/IconSiteNavWhitepaperOff';
import IconSiteNavWhitepaperOn from '@/assets/svg/IconSiteNavWhitepaperOn';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type SiteNavItemId =
  | 'event-1011'
  | 'recommend'
  | 'drama'
  | 'actor-ip'
  | 'agent'
  | 'profile'
  | 'whitepaper';

export type SiteNavItem = {
  id: SiteNavItemId;
  /** 含中文的 i18n key；与 label 二选一 */
  labelKey?: string;
  /** 英文常量等不进 i18n 的文案 */
  label?: string;
  to: string;
  requireLogin?: boolean;
  activeIcon: IconComponent;
  inactiveIcon: IconComponent;
};

/** 主区导航（分隔线之上）— Figma 5:565 */
export const SITE_PRIMARY_NAV_ITEMS: readonly SiteNavItem[] = [
  {
    id: 'recommend',
    labelKey: '推荐',
    to: '/',
    activeIcon: IconSiteNavHomeOn,
    inactiveIcon: IconSiteNavHomeOff,
  },
  {
    id: 'drama',
    labelKey: '短剧',
    to: '/play',
    activeIcon: IconSiteNavDramaOn,
    inactiveIcon: IconSiteNavDramaOff,
  },
  {
    id: 'actor-ip',
    labelKey: 'IP市场',
    to: '/actor',
    activeIcon: IconSiteNavIpOn,
    inactiveIcon: IconSiteNavIpOff,
  },
  {
    id: 'agent',
    labelKey: '经纪人',
    to: '/game',
    requireLogin: true,
    activeIcon: IconSiteNavAgentOn,
    inactiveIcon: IconSiteNavAgentOff,
  },
  {
    id: 'profile',
    labelKey: '我的',
    to: '/profile',
    requireLogin: true,
    activeIcon: IconSiteNavMeOn,
    inactiveIcon: IconSiteNavMeOff,
  },
] as const;

/** 次级导航（分隔线之下） */
export const SITE_SECONDARY_NAV_ITEMS: readonly SiteNavItem[] = [
  {
    id: 'whitepaper',
    labelKey: '白皮书',
    to: '/whitepaper',
    activeIcon: IconSiteNavWhitepaperOn,
    inactiveIcon: IconSiteNavWhitepaperOff,
  },
] as const;

/** 顶栏「1011」入口（侧栏 logo 下）；临时隐藏，改 true 即可重新开放 */
export const SHOW_SITE_EVENT_NAV = false;

export const SITE_EVENT_NAV_ITEM: SiteNavItem = {
  id: 'event-1011',
  label: '1011',
  to: '/1011',
  activeIcon: IconSiteNav1011On,
  inactiveIcon: IconSiteNav1011Off,
};

export function isSiteNavPathActive(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/';
  }

  // 「我的」仅命中本人主页，不含 `/profile/$userId` 等他人主页
  if (to === '/profile') {
    return pathname === '/profile' || pathname === '/profile/';
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}

export function isActorDetailPath(pathname: string): boolean {
  return /^\/actor\/[^/]+$/.test(pathname);
}
