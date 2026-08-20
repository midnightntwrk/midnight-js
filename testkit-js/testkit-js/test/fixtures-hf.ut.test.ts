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

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HF_FIXTURE_NAMES,
  type HfFixtureName,
  hfFixturePath,
  hfFixturesManifest,
  readHfFixture
} from '../src/fixtures-hf';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ASSETS = resolve(PACKAGE_ROOT, 'src/fixtures/hf');
const DIST_ASSETS = resolve(PACKAGE_ROOT, 'dist/fixtures/hf');

const filesUnder = (root: string): string[] => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [relative(root, full).split(sep).join('/')];
    });
  return walk(root).sort();
};

describe('[Unit tests] hard-fork fixture accessors', () => {
  /**
   * @given the exported fixture-name list and the manifest read from disk
   * @when both key sets are compared
   * @then they are equal, so neither can drift from the other unnoticed
   */
  it('exposes a manifest keyed by exactly the exported fixture names', () => {
    expect(Object.keys(hfFixturesManifest).sort()).toEqual([...HF_FIXTURE_NAMES].sort());
  });

  describe.each(HF_FIXTURE_NAMES)('%s', (name) => {
    /**
     * @given a published fixture name
     * @when its bytes are read
     * @then the byte count is exactly half the hex character count
     */
    it('decodes to the byte count its hex text implies', () => {
      const hexText = readFileSync(hfFixturePath(name), 'utf8').trim();

      const bytes = readHfFixture(name);

      expect(bytes.byteLength).toBe(hexText.length / 2);
      expect(bytes.byteLength).toBeGreaterThan(0);
    });
  });

  /**
   * @given a name that is not a published fixture
   * @when it is read through the accessor
   * @then the call throws instead of returning empty bytes
   */
  it('rejects an unknown fixture name', () => {
    expect(() => readHfFixture('state-v7.hex' as HfFixtureName)).toThrow(/unknown hard-fork fixture/i);
  });

  /**
   * @given a relative path that climbs out of the fixture directory
   * @when it is resolved through the accessor
   * @then the call throws rather than handing back a path outside the package
   */
  it('rejects a path that escapes the fixture directory', () => {
    expect(() => hfFixturePath('../../../package.json')).toThrow(/outside the hard-fork fixture directory/i);
  });

  /**
   * @given a relative path naming no shipped file
   * @when it is resolved through the accessor
   * @then the call throws at resolution time instead of at first read
   */
  it('rejects a path that names no shipped fixture file', () => {
    expect(() => hfFixturePath('twin-contract/absent.compact')).toThrow(/no such hard-fork fixture file/i);
  });

  /**
   * @given a non-hex asset shipped alongside the state fixtures
   * @when its path is resolved
   * @then an absolute path to the existing file comes back
   */
  it('resolves non-hex assets such as the twin contract source', () => {
    const path = hfFixturePath('twin-contract/counter.compact');

    expect(isAbsolute(path)).toBe(true);
    expect(existsSync(path)).toBe(true);
  });
});

describe('[Unit tests] hard-fork fixtures are published', () => {
  /**
   * @given the package manifest
   * @when its `exports` map is inspected
   * @then the fixture accessor has its own subpath, so consumers can import it
   */
  it('declares a ./fixtures-hf subpath in the exports map', () => {
    const manifest: unknown = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, 'package.json'), 'utf8'));
    const exportsMap = (manifest as { exports?: Record<string, { types?: string; default?: string }> }).exports;

    expect(exportsMap?.['./fixtures-hf']).toEqual({
      types: './dist/fixtures-hf.d.ts',
      default: './dist/fixtures-hf.js'
    });
  });

  const distBuilt = existsSync(resolve(PACKAGE_ROOT, 'dist'));

  describe.skipIf(!distBuilt)('against the built package', () => {
    /**
     * @given a built `dist`
     * @when the shipped asset tree is compared with the source tree
     * @then every asset is present except the dev-only generator scripts
     */
    it('copies every fixture asset except the generator scripts into dist', () => {
      const expected = filesUnder(SOURCE_ASSETS).filter((file) => !file.startsWith('generators/'));

      expect(filesUnder(DIST_ASSETS)).toEqual(expected);
    });

    /**
     * @given a built `dist`
     * @when the generator directory is looked for among the shipped assets
     * @then it is absent, so the ledger devDependencies it needs are not implied
     */
    it('leaves the generator scripts out of dist', () => {
      expect(existsSync(join(DIST_ASSETS, 'generators'))).toBe(false);
    });

    /**
     * @given a built `dist`
     * @when the accessor entry point is looked up
     * @then both the module and its declaration exist at the exported paths
     */
    it('emits the accessor module and its declaration', () => {
      expect(statSync(resolve(PACKAGE_ROOT, 'dist/fixtures-hf.js')).isFile()).toBe(true);
      expect(statSync(resolve(PACKAGE_ROOT, 'dist/fixtures-hf.d.ts')).isFile()).toBe(true);
    });
  });
});
