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

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The unit tier's copy, compiled by `compactc` 0.31.1 and executed by
// `cross-window.ut.test.ts` against a frozen LevelDB store.
const UNIT_SOURCE = resolve(PACKAGE_ROOT, 'src/fixtures/hf/private-counter-twin/private-counter.compact');
// The e2e tier's copy, compiled by this repo's current `compactc` and driven
// across a real fork by `consumer-e2e/fork-matrix-entry.mjs`.
const E2E_SOURCE = resolve(PACKAGE_ROOT, '../testkit-js-e2e/src/contract/private-counter.compact');

/**
 * The source with its commentary removed.
 *
 * The two files carry DIFFERENT comments on purpose -- each explains itself to
 * the tier that reads it -- so comparing them verbatim would fail for a reason
 * nobody wants to hear about. What has to match is the contract.
 */
const contractCode = (path: string): string =>
  readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trimEnd())
    .filter((line) => line.length > 0)
    .join('\n');

describe('[Unit tests] the private-counter twin', () => {
  /**
   * @given the unit-tier and e2e-tier copies of private-counter.compact
   * @when their code is compared with commentary stripped
   * @then the two are identical
   *
   * Two copies exist because two toolchains compile them, and the whole argument
   * the fork matrix makes about private state rests on both tiers exercising the
   * SAME contract: the unit tier proves continuity against a frozen store, the
   * e2e tier proves it across a live fork. If the sources drift, the two tiers
   * measure different things and neither says what it claims to.
   *
   * Nothing else enforces this -- the files sit in different packages and are
   * compiled by different `compactc` versions, so an edit to one is silent in
   * the other until a shard fails for an unrelated-looking reason.
   */
  test('is the same contract at both tiers', () => {
    expect(contractCode(E2E_SOURCE)).toBe(contractCode(UNIT_SOURCE));
  });

  /**
   * @given the shared private-counter source
   * @when its witness and ledger declarations are read
   * @then it declares the witness and counter the fork matrix asserts against
   *
   * The figures the fork matrix expects (round 7/14/21/28) follow from there
   * being exactly one witness feeding exactly one counter. A source that grew a
   * second circuit writing `round` would keep this file compiling and make those
   * figures wrong, so the shape is pinned rather than assumed.
   */
  test('declares one witness feeding one counter', () => {
    const code = contractCode(UNIT_SOURCE);

    expect(code).toContain('witness localIncrement(): Uint<16>;');
    expect(code).toContain('export ledger round: Counter;');
    expect(code.match(/export circuit/g)).toHaveLength(1);
    expect(code.match(/round\.increment/g)).toHaveLength(1);
  });
});
