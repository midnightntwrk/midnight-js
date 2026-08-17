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
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadV8 } from '../load-v8';

// Minimum contractual set (spec §4.1(3)). The full OQ3 surface list is not
// resolved yet, so this asserts presence, not exhaustive sorted equality.
const MINIMUM_CONTRACTUAL_SURFACE = ['Transaction', 'LedgerParameters', 'ZswapChainState', 'ContractState'];

const SRC_ROOT = resolve(__dirname, '..');
const PROTOCOL_ACL_PREFIX = '@midnight-ntwrk/midnight-js-protocol';
const V8_SUBPATH_SPECIFIER = `${PROTOCOL_ACL_PREFIX}/v8`;

const collectTsFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? collectTsFiles(fullPath) : entry.name.endsWith('.ts') ? [fullPath] : [];
  });

describe('loadV8', () => {
  // NOTE: if WASM cannot instantiate under vitest's node environment, this is
  // the assertion to skip — document with `test.skip` and reference OQ3/OQ9.
  it('exposes the minimum contractual v8 surface', async () => {
    const surface = await loadV8();
    const keys = Object.keys(surface);
    for (const expectedKey of MINIMUM_CONTRACTUAL_SURFACE) {
      expect(keys).toContain(expectedKey);
    }
  });

  it('memoises the module promise across calls', () => {
    const first = loadV8();
    const second = loadV8();
    expect(first).toBe(second);
  });
});

describe('sole runtime reference to protocol/v8', () => {
  it('is referenced only from load-v8.ts within src/', () => {
    const filesReferencingV8Subpath = collectTsFiles(SRC_ROOT)
      .filter((file) => readFileSync(file, 'utf8').includes(V8_SUBPATH_SPECIFIER))
      .map((file) => file.slice(SRC_ROOT.length + 1));

    expect(filesReferencingV8Subpath).toEqual(['load-v8.ts']);
  });
});
