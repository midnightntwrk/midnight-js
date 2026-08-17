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

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// This suite only makes sense against a real build: it inspects the rollup
// output for static ledger-v8 linkage (NFR6 — the WASM must never be
// inlined/statically imported into the eagerly-loaded index bundle).
const PKG_ROOT = resolve(__dirname, '..', '..');
const DIST_ENTRY_PATHS = ['dist/index.mjs', 'dist/index.cjs'];
const distEntriesExist = DIST_ENTRY_PATHS.every((p) => existsSync(resolve(PKG_ROOT, p)));

// Skipped (not omitted) when dist/ is absent, so a run without a prior build
// still reports these as visible skips rather than silently vanishing —
// `yarn build && yarn test` (Step 4) is the mandatory path to green them.
//
// The file reads happen lazily inside each `it` body (not in the `describe`
// body) so that `describe.skipIf` actually prevents them from running when
// dist/ is absent — vitest still executes a `describe` callback during test
// collection even when `skipIf` is true; only the nested `it`s are skipped.
describe.skipIf(!distEntriesExist)('dist laziness gate', () => {
  it.each(DIST_ENTRY_PATHS)('%s has no static ledger-v8 linkage', (path) => {
    const content = readFileSync(resolve(PKG_ROOT, path), 'utf8');
    expect(content).not.toMatch(/from\s+['"].*ledger-v8['"]/);
    expect(content).not.toMatch(/require\(['"].*ledger-v8['"]\)/);
  });
});
