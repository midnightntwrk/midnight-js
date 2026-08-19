/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      enabled: true,
      clean: true,
      include: ['src/**/*.ts'],
      exclude: ['**/test/**'],
      reporter: ['clover', 'json', 'json-summary', 'lcov', 'text'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
        // Per-glob floors for the dual-ledger engine seam. All at 100 —
        // every engine file currently achieves full coverage. If a lower
        // bound is ever PR-justified, replace the literal 100 for that glob
        // with the real achieved number and say why in a comment here, never
        // silently relax it. If v8 coverage instrumentation ever times out
        // against a large/slow WASM call in one of these suites, exclude
        // that suite from instrumentation (vitest coverage.exclude) instead
        // — never fix a timeout by padding the test timeout.
        'src/version.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/engine/envelope.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/engine/down-convert.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/engine/instance-guard.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/engine/execute.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/engine/wrap-v9.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/engine/compose-v8.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/engine/deploy-v8.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/engine/index.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/engine/load-engine.ts': { lines: 100, functions: 100, branches: 100, statements: 100 }
      }
    },
    reporters: [
      'default',
      ['junit', { outputFile: `reports/report/test-report.xml` }],
      ['html', { outputFile: `reports/report/test-report.html` }],
    ],
  },
});
