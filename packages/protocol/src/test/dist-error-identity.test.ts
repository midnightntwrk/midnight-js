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

// Only the built artifact can violate this invariant: every entry point must
// share ONE physical copy of the error classes. Bundling each entry in its own
// rollup pass would inline the error module into each of them, and an error
// thrown inside one bundle would then fail `instanceof` against another
// bundle's class — silently, exactly where a caller tells failure modes apart.
// A src-only test cannot see it, because vitest resolves src/errors.ts once.
//
// Everything here is asserted against dist/ rather than against the build
// config: the artifact is what consumers load, and it stays meaningful however
// the build is reorganised.
const PKG_ROOT = resolve(__dirname, '..', '..');
const ERRORS_SUBPATH = './errors';
const SELF_SPECIFIER = '@midnight-ntwrk/midnight-js-protocol';
const ERROR_CLASS_DECLARATION = /class\s+\w+\s+extends\s+Error\b/;

// The exports map is the source of truth: it is the contract consumers resolve
// against, so a subpath added later is covered without editing this file.
// Read rather than imported, because a JSON import attribute would not
// type-check under this package's `module` setting.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// One bundle per subpath since the package went ESM-only: the `default`
// condition is the file every consumer loads, whether by `import` or through
// Node's `require(esm)`.
const isBundleExport = (value: unknown): value is { types: string; default: string } =>
  isRecord(value) && typeof value.types === 'string' && typeof value.default === 'string';

const readExportedBundles = (): Map<string, string> => {
  const manifest: unknown = JSON.parse(readFileSync(resolve(PKG_ROOT, 'package.json'), 'utf8'));
  const exportsField = isRecord(manifest) ? manifest.exports : undefined;
  if (!isRecord(exportsField)) {
    throw new Error('protocol package.json has no exports map');
  }
  const bundled = Object.entries(exportsField).filter(
    (entry): entry is [string, { types: string; default: string }] => isBundleExport(entry[1])
  );
  return new Map(bundled.map(([subpath, target]) => [subpath, target.default.replace(/^\.\//, '')]));
};

const bundlesBySubpath = readExportedBundles();
const allBundles = [...bundlesBySubpath.values()];
const errorBundle = bundlesBySubpath.get(ERRORS_SUBPATH);
// Kept as a list so an absent `./errors` subpath fails test 1 with a readable
// message instead of throwing out of the module body.
const errorBundles = errorBundle === undefined ? [] : [errorBundle];
const nonErrorBundles = [...bundlesBySubpath.entries()]
  .filter(([subpath]) => subpath !== ERRORS_SUBPATH)
  .map(([, bundle]) => bundle);

const bundlesExist = allBundles.every((p) => existsSync(resolve(PKG_ROOT, p)));
const contentOf = (path: string): string => readFileSync(resolve(PKG_ROOT, path), 'utf8');

const isErrorClass = (value: unknown): boolean =>
  typeof value === 'function' && Object.prototype.isPrototypeOf.call(Error, value);

/** Every exported error class of a module namespace, keyed by export name. */
const errorClassesOf = (namespace: object): Map<string, unknown> =>
  new Map(Object.entries(namespace).filter(([, value]) => isErrorClass(value)));

// Skipped (not omitted) when dist/ is absent outside CI, so a run without a
// prior build reports visible skips rather than silently vanishing. In CI a
// missing build is itself a failure, so the gate must not be skippable there.
describe.skipIf(!bundlesExist && !process.env.CI)('dist error-class identity gate', () => {
  it('ships a bundle for every exported subpath', () => {
    expect(bundlesBySubpath.has(ERRORS_SUBPATH)).toBe(true);
    expect(allBundles.filter((p) => !existsSync(resolve(PKG_ROOT, p)))).toEqual([]);
  });

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

  it.each(nonErrorBundles)('%s declares no error class of its own', (path) => {
    expect(contentOf(path)).not.toMatch(ERROR_CLASS_DECLARATION);
  });

  it.each(errorBundles)('%s is the one bundle that declares the error classes', (path) => {
    expect(contentOf(path)).toMatch(ERROR_CLASS_DECLARATION);
  });

  // A single-pass build links entries to the shared module by relative path.
  // Anything else means the entries were bundled independently again — either
  // inlining their own copy, or reaching the classes through this package's
  // own exports map, which would make correctness depend on the consumer's
  // resolver supporting self-referencing.
  it.each(errorBundles)('%s is reached by relative path, never through the package name', (bundle) => {
    const relativeSpecifier = `./${bundle.replace(/^dist\//, '')}`;
    const importers = nonErrorBundles.filter((path) => contentOf(path).includes(relativeSpecifier));

    expect(importers.length).toBeGreaterThan(0);
    for (const path of allBundles) {
      expect(contentOf(path)).not.toContain(`${SELF_SPECIFIER}/errors`);
    }
  });
});
