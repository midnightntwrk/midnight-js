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
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// This suite only makes sense against a real build: it inspects the rollup
// output to guarantee the v8 ledger WASM is never inlined or statically
// imported into the eagerly-loaded index bundle — it may load only through
// the dynamic import inside loadLedger8().
const PKG_ROOT = resolve(__dirname, '..', '..');
const DIST_INDEX_PATH = 'dist/index.js';
// The `./v8` entry chunk as rollup writes it into the index bundle: the
// dynamic import of `../v8.js` in src/lib/load-v8.ts comes out as an
// output-relative specifier, at whatever depth the importing chunk sits.
// Built from parts so the runtime-reference scan
// in v8-surface.test.ts keeps matching only lib/load-v8.ts.
const V8_CHUNK_PATTERN = `(?:\\.{1,2}/)+${['v8', 'js'].join('\\.')}`;
const V8_DIST_ARTIFACTS = ['dist/v8.js', 'dist/v8.d.ts'];
const distIndexExists = existsSync(resolve(PKG_ROOT, DIST_INDEX_PATH));
// The `./engine` entry chunk, named the same way and for the same reason: the
// dynamic import of `../../engine.js` in src/lib/engine/load-engine.ts comes
// out as an output-relative specifier too, at whatever depth imports it.
const ENGINE_CHUNK_PATTERN = `(?:\\.{1,2}/)+${['engine', 'js'].join('\\.')}`;
const ENGINE_DIST_ARTIFACTS = ['dist/engine.js', 'dist/engine.d.ts'];

// Rollup hoists a module that several entries share into its own chunk, so the
// accessor's dynamic import can sit one static hop away from the index bundle
// rather than inside it — it does exactly that once more than one entry reaches
// loadLedger8. The invariant is about everything loading the package root pulls
// in EAGERLY, so it is asserted over that whole static closure instead of over
// dist/index.js alone; otherwise a static link hidden in a shared chunk slips
// through, which is the very thing being gated.
const staticImportsOf = (content: string): string[] =>
  [...content.matchAll(/from\s*['"](\.[^'"]*)['"]/g)].map(([, specifier]) => specifier);

const eagerClosureOf = (entry: string): string[] => {
  const seen = new Set<string>();
  const pending = [entry];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || seen.has(current)) {
      continue;
    }
    seen.add(current);
    for (const specifier of staticImportsOf(readFileSync(resolve(PKG_ROOT, current), 'utf8'))) {
      pending.push(join(dirname(current), specifier));
    }
  }

  return [...seen];
};

const eagerContents = (entry: string): string => eagerClosureOf(entry).map((chunk) => readFileSync(resolve(PKG_ROOT, chunk), 'utf8')).join('\n');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Skipped (not omitted) when dist/ is absent, so a run without a prior build
// still reports these as visible skips rather than silently vanishing —
// run `yarn build && yarn test` to green them.
//
// The file reads happen lazily inside each `it` body (not in the `describe`
// body) so that `describe.skipIf` actually prevents them from running when
// dist/ is absent — vitest still executes a `describe` callback during test
// collection even when `skipIf` is true; only the nested `it`s are skipped.
describe.skipIf(!distIndexExists)('dist laziness gate', () => {
  // Both halves of the retained pre-fork stack, not just ledger-v8:
  // onchain-runtime-v3 is a runtime dependency of this package and carries its
  // own multi-megabyte WASM, so a static link to it costs a v9-only consumer
  // exactly as much. The engine modules reference it only through erased
  // `import type`s and injected parameters, which is what keeps this green.
  it.each(['ledger-v8', 'onchain-runtime-v3'])('nothing loaded eagerly by the index bundle links %s statically', (pkg) => {
    const content = eagerContents(DIST_INDEX_PATH);

    expect(content).not.toMatch(new RegExp(`from\\s*['"][^'"]*${escapeRegExp(pkg)}['"]`));
  });

  it('the v8 chunk is not part of what the index bundle loads eagerly', () => {
    expect(eagerClosureOf(DIST_INDEX_PATH)).not.toContain(join('dist', 'v8.js'));
  });

  it('what the index bundle loads eagerly keeps the lazy dynamic import of the v8 chunk', () => {
    const content = eagerContents(DIST_INDEX_PATH);

    expect(content).toMatch(new RegExp(`import\\(\\s*['"]${V8_CHUNK_PATTERN}['"]\\s*\\)`));
  });

  it.each(V8_DIST_ARTIFACTS)('%s referenced by the ./v8 exports map entry exists', (path) => {
    expect(existsSync(resolve(PKG_ROOT, path))).toBe(true);
  });

  it('the index bundle has no linkage (static or dynamic) of the compact-runtime-ledger8 glue alias', () => {
    const content = readFileSync(resolve(PKG_ROOT, DIST_INDEX_PATH), 'utf8');

    expect(content).not.toMatch(/['"]compact-runtime-ledger8['"]/);
  });

  it('the index bundle has no static linkage of the engine chunk', () => {
    const content = readFileSync(resolve(PKG_ROOT, DIST_INDEX_PATH), 'utf8');

    expect(content).not.toMatch(new RegExp(`from\\s*['"]${ENGINE_CHUNK_PATTERN}['"]`));
  });

  it('the index bundle keeps the lazy dynamic import of the engine chunk', () => {
    const content = readFileSync(resolve(PKG_ROOT, DIST_INDEX_PATH), 'utf8');

    expect(content).toMatch(new RegExp(`import\\(\\s*['"]${ENGINE_CHUNK_PATTERN}['"]\\s*\\)`));
  });

  it.each(ENGINE_DIST_ARTIFACTS)('%s referenced by the ./engine exports map entry exists', (path) => {
    expect(existsSync(resolve(PKG_ROOT, path))).toBe(true);
  });
});
