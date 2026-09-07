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
  define: {
    __DEBUG__: true,
  },
  test: {
    pool: 'threads',
    environment: 'node',
    testTimeout: 90_000,
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
        lines: 30,
        functions: 28,
        branches: 25,
        statements: 31,

        // PER-FILE floors for the retained-era modules. The package-wide floors
        // above are in the low thirties, so ~1,200 lines of new orchestration
        // could lose most of its coverage without any of them moving. These
        // pin the three files at what they actually achieve, so a gap becomes a
        // failing build rather than an omission nobody sees.
        //
        // A per-glob entry is an EXTRA gate, not an exclusion from the global
        // one, and a glob matching no file is ignored SILENTLY — so moving or
        // renaming one of these files deletes its floor with no warning. If a
        // number here ever has to come down, replace it with the real achieved
        // figure and say why in this comment; never relax it quietly.
        //
        // `era.ts` and `ledger8-entry.ts` sit below 100 for reasons that are
        // type-level rather than test-level: both close their era switches on
        // `const unhandled: never`, which no caller can reach without a cast,
        // and `ledger8-entry.ts` additionally carries an
        // `IncompleteCallTxPrivateStateConfig` throw that the provider type
        // makes unreachable for a typed caller.
        'src/internal/ledger8-pipeline.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/internal/ledger8-entry.ts': { lines: 97, functions: 100, branches: 89, statements: 97 },
        'src/internal/era.ts': { lines: 87, functions: 100, branches: 88, statements: 87 }
      }
    },
    reporters: [
      'default',
      ['junit', { outputFile: `reports/report/test-report.xml` }],
      ['html', { outputFile: `reports/report/test-report.html` }]
    ],
    // Compile-level assertions (`expectTypeOf`, `@ts-expect-error`) assert
    // nothing at plain runtime -- vitest's typecheck pass is what turns tsc
    // diagnostics against them into failing tests. Those files use vitest's
    // `*.test-d.ts` convention, which is this pass's default `include`, so a
    // new compile-level test is picked up by naming alone; a hardcoded file
    // list would silently stop guarding one that was added or renamed.
    // `test.include` above matches only `*.test.ts`, so they do not also run
    // as no-op runtime suites.
    typecheck: {
      enabled: true
    }
  },
  resolve: {
    alias: {
      '@midnight-ntwrk/onchain-runtime': '@midnight-ntwrk/onchain-runtime-cjs'
    }
  }
});
