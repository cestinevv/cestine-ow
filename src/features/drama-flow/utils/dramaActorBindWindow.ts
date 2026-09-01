import { parseNonNegativeNumber } from '@/utils';

export const DRAMA_ACTOR_BIND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function getActorBindDeadlineMs(onlineAt?: unknown): number | undefined {
  const onlineAtMs = parseNonNegativeNumber(onlineAt);
  if (onlineAtMs === undefined) {
    return undefined;
  }

  return onlineAtMs + DRAMA_ACTOR_BIND_WINDOW_MS;
}

export function isActorBindWindowExpired(
  onlineAt?: unknown,
  now = Date.now(),
): boolean {
  const deadline = getActorBindDeadlineMs(onlineAt);
  if (deadline === undefined) {
    return false;
  }

  return now > deadline;
}
