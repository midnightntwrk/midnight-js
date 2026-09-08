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

import { describe, expect, test } from 'vitest';

import { hfFixturePath } from '../src/fixtures-hf';

/**
 * The toolchain that produced `counter-016/compiled/`, from the spike's own
 * `contract-info.json`. These three together are what makes the artifacts
 * retained-era ones; a set built by any other toolchain is a different fixture
 * wearing the same name.
 */
const RETAINED_TOOLCHAIN = {
  'compiler-version': '0.31.1',
  'language-version': '0.23.0',
  'runtime-version': '0.16.0'
};

/** The envelope tag a pre-fork verifier key carries, as raw ASCII. */
const PRE_FORK_VERIFIER_KEY_TAG = 'midnight:verifier-key[v6]:';

const readJson = (relativePath: string): unknown => JSON.parse(readFileSync(hfFixturePath(relativePath), 'utf8'));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecord = (value: unknown, what: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new Error(`${what} is not an object`);
  }
  return value;
};

const zkirMajorVersion = (relativePath: string): unknown => {
  const version = asRecord(readJson(relativePath), relativePath).version;
  return asRecord(version, `${relativePath} version`).major;
};

const circuitNames = (contractInfo: Record<string, unknown>): string[] => {
  if (!Array.isArray(contractInfo.circuits)) {
    throw new Error('contract-info.json declares no circuits array');
  }
  return contractInfo.circuits.map((circuit) => {
    const named = asRecord(circuit, 'contract-info.json circuit');
    if (typeof named.name !== 'string') {
      throw new Error('contract-info.json has a circuit with no name');
    }
    return named.name;
  });
};

describe('counter-016 retained-era ZK artifacts', () => {
  test('are declared as produced by the retained toolchain, not the current one', () => {
    // Arrange.
    const contractInfo = asRecord(
      readJson('counter-016/compiled/compiler/contract-info.json'),
      'counter-016 contract-info.json'
    );

    // Act.
    const declared = Object.fromEntries(Object.keys(RETAINED_TOOLCHAIN).map((key) => [key, contractInfo[key]]));

    // Assert: the assertion that matters most. A current-era key set committed
    // here would still load, still be the right shape, and be wrong in a way that
    // only shows up as an unprovable transaction on a pre-fork chain.
    expect(declared).toEqual(RETAINED_TOOLCHAIN);
  });

  test('carry the pre-fork ZKIR version and verifier-key envelope', () => {
    // Arrange / Act: the artifacts' own statement of era, independent of what
    // contract-info.json claims about the toolchain that emitted them.
    const major = zkirMajorVersion('counter-016/compiled/zkir/increment.zkir');
    const verifier = readFileSync(hfFixturePath('counter-016/compiled/keys/increment.verifier'));

    // Assert.
    expect(major).toBe(2);
    expect(verifier.subarray(0, PRE_FORK_VERIFIER_KEY_TAG.length).toString('ascii')).toBe(PRE_FORK_VERIFIER_KEY_TAG);
  });

  test('ship a prover key, a verifier key and both zkir forms for every declared circuit', () => {
    // Arrange.
    const contractInfo = asRecord(
      readJson('counter-016/compiled/compiler/contract-info.json'),
      'counter-016 contract-info.json'
    );
    const names = circuitNames(contractInfo);

    // Act: `hfFixturePath` throws on anything it cannot serve, so resolving each
    // path is the existence check.
    const resolved = names.flatMap((name) => [
      hfFixturePath(`counter-016/compiled/keys/${name}.prover`),
      hfFixturePath(`counter-016/compiled/keys/${name}.verifier`),
      hfFixturePath(`counter-016/compiled/zkir/${name}.zkir`),
      hfFixturePath(`counter-016/compiled/zkir/${name}.bzkir`)
    ]);

    // Assert: naming the circuit set explicitly, because a contract-info.json with
    // no circuits would make the flatMap vacuously empty and this test vacuously green.
    expect(names).toEqual(['increment']);
    expect(resolved).toHaveLength(names.length * 4);
    expect(resolved.filter((path) => readFileSync(path).length === 0)).toEqual([]);
  });

  test('are reachable through the same accessor as the rest of the fixture set', () => {
    // Arrange / Act / Assert: the artifacts have to resolve from `dist` as well as
    // from `src`, which is what the accessor exists to guarantee.
    expect(() => hfFixturePath('counter-016/compiled/contract/index.js')).not.toThrow();
    expect(() => hfFixturePath('counter-016/compiled/keys/increment.prover')).not.toThrow();
    expect(() => hfFixturePath('counter-016/compiled/keys/nonexistent.prover')).toThrow(/no such hard-fork fixture/);
  });

  // A canary, not a requirement. Every compactc this repo can fetch -- 0.31.1,
  // 0.33.0 and 0.34.0-rc.0 -- emits a byte-identical prover key, verifier key and
  // zkir for this circuit, all ZKIR major 2 under a `verifier-key[v6]` envelope.
  // That is why the twin contract, which exists to supply a V3 key for AC3's
  // "a V3 proof fails against a preserved co.v2 key" negative, does not currently
  // contain one: `compactc` alone will not produce it, and the bundled
  // `zkir-v3 compile` has to be run deliberately against the emitted zkir.
  //
  // If this ever goes red, a toolchain has started emitting V3 by default. Read
  // that as the AC3 negative becoming constructible, not as a fixture breaking.
  test('are indistinguishable from the v9-compiled twin, which is why AC3 needs zkir-v3', () => {
    // Arrange.
    const retained = readFileSync(hfFixturePath('counter-016/compiled/keys/increment.verifier'));
    const twin = readFileSync(hfFixturePath('twin-contract/compiled/keys/increment.verifier'));

    // Act.
    const twinMajor = zkirMajorVersion('twin-contract/compiled/zkir/increment.zkir');

    // Assert.
    expect(twinMajor).toBe(2);
    expect(retained.equals(twin)).toBe(true);
  });
});
