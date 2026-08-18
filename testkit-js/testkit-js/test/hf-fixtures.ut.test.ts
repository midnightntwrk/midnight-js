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
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ContractState as LedgerContractStateV8 } from '@midnightntwrk/ledger-v8';
import { ContractState as LedgerContractStateV9 } from '@midnightntwrk/ledger-v9';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(HERE, '../src/fixtures/hf');

interface FixtureEntry {
  readonly protocolVersion: number | null;
  readonly status: 'ok' | 'synthetic' | 'tampered';
}

interface FixturesManifest {
  readonly fixtures: Record<string, FixtureEntry>;
}

const readManifest = (): FixturesManifest =>
  JSON.parse(readFileSync(resolve(FIXTURES_DIR, 'fixtures.json'), 'utf8')) as FixturesManifest;

const readHexFixture = (name: string): Uint8Array => {
  const text = readFileSync(resolve(FIXTURES_DIR, name), 'utf8');
  return Uint8Array.from(Buffer.from(text.trim(), 'hex'));
};

const EXPECTED_FIXTURE_NAMES = [
  'state-v8.hex',
  'state-v8-v6-envelope.hex',
  'state-migrated-v9.hex',
  'state-migrated-v9-merkle.hex',
  'state-tampered-keyset-v8to9.hex',
  'state-tampered-keyset-v9to8.hex',
  'state-tampered-bytes.hex',
  'state-both-keys.hex',
  'state-co-v2-only-foreign.hex'
];

// Expected per fixtures.json, asserted explicitly here so drift between the
// two is caught by CI rather than discovered later.
const EXPECTED_PROTOCOL_VERSIONS: Record<string, number | null> = {
  'state-v8.hex': 1000000,
  'state-v8-v6-envelope.hex': 1000000,
  'state-migrated-v9.hex': 2000000,
  'state-migrated-v9-merkle.hex': 2000000,
  'state-tampered-keyset-v8to9.hex': 2000000,
  'state-tampered-keyset-v9to8.hex': 1000000,
  'state-tampered-bytes.hex': 2000000,
  'state-both-keys.hex': null,
  'state-co-v2-only-foreign.hex': 2000000
};

describe('[Unit tests] OQ9 hard-fork fixtures', () => {
  const manifest = readManifest();

  it('declares exactly the nine fixtures named in the task-0.2 brief', () => {
    expect(Object.keys(manifest.fixtures).sort()).toEqual([...EXPECTED_FIXTURE_NAMES].sort());
  });

  it('every .hex file on disk is listed in fixtures.json, and vice versa', () => {
    const onDisk = readdirSync(FIXTURES_DIR)
      .filter((entry) => entry.endsWith('.hex'))
      .sort();

    expect(onDisk).toEqual(Object.keys(manifest.fixtures).sort());
  });

  it('every fixture carries the protocolVersion recorded in fixtures.json (including the null on state-both-keys.hex)', () => {
    const actual = Object.fromEntries(
      Object.entries(manifest.fixtures).map(([name, entry]) => [name, entry.protocolVersion])
    );

    expect(actual).toEqual(EXPECTED_PROTOCOL_VERSIONS);
  });

  describe.each(EXPECTED_FIXTURE_NAMES)('%s', (name) => {
    it('exists on disk and parses as hex', () => {
      const text = readFileSync(resolve(FIXTURES_DIR, name), 'utf8').trim();

      expect(text.length).toBeGreaterThan(0);
      expect(text.length % 2).toBe(0);
      expect(text).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('golden and synthetic fixtures deserialize with their intended ledger', () => {
    it('state-v8.hex deserializes with ledger-v8', () => {
      const bytes = readHexFixture('state-v8.hex');

      expect(() => LedgerContractStateV8.deserialize(bytes)).not.toThrow();
    });

    it('state-v8-v6-envelope.hex deserializes with ledger-v8', () => {
      const bytes = readHexFixture('state-v8-v6-envelope.hex');

      expect(() => LedgerContractStateV8.deserialize(bytes)).not.toThrow();
    });

    it('state-migrated-v9.hex deserializes with ledger-v9', () => {
      const bytes = readHexFixture('state-migrated-v9.hex');

      expect(() => LedgerContractStateV9.deserialize(bytes)).not.toThrow();
    });

    it('state-migrated-v9-merkle.hex deserializes with ledger-v9', () => {
      const bytes = readHexFixture('state-migrated-v9-merkle.hex');

      const state = LedgerContractStateV9.deserialize(bytes);
      const tree = state.data.state.asBoundedMerkleTree();

      expect(tree).toBeDefined();
      expect(tree?.root()).toBeDefined();
    });
  });

  describe('state-co-v2-only-foreign.hex (A4 mis-dispatch): a valid state, with a foreign key inside', () => {
    it('deserializes cleanly as a ContractState on ledger-v9 (shape-positive, not a decode failure)', () => {
      const bytes = readHexFixture('state-co-v2-only-foreign.hex');

      expect(() => LedgerContractStateV9.deserialize(bytes)).not.toThrow();
    });

    it('registers an "increment" operation whose verifier key is genuinely foreign to the twin contract', () => {
      const bytes = readHexFixture('state-co-v2-only-foreign.hex');
      const state = LedgerContractStateV9.deserialize(bytes);

      const operation = state.operation('increment');
      expect(operation).toBeDefined();

      const twinKey = readFileSync(resolve(FIXTURES_DIR, 'twin-contract/compiled/keys/increment.verifier'));
      expect(Buffer.from(operation!.verifierKey).equals(twinKey)).toBe(false);
    });

    it('is not a valid v8-era ContractState (this fixture is v9-era only)', () => {
      const bytes = readHexFixture('state-co-v2-only-foreign.hex');

      expect(() => LedgerContractStateV8.deserialize(bytes)).toThrow();
    });
  });

  describe('tampered fixtures fail closed on both ledger versions', () => {
    const tamperedNames = Object.entries(manifest.fixtures)
      .filter(([, entry]) => entry.status === 'tampered')
      .map(([fixtureName]) => fixtureName);

    it('covers all four documented tampered fixtures', () => {
      expect(tamperedNames.sort()).toEqual(
        ['state-tampered-keyset-v8to9.hex', 'state-tampered-keyset-v9to8.hex', 'state-tampered-bytes.hex', 'state-both-keys.hex'].sort()
      );
    });

    describe.each(tamperedNames)('%s', (name) => {
      it('is rejected by ledger-v8 AND ledger-v9 (no silent mis-dispatch)', () => {
        const bytes = readHexFixture(name);

        expect(() => LedgerContractStateV8.deserialize(bytes)).toThrow();
        expect(() => LedgerContractStateV9.deserialize(bytes)).toThrow();
      });
    });
  });

  it('state-v8.hex and state-v8-v6-envelope.hex are byte-identical (the ledger-v8 bridge is a no-op on this input)', () => {
    expect(readHexFixture('state-v8.hex')).toEqual(readHexFixture('state-v8-v6-envelope.hex'));
  });
});
