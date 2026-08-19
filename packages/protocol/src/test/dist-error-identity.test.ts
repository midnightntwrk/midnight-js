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

// This suite only makes sense against a real build: it loads the package
// through its own exports map (never through src/) to check an invariant only
// the built artifact can violate — that every entry point shares ONE physical
// copy of the error classes. Each rollup entry is bundled independently, so a
// relatively-imported errors module gets inlined into every one of them, and
// an error thrown inside one bundle then fails `instanceof` against another
// bundle's class. The facade in src/engine/load-engine.ts discriminates its
// rejection that way, and so does every consumer catching by class; a src-only
// test cannot see the breakage because vitest resolves src/errors.ts once.
const PKG_ROOT = resolve(__dirname, '..', '..');
const DIST_ENTRY_PATHS = ['dist/index.mjs', 'dist/index.cjs'];
const ERRORS_SUBPATH_SPECIFIER = '@midnight-ntwrk/midnight-js-protocol/errors';
const distEntriesExist = DIST_ENTRY_PATHS.every((p) => existsSync(resolve(PKG_ROOT, p)));

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isErrorClass = (value: unknown): boolean =>
  typeof value === 'function' && Object.prototype.isPrototypeOf.call(Error, value);

/** Every exported error class of a module namespace, keyed by export name. */
const errorClassesOf = (namespace: object): Map<string, unknown> =>
  new Map(Object.entries(namespace).filter(([, value]) => isErrorClass(value)));

// Skipped (not omitted) when dist/ is absent, so a run without a prior build
// reports these as visible skips rather than silently vanishing — same
// precedent as dist-laziness.test.ts. Reads and imports happen inside each
// `it` body for the same reason as that suite.
describe.skipIf(!distEntriesExist)('dist error-class identity gate', () => {
  it('exports the very same error classes from the package root and the ./errors subpath', async () => {
    const root: object = await import('@midnight-ntwrk/midnight-js-protocol');
    const errors: object = await import('@midnight-ntwrk/midnight-js-protocol/errors');

    const rootClasses = errorClassesOf(root);
    const errorsClasses = errorClassesOf(errors);

    expect(errorsClasses.size).toBeGreaterThan(0);
    expect([...rootClasses.keys()].sort()).toEqual([...errorsClasses.keys()].sort());
    for (const [name, errorClass] of errorsClasses) {
      expect(rootClasses.get(name)).toBe(errorClass);
    }
  });

  it.each(DIST_ENTRY_PATHS)('%s imports the shared error module instead of inlining its own classes', (path) => {
    const content = readFileSync(resolve(PKG_ROOT, path), 'utf8');

    expect(content).not.toMatch(/class\s+\w+\s+extends\s+Error\b/);
    expect(content).toMatch(new RegExp(`['"]${escapeRegExp(ERRORS_SUBPATH_SPECIFIER)}['"]`));
  });

  it('recognises an error thrown by a foreign copy of the module, by code', async () => {
    const errors = await import('@midnight-ntwrk/midnight-js-protocol/errors');
    const fromForeignCopy = Object.assign(new Error('thrown by an independently bundled copy'), {
      code: errors.PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ
    });

    expect(fromForeignCopy).toBeInstanceOf(errors.UnknownProtocolVersionError);
  });
});
