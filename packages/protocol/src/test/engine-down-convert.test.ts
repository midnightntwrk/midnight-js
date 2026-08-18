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

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import type { AlignedValue as LedgerV9AlignedValue, EncodedStateValue as LedgerV9EncodedStateValue, Op as LedgerV9Op } from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import type { CompactRuntime016 } from '../engine/down-convert';
import { checkRoot, downConvertForExecution, rehashStateValue } from '../engine/down-convert';
import { extractEncodedStateValue } from '../engine/envelope';
import { DownConvertFailedError, MerkleNotRehashedError, PROTOCOL_ERROR_CODES } from '../errors';

const FIXTURES_DIR = resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf');

const readHexFixture = (name: string): Uint8Array => {
  const text = readFileSync(resolve(FIXTURES_DIR, name), 'utf8');
  return Uint8Array.from(Buffer.from(text.trim(), 'hex'));
};

const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];

const fieldValue = (byte: number): ocrt3.AlignedValue => ({
  value: [new Uint8Array(32).fill(byte)],
  alignment: FIELD_ALIGNMENT
});

const buildNeverRehashedTree = (byte: number): ocrt3.StateBoundedMerkleTree =>
  new ocrt3.StateBoundedMerkleTree(4).update(0n, fieldValue(byte));

describe('extractEncodedStateValue + downConvertForExecution round trip', () => {
  it('down-converts a migrated v9 state to data byte-identical with the pre-migration v8 state', () => {
    const v9Encoded = extractEncodedStateValue(readHexFixture('state-migrated-v9.hex'), 'v9');
    const v8Encoded = extractEncodedStateValue(readHexFixture('state-v8.hex'), 'v8');

    const downConverted = downConvertForExecution(v9Encoded, ocrt3);

    expect(downConverted.data.state.encode()).toEqual(v8Encoded);
  });

  it('is a pure function of its byte input (repeatable, no shared mutable state)', () => {
    const raw = readHexFixture('state-migrated-v9.hex');

    const a = downConvertForExecution(extractEncodedStateValue(raw, 'v9'), ocrt3);
    const b = downConvertForExecution(extractEncodedStateValue(raw, 'v9'), ocrt3);

    expect(a.data.state.encode()).toEqual(b.data.state.encode());
  });
});

describe('extractEncodedStateValue', () => {
  it('extracts a v8-era (tag v6) envelope directly via onchain-runtime-v3', () => {
    // state-v8-v6-envelope.hex and state-v8.hex are documented as byte-identical
    // (README.md: the ledger-v8 bridge is a no-op on this input), so they must
    // extract to the same EncodedStateValue.
    const fromRawEnvelope = extractEncodedStateValue(readHexFixture('state-v8-v6-envelope.hex'), 'v8');
    const fromBridgedState = extractEncodedStateValue(readHexFixture('state-v8.hex'), 'v8');

    expect(fromRawEnvelope).toEqual(fromBridgedState);
  });

  it('throws a DownConvertFailedError carrying DOWN_CONVERT_FAILED on truncated/tampered bytes', () => {
    const tampered = readHexFixture('state-tampered-bytes.hex');

    expect(() => extractEncodedStateValue(tampered, 'v9')).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  it('never returns a silently empty state — it throws instead', () => {
    const tampered = readHexFixture('state-tampered-bytes.hex');

    expect(() => extractEncodedStateValue(tampered, 'v9')).toThrow(DownConvertFailedError);
  });

  it('never leaks a raw hex/byte dump in the thrown error message', () => {
    const tampered = readHexFixture('state-tampered-bytes.hex');
    let captured: unknown;

    try {
      extractEncodedStateValue(tampered, 'v9');
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(DownConvertFailedError);
    expect((captured as DownConvertFailedError).message).not.toMatch(/[0-9a-f]{16,}/i);
  });

  // These two fixtures carry an envelope tag deliberately flipped to the
  // *other* ledger version's tag (fixtures/hf/README.md's "Tampered fixtures"
  // section). The verified decode matrix in that README guarantees each
  // direction throws when read with the version the tag now (falsely) claims.
  it.each([
    { fixture: 'state-tampered-keyset-v8to9.hex', version: 'v9' as const },
    { fixture: 'state-tampered-keyset-v9to8.hex', version: 'v8' as const }
  ])('wraps extraction of $fixture as $version in a DownConvertFailedError (DOWN_CONVERT_FAILED)', ({ fixture, version }) => {
    const tampered = readHexFixture(fixture);

    expect(() => extractEncodedStateValue(tampered, version)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });
});

describe('Merkle rehash', () => {
  // With the pinned onchain-runtime-v3 / ledger-v9 versions, `encode()` fully
  // materializes a tree's node hashes even when `.rehash()` was never called,
  // so a fixture that has crossed an encode()/decode() round trip already
  // has a readable root (verified empirically). The "root read before
  // rehash" failure `checkRoot` guards against is instead exercised directly
  // against a freshly built tree that has never been through `.rehash()` or
  // any encode/decode round trip.
  it('a freshly built, never-rehashed tree fails checkRoot with MERKLE_NOT_REHASHED', () => {
    const tree = buildNeverRehashedTree(0x55);

    expect(() => checkRoot(tree)).toThrow(MerkleNotRehashedError);
    expect(() => checkRoot(tree)).toThrowError(expect.objectContaining({ code: PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED }));
  });

  it('checkRoot passes on the golden migrated-v9-merkle fixture after downConvertForExecution rehashes the tree', () => {
    const encoded = extractEncodedStateValue(readHexFixture('state-migrated-v9-merkle.hex'), 'v9');
    const downConverted = downConvertForExecution(encoded, ocrt3);
    const tree = downConverted.data.state.asBoundedMerkleTree();
    if (tree === undefined) {
      throw new Error('test fixture invariant violated: expected a boundedMerkleTree StateValue');
    }

    expect(() => checkRoot(tree)).not.toThrow();
  });
});

describe('rehashStateValue recursion (contract-agnostic StateValue algebra)', () => {
  // These call rehashStateValue directly on structures that have never been
  // through an encode()/decode() round trip — unlike a downConvertForExecution
  // integration test, nothing here can materialize the nested tree's hash as
  // a side effect. The pre-condition assertion (checkRoot throws) proves the
  // tree genuinely starts non-rehashed; the post-condition assertion (checkRoot
  // does not throw) is therefore only satisfiable if rehashStateValue actually
  // recursed into the array/map and rehashed the tree it found — a broken
  // 'array'/'map' case (e.g. one that fails to recurse, or drops the element)
  // would leave the pre-condition's failure unchanged and fail this test.
  it('recurses into an array to rehash a nested tree that was never rehashed', () => {
    const treeSv = ocrt3.StateValue.newBoundedMerkleTree(buildNeverRehashedTree(0x11));
    const arraySv = ocrt3.StateValue.newArray().arrayPush(treeSv);

    const treeBefore = arraySv.asArray()?.[0]?.asBoundedMerkleTree();
    if (treeBefore === undefined) {
      throw new Error('test fixture invariant violated: expected a boundedMerkleTree array element');
    }
    expect(() => checkRoot(treeBefore)).toThrow(MerkleNotRehashedError);

    const result = rehashStateValue(ocrt3.StateValue, arraySv);

    const treeAfter = result.asArray()?.[0]?.asBoundedMerkleTree();
    if (treeAfter === undefined) {
      throw new Error('test fixture invariant violated: expected a boundedMerkleTree array element');
    }
    expect(() => checkRoot(treeAfter)).not.toThrow();
  });

  it('recurses into a map to rehash a nested tree that was never rehashed', () => {
    const key = fieldValue(0x22);
    const treeSv = ocrt3.StateValue.newBoundedMerkleTree(buildNeverRehashedTree(0x33));
    const mapSv = ocrt3.StateValue.newMap(new ocrt3.StateMap().insert(key, treeSv));

    const treeBefore = mapSv.asMap()?.get(key)?.asBoundedMerkleTree();
    if (treeBefore === undefined) {
      throw new Error('test fixture invariant violated: expected a boundedMerkleTree map value');
    }
    expect(() => checkRoot(treeBefore)).toThrow(MerkleNotRehashedError);

    const result = rehashStateValue(ocrt3.StateValue, mapSv);

    const treeAfter = result.asMap()?.get(key)?.asBoundedMerkleTree();
    if (treeAfter === undefined) {
      throw new Error('test fixture invariant violated: expected a boundedMerkleTree map value');
    }
    expect(() => checkRoot(treeAfter)).not.toThrow();
  });
});

describe('downConvertForExecution safety net', () => {
  it('passes a top-level null StateValue through unchanged', () => {
    const downConverted = downConvertForExecution(ocrt3.StateValue.newNull().encode(), ocrt3);

    expect(downConverted.data.state.type()).toBe('null');
  });

  it('throws DOWN_CONVERT_FAILED if the decoded StateValue silently lost non-null source data', () => {
    const nonNullEncoded = ocrt3.StateValue.newCell(fieldValue(0x44)).encode();
    const lossyRuntime: CompactRuntime016 = {
      StateValue: {
        newArray: () => ocrt3.StateValue.newArray(),
        newMap: (map) => ocrt3.StateValue.newMap(map),
        newBoundedMerkleTree: (tree) => ocrt3.StateValue.newBoundedMerkleTree(tree),
        decode: () => ocrt3.StateValue.newNull()
      },
      ChargedState: ocrt3.ChargedState
    };

    expect(() => downConvertForExecution(nonNullEncoded, lossyRuntime)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  it('wraps a StateValue.decode failure in DownConvertFailedError', () => {
    const throwingRuntime: CompactRuntime016 = {
      StateValue: {
        newArray: () => ocrt3.StateValue.newArray(),
        newMap: (map) => ocrt3.StateValue.newMap(map),
        newBoundedMerkleTree: (tree) => ocrt3.StateValue.newBoundedMerkleTree(tree),
        decode: () => {
          throw new Error('simulated decode failure');
        }
      },
      ChargedState: ocrt3.ChargedState
    };

    expect(() => downConvertForExecution(ocrt3.StateValue.newNull().encode(), throwingRuntime)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });
});

// --- Step 5: compile-time drift detector ------------------------------------
// If a vendor bump ever changes the wire shape of EncodedStateValue, Op, or
// AlignedValue between the pre-fork (onchain-runtime-v3) and post-fork
// (ledger-v9) packages this engine bridges, this block stops compiling — long
// before any fixture-based test could catch a silent structural drift.
type AssertEqual<A, B> = (<T>() => T extends A ? 1 : 0) extends <T>() => T extends B ? 1 : 0 ? true : false;
type Expect<T extends true> = T;

type _EncodedStateValueUnchanged = Expect<AssertEqual<ocrt3.EncodedStateValue, LedgerV9EncodedStateValue>>;
type _OpUnchanged = Expect<AssertEqual<ocrt3.Op<null>, LedgerV9Op<null>>>;
type _AlignedValueUnchanged = Expect<AssertEqual<ocrt3.AlignedValue, LedgerV9AlignedValue>>;

describe('v8/v9 EncodedStateValue, Op, and AlignedValue shapes', () => {
  it('have not drifted between onchain-runtime-v3 and ledger-v9 (compile-time gate above; this only documents intent)', () => {
    const driftChecks: [_EncodedStateValueUnchanged, _OpUnchanged, _AlignedValueUnchanged] = [true, true, true];

    expect(driftChecks).toEqual([true, true, true]);
  });
});
