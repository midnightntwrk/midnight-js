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
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type ContractStatePojo, loadLedgerEra } from '@midnight-ntwrk/midnight-js-protocol';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { BlankVerifierKeySlotError, VerifierKeyMismatchError } from '../errors';
import { assertVerifierKeyMatches } from '../internal/verifier-key';

// The shared hard-fork fixture tree, reached by relative path: `testkit-js` depends on
// `midnight-js-contracts`, so a package dependency here would close a workspace cycle.
const FIXTURES_DIR = resolve(fileURLToPath(new URL('../../../../', import.meta.url)), 'testkit-js/testkit-js/src/fixtures/hf');

// The mis-dispatch negative. A full, well-formed contract state that deserializes cleanly on the
// post-fork ledger, whose `increment` slot carries a FOREIGN verifier key -- the real `post`
// operation borrowed from a different migrated contract. Its own README records why it cannot fail
// at decode or at a presence check: the slot IS populated, and the down-convert reads only the
// primary state. The byte-match below is the first thing that can catch it.
//
// The FILENAME keeps its `co-v2` wording, which is checked in and byte-referenced from the fixture
// manifest. That vocabulary does not appear in this package's code and does not correspond to
// anything in either ledger's API -- see `../internal/verifier-key.ts` -- so the mismatch between the
// name and the code is expected rather than a defect.
const FOREIGN_KEY_STATE = resolve(FIXTURES_DIR, 'state-co-v2-only-foreign.hex');
// The known-good key for the counter's `increment` circuit, compiled from the same source with a
// post-fork toolchain. The fixture's own smoke test confirms the state above is NOT keyed with it.
const TWIN_INCREMENT_KEY = resolve(FIXTURES_DIR, 'twin-contract/compiled/keys/increment.verifier');

const readBytes = (path: string): Uint8Array => Uint8Array.from(readFileSync(path));

const readHexFixture = (path: string): Uint8Array =>
  Uint8Array.from(Buffer.from(readFileSync(path, 'utf8').trim(), 'hex'));

const toHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

describe('assertVerifierKeyMatches: the pre-proving verifier-key check', () => {
  const localIncrementKey = readBytes(TWIN_INCREMENT_KEY);
  // A real production key from this package's own compiled test contract, used for the positive
  // and the equal-length negative so neither rests on a hand-built byte string.
  const depositKey = readBytes(
    fileURLToPath(new URL('./resources/compiled/shielded-map/keys/deposit.verifier', import.meta.url))
  );

  let foreignState: ContractStatePojo;

  beforeAll(async () => {
    // Decoded through the era facade, which is the only state reader this package may use.
    const era = await loadLedgerEra('v9');
    foreignState = era.decodeContractState(readHexFixture(FOREIGN_KEY_STATE));
  });

  it('accepts a key that byte-matches the slot it is checked against', () => {
    expect(() => assertVerifierKeyMatches(depositKey, depositKey, 'deposit')).not.toThrow();
  });

  it('refuses the mis-dispatch fixture: a foreign key sitting in an otherwise valid slot', () => {
    // Arrange: the state declares exactly the circuit the local artifact implements, and the slot
    // is populated -- so neither a presence check nor a decode rejects it.
    expect(foreignState.entryPoints.map((entryPoint) => entryPoint.circuitId)).toEqual(['increment']);
    const slot = foreignState.entryPoints[0]?.verifierKey;
    expect(slot).toBeInstanceOf(Uint8Array);

    // Act + Assert
    try {
      assertVerifierKeyMatches(localIncrementKey, slot, 'increment');
      expect.unreachable('a foreign verifier key was accepted for the local artifact');
    } catch (error) {
      expect(error).toBeInstanceOf(VerifierKeyMismatchError);
      expect((error as VerifierKeyMismatchError).circuitId).toBe('increment');
    }
  });

  it('accepts that same fixture slot against ITSELF, so the refusal above is about the bytes', () => {
    // Without this, a refusal caused by the fixture being unreadable rather than by the key being
    // foreign would pass the test above just as well.
    const slot = foreignState.entryPoints[0]?.verifierKey;

    expect(() => assertVerifierKeyMatches(slot!, slot, 'increment')).not.toThrow();
  });

  it('refuses a key of the SAME length whose bytes differ, so this is a byte match and not a length check', () => {
    // The foreign fixture's key differs in length from the local one (2119 vs 1351 bytes), so on
    // its own it cannot distinguish a real comparison from a cheap length test.
    const flipped = Uint8Array.from(depositKey);
    flipped[flipped.length - 1] ^= 0xff;
    expect(flipped.length).toBe(depositKey.length);

    expect(() => assertVerifierKeyMatches(flipped, depositKey, 'deposit')).toThrow(VerifierKeyMismatchError);
  });

  it('refuses a blank slot: an entry point the state declares but no key was ever deployed for', () => {
    // `undefined` is exactly what the era facade reports for a never-deployed slot -- absent, not
    // zero-length -- so this is the real shape and not a stand-in for one.
    try {
      assertVerifierKeyMatches(localIncrementKey, undefined, 'increment');
      expect.unreachable('a blank verifier-key slot was accepted');
    } catch (error) {
      expect(error).toBeInstanceOf(BlankVerifierKeySlotError);
      expect((error as BlankVerifierKeySlotError).circuitId).toBe('increment');
    }
  });

  it('refuses before anything is proved: the check needs no provider and throws synchronously', () => {
    const proveTx = vi.fn();
    const slot = foreignState.entryPoints[0]?.verifierKey;
    // The sequence a calling pipeline must use. The check throws synchronously, so there is no
    // await between the two steps at which a proof could already have been started.
    const checkThenProve = (): unknown => {
      assertVerifierKeyMatches(localIncrementKey, slot, 'increment');
      return proveTx();
    };

    expect(checkThenProve).toThrow(VerifierKeyMismatchError);

    expect(proveTx).not.toHaveBeenCalled();
  });

  it.each([
    [
      'the mismatch',
      (): Error => new VerifierKeyMismatchError('increment')
    ],
    [
      'the blank slot',
      (): Error => new BlankVerifierKeySlotError('increment')
    ]
  ])('names the circuit but leaks no key material in %s message', (_label, build) => {
    const { message } = build();

    expect(message).toContain('increment');
    // No key bytes, in either direction: neither key's hex, nor any long hex run that could only
    // have come from one.
    expect(message).not.toContain(toHex(localIncrementKey));
    expect(message).not.toContain(toHex(depositKey));
    expect(message).not.toMatch(/[0-9a-f]{32,}/i);
  });
});
