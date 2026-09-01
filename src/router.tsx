import './polyfills';
import {
  createRouter,
  parseSearchWith,
  stringifySearchWith,
} from '@tanstack/react-router';
import { bootstrapObservability } from '@/lib/bootstrapObservability';
import { queryClient } from '@/queryClient';

import '@/i18n';
import { routeTree } from './routeTree.gen';

const INTEGER_TEXT_RE = /^\d+$/;
const UNSAFE_INTEGER_TEXT_RE = /^\d{16,}$/;

function isUnsafeIntegerText(value: string): boolean {
  if (!UNSAFE_INTEGER_TEXT_RE.test(value)) {
    return false;
  }

  return BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER);
}

function parseSearchValue(value: string) {
  if (INTEGER_TEXT_RE.test(value)) {
    return value;
  }

  return JSON.parse(value);
}

function stringifySearchValue(value: unknown): string {
  if (typeof value === 'string' && isUnsafeIntegerText(value)) {
    return value;
  }

  return JSON.stringify(value);
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
    },
    defaultPreload: 'intent',
    scrollRestoration: true,
    parseSearch: parseSearchWith(parseSearchValue),
    stringifySearch: stringifySearchWith(
      stringifySearchValue,
      parseSearchValue,
    ),
  });

  // 可观测性：应用早期初始化（env / 业务码钩子集中在 bootstrap 内）
  bootstrapObservability();

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
