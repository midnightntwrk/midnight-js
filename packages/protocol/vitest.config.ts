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
        // Per-file floors for the version module and the dual-ledger engine
        // seam. All at 100 — every one of these files currently achieves full
        // coverage. If a lower bound is ever PR-justified, replace the literal
        // 100 for that path with the real achieved number and say why in a
        // comment here, never silently relax it. If v8 coverage
        // instrumentation ever times out against a large/slow WASM call in one
        // of these suites, exclude that suite from instrumentation (vitest
        // coverage.exclude) instead — never fix a timeout by padding the test
        // timeout.
        //
        // Three properties of this mechanism are worth knowing before editing:
        // a glob matching no file is ignored silently, so renaming or moving
        // one of these files deletes its floor without any warning; a glob
        // matching a file with nothing to instrument is the same class of false
        // assurance, so the two declaration-only entries below are marked as
        // such rather than read as protecting anything; and while the global
        // thresholds above are also 100, these entries are redundant. They
        // exist so that a future lowering of the global floor cannot quietly
        // take these files down with it — do not delete them as dead config.
        'src/version.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },

        // Grouped by the directory each module lives in, so one era's floors
        // read as a block and a move that forgets an entry is visible as a gap
        // in the group rather than as a silently deleted glob.
        'src/lib/era/envelope.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/era/load-era.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        // Declaration-only: interfaces and `import type` alone, so there is
        // nothing to instrument and this floor can never fail. Listed to keep
        // the set of era modules complete and reviewable, not as a guarantee.
        'src/lib/era/era.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },

        // The sole runtime path to the v8 module, and so the file the lazy-WASM
        // guarantee rests on. It had no floor of its own before the directory
        // split; it does now.
        'src/lib/v8/load.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/v8/load-engine.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/v8/engine.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/v8/instance-guard.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/v8/down-convert.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/v8/execute.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/v8/compose.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/v8/deploy.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/v8/adapt.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },

        'src/lib/v9/compose.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/v9/wrap.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },

        'src/lib/shared/ledger-version.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        // Shared by BOTH eras' deploy legs, and the three refusals it owns are
        // what stop a deploy landing at an address the caller's artifacts do
        // not describe. Floored for the same reason every other seam file is.
        'src/lib/shared/verifier-keys.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/shared/compose-options.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/shared/assemble-call.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/shared/contract-state.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/lib/shared/unshielded.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        // Declaration-only, as `era/era.ts` above.
        'src/lib/shared/compose-types.ts': { lines: 100, functions: 100, branches: 100, statements: 100 }
      }
    },
    reporters: [
      'default',
      ['junit', { outputFile: `reports/report/test-report.xml` }],
      ['html', { outputFile: `reports/report/test-report.html` }],
    ],
  },
});
