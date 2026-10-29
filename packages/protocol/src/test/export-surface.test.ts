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

import * as transaction from '../transaction';

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

const LEDGER9_SUBPATHS: readonly (readonly [subpath: string, load: () => Promise<Record<string, unknown>>])[] = [
  ['./v9', () => import('@midnightntwrk/ledger-v9')],
  ['./v9/compact-runtime', () => import('@midnight-ntwrk/compact-runtime')],
  ['./v9/compact-js', () => import('@midnight-ntwrk/compact-js')],
  ['./v9/compact-js/effect', () => import('@midnight-ntwrk/compact-js/effect')],
  ['./v9/compact-js/effect/Contract', () => import('@midnight-ntwrk/compact-js/effect/Contract')],
  ['./v9/onchain-runtime', () => import('@midnightntwrk/onchain-runtime-v4')]
];

const REMOVED_SUBPATHS = [
  './ledger',
  './compact-runtime',
  './compact-js',
  './compact-js/effect',
  './compact-js/effect/Contract',
  './onchain-runtime'
];

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

  it('publishes exactly the era-named ledger 9 subpaths', () => {
    const eraNamed = [...entryNamesBySubpath().keys()].filter((subpath) => subpath === './v9' || subpath.startsWith('./v9/'));

    expect(eraNamed.sort()).toEqual(LEDGER9_SUBPATHS.map(([subpath]) => subpath).sort());
  });

  it('publishes no subpath that leaves out the ledger it serves', () => {
    const subpaths = [...entryNamesBySubpath().keys()];

    expect(REMOVED_SUBPATHS.filter((removed) => subpaths.includes(removed))).toEqual([]);
  });

  it.each(LEDGER9_SUBPATHS)('serves exactly the ledger 9 package from %s', async (subpath, load) => {
    const entryName = entryNamesBySubpath().get(subpath)?.[0];
    expect(entryName).toBeTypeOf('string');
    const served: Record<string, unknown> = await import(`../${entryName}.ts`);
    const upstream = await load();

    expect(Object.keys(served).sort()).toEqual(Object.keys(upstream).sort());
    expect(Object.keys(served).filter((name) => served[name] !== upstream[name])).toEqual([]);
  });

  it('publishes exactly the deserializer, the instance check and the stage reader from ./transaction', () => {
    expect(Object.keys(transaction).sort()).toEqual([
      'deserializeTransactionAtStage',
      'isFrameworkLedgerTransaction',
      'transactionStageOf'
    ]);
  });
});
