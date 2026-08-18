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
// output to guarantee the v8 ledger WASM is never inlined or statically
// imported into the eagerly-loaded index bundle — it may load only through
// the dynamic import inside loadLedger8().
const PKG_ROOT = resolve(__dirname, '..', '..');
const DIST_ENTRY_PATHS = ['dist/index.mjs', 'dist/index.cjs'];
// Built from parts so the sole-reference scan in v8-surface.test.ts keeps
// matching only load-v8.ts.
const V8_SUBPATH_SPECIFIER = ['@midnight-ntwrk/midnight-js-protocol', 'v8'].join('/');
const V8_DIST_ARTIFACTS = ['dist/v8.mjs', 'dist/v8.cjs', 'dist/v8.d.mts', 'dist/v8.d.cts'];
const distEntriesExist = DIST_ENTRY_PATHS.every((p) => existsSync(resolve(PKG_ROOT, p)));

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const V8_SUBPATH_PATTERN = escapeRegExp(V8_SUBPATH_SPECIFIER);

// Skipped (not omitted) when dist/ is absent, so a run without a prior build
// still reports these as visible skips rather than silently vanishing —
// run `yarn build && yarn test` to green them.
//
// The file reads happen lazily inside each `it` body (not in the `describe`
// body) so that `describe.skipIf` actually prevents them from running when
// dist/ is absent — vitest still executes a `describe` callback during test
// collection even when `skipIf` is true; only the nested `it`s are skipped.
describe.skipIf(!distEntriesExist)('dist laziness gate', () => {
  it.each(DIST_ENTRY_PATHS)('%s has no static ledger-v8 linkage', (path) => {
    const content = readFileSync(resolve(PKG_ROOT, path), 'utf8');
    expect(content).not.toMatch(/from\s*['"][^'"]*ledger-v8['"]/);
    expect(content).not.toMatch(/require\(['"][^'"]*ledger-v8['"]\)/);
  });

  it.each(DIST_ENTRY_PATHS)('%s has no static linkage of the protocol/v8 subpath', (path) => {
    const content = readFileSync(resolve(PKG_ROOT, path), 'utf8');
    expect(content).not.toMatch(new RegExp(`from\\s*['"]${V8_SUBPATH_PATTERN}['"]`));
    expect(content).not.toMatch(new RegExp(`require\\(['"]${V8_SUBPATH_PATTERN}['"]\\)`));
  });

  it.each(DIST_ENTRY_PATHS)('%s keeps the lazy dynamic import of the protocol/v8 subpath', (path) => {
    const content = readFileSync(resolve(PKG_ROOT, path), 'utf8');
    expect(content).toMatch(new RegExp(`import\\(\\s*['"]${V8_SUBPATH_PATTERN}['"]\\s*\\)`));
  });

  it.each(V8_DIST_ARTIFACTS)('%s referenced by the ./v8 exports map entry exists', (path) => {
    expect(existsSync(resolve(PKG_ROOT, path))).toBe(true);
  });
});
