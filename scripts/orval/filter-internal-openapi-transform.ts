import { defineTransformer } from 'orval';

import { prepareFrontendOpenApiSpec } from './filter-internal-paths.js';

/** Story / Mining 等：剔除 `/internal`，并收回无冲突的 `_N` operationId。 */
export default defineTransformer((spec) => prepareFrontendOpenApiSpec(spec));