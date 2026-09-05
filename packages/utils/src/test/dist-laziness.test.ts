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

/**
 * Guards what importing `midnight-js-utils` costs.
 *
 * `proveV8Transaction` needs `loadLedger8`, which the protocol package exports
 * only from its ROOT — and that root also re-exports the `onchainRuntime`,
 * `compactJs` and `platform` namespaces. Importing it statically here would put
 * all of that in the eager module closure of a package people import on its own
 * for hex helpers and assertions, so the seam reaches it by dynamic import
 * instead.
 *
 * Measured on the checkout that introduced the deferral: importing this package
 * alone went from ~147 ms / ~101 MB RSS with a static barrel import to ~35 ms /
 * ~56 MB with the dynamic one. Nothing about that win is visible in the source
 * — re-adding a static import would restore the cost silently — which is what
 * this suite is for.
 *
 * Modelled on `packages/protocol/src/test/dist-laziness.test.ts`, which guards
 * the same class of invariant for the v8 and engine chunks.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const PKG_ROOT = resolve(__dirname, '..', '..');
const DIST_INDEX_PATH = 'dist/index.js';

/** The protocol package ROOT. Its leaf subpaths are fine and are used already. */
const PROTOCOL_BARREL = '@midnight-ntwrk/midnight-js-protocol';

// Never skipped when dist/ is absent: a skip is reported as a pass, so the gate
// would silently stop guarding. Turbo's `test` task dependsOn `build`, so dist/
// exists in CI and in `yarn test`. A bare `vitest run` without a prior build
// fails instead, with a message saying how to fix it.
const readDistFile = (path: string): string => {
  const absolute = resolve(PKG_ROOT, path);
  if (!existsSync(absolute)) {
    throw new Error(
      `${path} is missing: this suite inspects the rollup output. Run "yarn build" first, or run "yarn turbo test", which builds before testing.`
    );
  }
  return readFileSync(absolute, 'utf8');
};

// Matches both `… from './x.js'` and the bare `import './x.js';` rollup emits
// for a side-effect-only chunk. Dynamic `import('./x.js')` is deliberately NOT
// matched: it is what laziness looks like, not what breaks it.
const relativeStaticImportsOf = (content: string): string[] =>
  [...content.matchAll(/(?:from|^\s*import)\s*['"](\.[^'"]*)['"]/gm)].map(([, specifier]) => specifier);

// Asserted over the whole static closure rather than dist/index.js alone: if
// rollup ever splits this package into chunks, a static link hidden in a shared
// chunk is exactly what would otherwise slip through.
const eagerClosureOf = (entry: string): string[] => {
  const seen = new Set<string>();
  const pending = [entry];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || seen.has(current)) {
      continue;
    }
    seen.add(current);
    for (const specifier of relativeStaticImportsOf(readDistFile(current))) {
      pending.push(join(dirname(current), specifier));
    }
  }

  return [...seen];
};

const eagerContents = (entry: string): string => eagerClosureOf(entry).map((chunk) => readDistFile(chunk)).join('\n');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('dist laziness gate', () => {
  it('nothing loaded eagerly by the index bundle imports the protocol root barrel statically', () => {
    const content = eagerContents(DIST_INDEX_PATH);

    // Anchored on the closing quote so the package's LEAF subpaths — which this
    // package does import statically, and always has — do not match. Only the
    // bare root is the expensive one.
    expect(content).not.toMatch(
      new RegExp(`(?:from|^\\s*import)\\s*['"]${escapeRegExp(PROTOCOL_BARREL)}['"]`, 'm')
    );
  });

  it('keeps the lazy dynamic import of the protocol root barrel', () => {
    const content = eagerContents(DIST_INDEX_PATH);

    // The other half of the invariant. Without this, deleting the retained-era
    // seam entirely would also satisfy the assertion above — the gate has to
    // say the runtime is still reachable, not merely that it is not eager.
    expect(content).toMatch(new RegExp(`import\\(\\s*['"]${escapeRegExp(PROTOCOL_BARREL)}['"]\\s*\\)`));
  });

  it('still exports the retained-era proving seam from the built package', async () => {
    // The static walk says the barrel CAN stay unlinked. This says the export
    // that needs it is genuinely still there, so the two assertions above are
    // statements about shipped code rather than about a bundle that quietly
    // lost the function.
    const utils = await import('@midnight-ntwrk/midnight-js-utils');

    expect(typeof utils.proveV8Transaction).toBe('function');
  });
});
