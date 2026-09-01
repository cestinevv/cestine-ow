import { redirect } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import type { MouseEvent } from 'react';
import { toast } from 'sonner';

import { IS_DEV_ONLY_NAV_FEATURES_ENABLED, SHOW_DEV_ONLY_UI } from '@/utils';

const LOCKED_NAV_TARGETS = new Set([
  '/actor',
  '/game',
  '/income',
  '/invite',
  '/narrator/create-actor',
]);

export function isLockedNavTarget(to: string): boolean {
  return LOCKED_NAV_TARGETS.has(to);
}

export function isLockedRoutePath(pathname: string): boolean {
  return (
    pathname === '/game' ||
    pathname === '/actor' ||
    pathname === '/actor/' ||
    pathname.startsWith('/actor/') ||
    pathname === '/income' ||
    pathname === '/income/' ||
    pathname.startsWith('/income/') ||
    pathname === '/invite' ||
    pathname === '/invite/' ||
    pathname.startsWith('/invite/') ||
    pathname === '/narrator/create-actor' ||
    pathname.startsWith('/narrator/create-actor/')
  );
}

export function guardDevOnlyRouteIfDisabled(): void {
  if (!IS_DEV_ONLY_NAV_FEATURES_ENABLED) {
    throw redirect({ to: '/', replace: true });
  }
}

export function guardDevOnlyUiRouteIfHidden(): void {
  if (!SHOW_DEV_ONLY_UI) {
    throw redirect({ to: '/', replace: true });
  }
}

export function notifyLockedNavIfDisabled(to: string, t: TFunction): boolean {
  if (IS_DEV_ONLY_NAV_FEATURES_ENABLED || !isLockedNavTarget(to)) {
    return false;
  }

  toast.info(t('功能即将开放'));
  return true;
}

export function handleLockedNavClick(
  event: MouseEvent<HTMLAnchorElement>,
  to: string,
  t: TFunction,
): boolean {
  if (!notifyLockedNavIfDisabled(to, t)) {
    return false;
  }

  event.preventDefault();
  return true;
}
