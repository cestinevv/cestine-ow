import type { RegisteredRouter } from '@tanstack/react-router';

export const NEW_TAB_ROUTE_LINK_PROPS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;

type NewTabRouteLocation =
  | {
      to: '/profile/$userId';
      params: { userId: string };
    }
  | {
      to: '/actor/$actorId';
      params: { actorId: string };
    };

/** 程序化在新标签页打开站内路由（Button / 弹窗等无 Link 场景） */
export function openRouteInNewTab(
  router: RegisteredRouter,
  location: NewTabRouteLocation,
) {
  const href = router.buildLocation(location).href;
  window.open(href, '_blank', 'noopener,noreferrer');
}
