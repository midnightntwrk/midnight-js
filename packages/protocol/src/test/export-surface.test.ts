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

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = resolve(__dirname, '../..');

// Subpaths that address a file shipped as-is rather than a build entry.
const NON_ENTRY_SUBPATHS = ['./package.json'];

const DIST_PREFIX = './dist/';

// Matches every module extension the build has ever emitted for one entry:
// `.js`, `.mjs`, `.cjs` and their declaration counterparts. Stripping it turns
// a target path into the entry name shared by all of a subpath's conditions.
const MODULE_EXTENSION = /\.(?:d\.)?[mc]?[jt]s$/;

const readExportsMap = (): Record<string, unknown> => {
  const manifest: unknown = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, 'package.json'), 'utf8'));
  if (typeof manifest !== 'object' || manifest === null || !('exports' in manifest)) {
    throw new Error('packages/protocol/package.json declares no "exports" map');
  }
  const { exports } = manifest;
  if (typeof exports !== 'object' || exports === null || Array.isArray(exports)) {
    throw new Error('packages/protocol "exports" must be a map of subpaths');
  }
  return { ...exports };
};

const collectTargetPaths = (node: unknown): string[] => {
  if (typeof node === 'string') {
    return [node];
  }
  if (typeof node === 'object' && node !== null) {
    return Object.values(node).flatMap(collectTargetPaths);
  }
  throw new Error(`"exports" target must be a string or a condition map, got ${JSON.stringify(node)}`);
};

const entryNameOf = (targetPath: string): string => {
  if (!targetPath.startsWith(DIST_PREFIX)) {
    throw new Error(`"exports" target ${targetPath} does not point into ${DIST_PREFIX}`);
  }
  const fileName = targetPath.slice(DIST_PREFIX.length);
  const entryName = fileName.replace(MODULE_EXTENSION, '');
  if (entryName === fileName) {
    throw new Error(`"exports" target ${targetPath} has no recognised module extension`);
  }
  return entryName;
};

const entryNamesBySubpath = (): Map<string, string[]> =>
  new Map(
    Object.entries(readExportsMap())
      .filter(([subpath]) => !NON_ENTRY_SUBPATHS.includes(subpath))
      .map(([subpath, target]) => [subpath, [...new Set(collectTargetPaths(target).map(entryNameOf))]])
  );

const sourceEntryNames = (): string[] =>
  readdirSync(resolve(PACKAGE_ROOT, 'src'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name.replace(/\.ts$/, ''));

describe('protocol export surface', () => {
  /**
   * @given the `exports` map of `@midnight-ntwrk/midnight-js-protocol`
   * @when every condition of a subpath is reduced to its entry name
   * @then all conditions of that subpath name the same entry
   */
  it('resolves each subpath to a single build entry', () => {
    const mismatched = [...entryNamesBySubpath()].filter(([, entryNames]) => entryNames.length !== 1);

    expect(mismatched).toEqual([]);
  });

  /**
   * @given the `exports` map and the top-level modules under `src`
   * @when both are reduced to entry names
   * @then the two sets are equal, so no source entry is unreachable and no
   *       subpath points at an entry the build cannot produce
   */
  it('exports exactly one subpath per top-level source module', () => {
    const exported = [...entryNamesBySubpath().values()].flat();

    expect([...new Set(exported)].sort()).toEqual(sourceEntryNames().sort());
  });
});
