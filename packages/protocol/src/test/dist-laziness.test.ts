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
const DIST_INDEX_PATH = 'dist/index.js';
// The `./v8` entry chunk as rollup writes it into the index bundle: the
// dynamic import of `../v8.js` in src/lib/load-v8.ts comes out as an
// output-relative specifier. Built from parts so the runtime-reference scan
// in v8-surface.test.ts keeps matching only lib/load-v8.ts.
const V8_CHUNK_SPECIFIER = ['.', 'v8.js'].join('/');
const V8_DIST_ARTIFACTS = ['dist/v8.js', 'dist/v8.d.ts'];

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const V8_CHUNK_PATTERN = escapeRegExp(V8_CHUNK_SPECIFIER);

// Never skipped when dist/ is absent: a skip is reported as a pass, so the
// gate would silently stop guarding. Every orchestrated run has the build
// ahead of it — turbo's `test` task dependsOn `build` — so dist/ exists in CI
// and in `yarn test` at the repo root. A bare `vitest run` without a prior
// build fails instead, with a message saying how to fix it.
const readDistFile = (path: string): string => {
  const absolute = resolve(PKG_ROOT, path);
  if (!existsSync(absolute)) {
    throw new Error(
      `${path} is missing: this suite inspects the rollup output. Run "yarn build" first, or run "yarn turbo test", which builds before testing.`
    );
  }
  return readFileSync(absolute, 'utf8');
};

describe('dist laziness gate', () => {
  it('the index bundle has no static ledger-v8 linkage', () => {
    const content = readDistFile(DIST_INDEX_PATH);

    expect(content).not.toMatch(/from\s*['"][^'"]*ledger-v8['"]/);
  });

  it('the index bundle has no static linkage of the v8 chunk', () => {
    const content = readDistFile(DIST_INDEX_PATH);

    expect(content).not.toMatch(new RegExp(`from\\s*['"]${V8_CHUNK_PATTERN}['"]`));
  });

  it('the index bundle keeps the lazy dynamic import of the v8 chunk', () => {
    const content = readDistFile(DIST_INDEX_PATH);

    expect(content).toMatch(new RegExp(`import\\(\\s*['"]${V8_CHUNK_PATTERN}['"]\\s*\\)`));
  });

  it.each(V8_DIST_ARTIFACTS)('%s referenced by the ./v8 exports map entry exists', (path) => {
    expect(existsSync(resolve(PKG_ROOT, path))).toBe(true);
  });
});
