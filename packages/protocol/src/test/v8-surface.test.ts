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

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadV8 } from '../load-v8';

// Presence assertions (not exhaustive sorted equality) on purpose: the full
// v8 surface is owned by the upstream ledger package; this pins only the
// symbols midnight-js contractually relies on.
const MINIMUM_CONTRACTUAL_SURFACE = ['Transaction', 'LedgerParameters', 'ZswapChainState', 'ContractState'];

const SRC_ROOT = resolve(__dirname, '..');
const PKG_ROOT = resolve(__dirname, '..', '..');
const PROTOCOL_ACL_PREFIX = '@midnight-ntwrk/midnight-js-protocol';
const V8_SUBPATH_SPECIFIER = `${PROTOCOL_ACL_PREFIX}/v8`;
// Matches the specifier only as a complete quoted literal (import position),
// so prose mentions of the subpath — e.g. inside error messages — don't trip
// the sole-reference scan below.
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const V8_SUBPATH_LITERAL = new RegExp(`['"\`]${escapeRegExp(V8_SUBPATH_SPECIFIER)}['"\`]`);
const distV8Exists = existsSync(resolve(PKG_ROOT, 'dist/v8.mjs'));

const collectTsFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? collectTsFiles(fullPath) : entry.name.endsWith('.ts') ? [fullPath] : [];
  });

// loadV8 resolves the self-reference specifier through the exports map to
// dist/v8.mjs, so this suite needs a prior `yarn build`; without one it is
// reported as visible skips (same policy as dist-laziness.test.ts).
describe.skipIf(!distV8Exists)('loadV8', () => {
  it.each(MINIMUM_CONTRACTUAL_SURFACE)('exposes contractual v8 surface member %s', async (expectedKey) => {
    const surface = await loadV8();
    expect(Object.keys(surface)).toContain(expectedKey);
  });

  it('memoises the module promise across calls', async () => {
    const first = loadV8();
    const second = loadV8();
    expect(second).toBe(first);
    await expect(first).resolves.toBeDefined();
  });
});

describe('sole runtime reference to protocol/v8', () => {
  it('is referenced only from load-v8.ts within src/', () => {
    const filesReferencingV8Subpath = collectTsFiles(SRC_ROOT)
      .filter((file) => V8_SUBPATH_LITERAL.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(SRC_ROOT.length + 1));

    expect(filesReferencingV8Subpath).toEqual(['load-v8.ts']);
  });
});
