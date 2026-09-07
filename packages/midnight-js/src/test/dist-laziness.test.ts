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
 * Guards which protocol entry points the barrel's own module reaches for.
 *
 * The era vocabulary comes off the `protocol/version` and `protocol/errors`
 * leaf subpaths. Those two reach one another and a shared leaf declaration and
 * nothing else at runtime, whereas protocol's ROOT barrel eagerly pulls the
 * v9 ledger, onchain-runtime, compact-js, compact-runtime and platform
 * bindings. Repointing the re-exports at the root would look identical in
 * review, typecheck clean, and leave every test green -- which is what this
 * suite is for.
 *
 * What this suite does NOT claim: that importing the barrel is cheap.
 * `midnight-js-contracts`, which the barrel re-exports, statically imports
 * protocol's root today, so the root and the v9 runtime are already on every
 * barrel consumer's eager path. The gate below is narrower and still worth
 * having -- it stops the barrel adding a second, direct pin of its own, and
 * keeps the option of shaking that cost out later open rather than
 * load-bearing. See BarrelPublishedSurface.
 *
 * The retained pre-fork (v8) runtime is a separate matter: it stays off the
 * eager path entirely, and the second assertion holds that.
 *
 * Modelled on `packages/utils/src/test/dist-laziness.test.ts`, which guards
 * the same class of invariant for the retained-era proving seam.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const PKG_ROOT = resolve(__dirname, '..', '..');
const DIST_INDEX_PATH = 'dist/index.js';

/** The protocol package ROOT. Its `version` and `errors` leaves are the sanctioned way in. */
const PROTOCOL_BARREL = '@midnight-ntwrk/midnight-js-protocol';

/** The subpaths carrying the retained pre-fork runtime. Off the eager path in any form. */
const RETAINED_ERA_SUBPATHS = [`${PROTOCOL_BARREL}/v8`, `${PROTOCOL_BARREL}/engine`];

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
// for a side-effect-only chunk.
const relativeStaticImportsOf = (content: string): string[] =>
  [...content.matchAll(/(?:from|^\s*import)\s*['"](\.[^'"]*)['"]/gm)].map(([, specifier]) => specifier);

// Asserted over the whole static closure rather than dist/index.js alone: the
// barrel emits one flat chunk today, but if rollup ever splits it, a static
// link hidden in a shared chunk is exactly what would otherwise slip through.
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
  it('reaches protocol only through its leaf subpaths, never the root barrel', () => {
    const content = eagerContents(DIST_INDEX_PATH);

    // Anchored on the closing quote so the LEAF subpaths this package does
    // import -- `/version` and `/errors` -- do not match. Only the bare root,
    // the expensive one, is caught.
    expect(content).not.toMatch(
      new RegExp(`(?:from|^\\s*import)\\s*['"]${escapeRegExp(PROTOCOL_BARREL)}['"]`, 'm')
    );
  });

  it('does not name the retained pre-fork runtime subpaths in any form', () => {
    const content = eagerContents(DIST_INDEX_PATH);

    // Deliberately a plain substring check rather than an import-shaped one:
    // a dynamic `import()` of these from the barrel would be just as wrong as
    // a static one, because the barrel has no era-dispatch job to do.
    for (const subpath of RETAINED_ERA_SUBPATHS) {
      expect(content).not.toContain(subpath);
    }
  });

  it('still exports the era vocabulary from the built package', async () => {
    // The static walk says the root barrel CAN stay unreferenced. This says
    // the names that needed it are genuinely still there, so the assertions
    // above are statements about shipped code rather than about a bundle that
    // quietly lost the vocabulary.
    const barrel = await import('@midnight-ntwrk/midnight-js');

    expect(typeof barrel.versionOfRecord).toBe('function');
    expect(typeof barrel.networkHeadVersion).toBe('function');
    expect(barrel.LEDGER_VERSIONS).toEqual(['v8', 'v9']);
    expect(typeof barrel.UnknownProtocolVersionError).toBe('function');
  });
});
