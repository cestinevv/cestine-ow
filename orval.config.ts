import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'orval';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const orvalMode = process.env.ORVAL_MODE ?? 'development';
const envFile =
  orvalMode === 'testenv'
    ? resolve(rootDir, '.env.testenv')
    : resolve(rootDir, '.env.development');

loadEnv({ path: envFile });

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} in ${envFile}`);
  }

  return value;
}

export default defineConfig({
  story: {
    output: {
      mode: 'tags-split',
      clean: true,
      target: './src/api/__generated__/story/index.ts',
      schemas: './src/api/__generated__/story/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/appRequest.ts',
          name: 'appAxiosInstance',
        },
        query: {
          useSuspenseQuery: true,
        },
      },
    },
    input: {
      target: requireEnv('ORVAL_STORY_OPENAPI_URL'),
      override: {
        transformer: './scripts/orval/filter-internal-openapi-transform.ts',
      },
    },
    hooks: {
      afterAllFilesWrite: 'npx biome check --write',
    },
  },
  mining: {
    output: {
      mode: 'tags-split',
      clean: true,
      target: './src/api/__generated__/mining/index.ts',
      schemas: './src/api/__generated__/mining/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/appRequest.ts',
          name: 'appAxiosInstance',
        },
        query: {
          useSuspenseQuery: true,
        },
      },
    },
    input: {
      target: requireEnv('ORVAL_MINING_OPENAPI_URL'),
      override: {
        transformer: './scripts/orval/filter-internal-openapi-transform.ts',
      },
    },
    hooks: {
      afterAllFilesWrite: 'npx biome check --write',
    },
  },
  recommend: {
    output: {
      mode: 'tags-split',
      clean: true,
      target: './src/api/__generated__/recommend/index.ts',
      schemas: './src/api/__generated__/recommend/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/appRequest.ts',
          name: 'appAxiosInstance',
        },
        query: {
          useSuspenseQuery: true,
        },
      },
    },
    input: {
      target: requireEnv('ORVAL_RECOMMEND_OPENAPI_URL'),
      override: {
        transformer: './scripts/orval/recommend-openapi-transform.ts',
      },
    },
    hooks: {
      afterAllFilesWrite: 'npx biome check --write',
    },
  },
  wallet: {
    output: {
      mode: 'tags-split',
      clean: true,
      target: './src/api/__generated__/wallet/index.ts',
      schemas: './src/api/__generated__/wallet/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/appRequest.ts',
          name: 'appAxiosInstance',
        },
        query: {
          useSuspenseQuery: true,
        },
      },
    },
    input: {
      target: requireEnv('ORVAL_WALLET_OPENAPI_URL'),
      override: {
        transformer: './scripts/orval/wallet-openapi-transform.ts',
      },
    },
    hooks: {
      afterAllFilesWrite: 'npx biome check --write',
    },
  },
  admin: {
    output: {
      mode: 'tags-split',
      clean: true,
      target: './src/api/__generated__/admin/index.ts',
      schemas: './src/api/__generated__/admin/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/appRequest.ts',
          name: 'appAxiosInstance',
        },
        query: {
          useSuspenseQuery: true,
        },
      },
    },
    input: {
      target: './api-admin.yaml',
    },
    hooks: {
      afterAllFilesWrite: 'npx biome check --write',
    },
  },
});
