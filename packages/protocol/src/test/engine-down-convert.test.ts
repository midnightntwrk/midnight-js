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

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
// Type-only: erased at build time, so this pins the ledger-v8 payload shapes
// without linking the v8 module into anything.
import type {
  AlignedValue as LedgerV8AlignedValue,
  EncodedStateValue as LedgerV8EncodedStateValue,
  Op as LedgerV8Op
} from '@midnightntwrk/ledger-v8';
import {
  type AlignedValue as LedgerV9AlignedValue,
  ChargedState as LedgerV9ChargedState,
  ContractState as LedgerV9ContractState,
  type EncodedStateValue as LedgerV9EncodedStateValue,
  type Op as LedgerV9Op,
  StateValue as LedgerV9StateValue
} from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { DownConvertFailedError, MerkleNotRehashedError, PROTOCOL_ERROR_CODES } from '../errors';
import type { Ledger8CompactRuntime } from '../lib/engine/down-convert';
import {
  assertMerkleTreesRehashed,
  checkRoot,
  downConvertForExecution,
  structurallyEqual
} from '../lib/engine/down-convert';
import { extractEncodedStateValue } from '../lib/engine/envelope';
import type { LedgerVersion } from '../version';

// Envelopes are built in-process rather than read from the hard-fork golden
// fixtures, so this suite depends only on the two runtimes it bridges. The
// goldens prove something this cannot — that a *real* migrated on-chain state
// down-converts byte-identically to its pre-migration form — and the tests
// asserting that ship with those fixtures rather than here.
const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];

const fieldValue = (byte: number): ocrt3.AlignedValue => ({
  value: [new Uint8Array(32).fill(byte)],
  alignment: FIELD_ALIGNMENT
});

const buildNeverRehashedTree = (byte: number): ocrt3.StateBoundedMerkleTree =>
  new ocrt3.StateBoundedMerkleTree(4).update(0n, fieldValue(byte));

const neverRehashedTreeSv = (byte: number): ocrt3.StateValue =>
  ocrt3.StateValue.newBoundedMerkleTree(buildNeverRehashedTree(byte));

const rehashedTreeSv = (byte: number): ocrt3.StateValue =>
  ocrt3.StateValue.newBoundedMerkleTree(buildNeverRehashedTree(byte).rehash());

const cellSv = (byte: number): ocrt3.StateValue => ocrt3.StateValue.newCell(fieldValue(byte));

const arrayOf = (...items: readonly ocrt3.StateValue[]): ocrt3.StateValue =>
  items.reduce((acc, item) => acc.arrayPush(item), ocrt3.StateValue.newArray());

const mapOf = (...entries: readonly (readonly [number, ocrt3.StateValue])[]): ocrt3.StateValue =>
  ocrt3.StateValue.newMap(
    entries.reduce((acc, [key, value]) => acc.insert(fieldValue(key), value), new ocrt3.StateMap())
  );

/** A `contract-state[v6]` envelope, serialized by the pre-fork runtime itself. */
const ledger8Envelope = (state: ocrt3.StateValue): Uint8Array => {
  const contractState = new ocrt3.ContractState();
  contractState.data = new ocrt3.ChargedState(state);
  return contractState.serialize();
};

/** A `contract-state[v8]` envelope, serialized by the post-fork ledger. */
const ledger9Envelope = (byte: number): Uint8Array => {
  const contractState = new LedgerV9ContractState();
  contractState.data = new LedgerV9ChargedState(
    LedgerV9StateValue.newCell({ value: [new Uint8Array(32).fill(byte)], alignment: FIELD_ALIGNMENT })
  );
  return contractState.serialize();
};

/** A runtime whose `decode` is replaced, so the safety net can be driven directly. */
const runtimeDecoding = (decode: () => ocrt3.StateValue): Ledger8CompactRuntime => ({
  StateValue: { decode },
  ChargedState: ocrt3.ChargedState
});

describe('extractEncodedStateValue + downConvertForExecution round trip', () => {
  it('down-converts a post-fork state to the same data the pre-fork envelope carries', () => {
    const v9Encoded = extractEncodedStateValue(ledger9Envelope(0x42), 'v9', ocrt3.ContractState);
    const v8Encoded = extractEncodedStateValue(ledger8Envelope(cellSv(0x42)), 'v8', ocrt3.ContractState);

    const downConverted = downConvertForExecution(v9Encoded, ocrt3);

    expect(downConverted.data.state.encode()).toEqual(v8Encoded);
  });

  it('is a pure function of its byte input (repeatable, no shared mutable state)', () => {
    const raw = ledger9Envelope(0x42);

    const a = downConvertForExecution(extractEncodedStateValue(raw, 'v9', ocrt3.ContractState), ocrt3);
    const b = downConvertForExecution(extractEncodedStateValue(raw, 'v9', ocrt3.ContractState), ocrt3);

    expect(a.data.state.encode()).toEqual(b.data.state.encode());
  });
});

describe('extractEncodedStateValue', () => {
  // `version` is typed, but extractEncodedStateValue sits behind the public
  // Ledger8Engine.extractState, so an untyped consumer can reach it with any
  // string. A bare index would resolve these off Object.prototype and return
  // their result as if it were state -- 'toString' yields the STRING
  // '[object Undefined]' with no throw at all.
  it.each(['v7', 'toString', 'valueOf', 'constructor'])(
    'rejects the unsupported ledger version %s instead of routing it to a prototype member',
    (version) => {
      let caught: unknown;
      try {
        extractEncodedStateValue(ledger8Envelope(cellSv(0x07)), version as LedgerVersion, ocrt3.ContractState);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(DownConvertFailedError);
      const error = caught as DownConvertFailedError;
      expect(error.code).toBe(PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED);
      expect((error.cause as Error).message).toContain(`Unknown ledger version '${version}'`);
    }
  );

  it('reads a pre-fork envelope through the pre-fork decoder', () => {
    const extracted = extractEncodedStateValue(ledger8Envelope(cellSv(0x07)), 'v8', ocrt3.ContractState);

    expect(extracted).toEqual(cellSv(0x07).encode());
  });

  it('reads a post-fork envelope through the post-fork decoder', () => {
    const extracted = extractEncodedStateValue(ledger9Envelope(0x07), 'v9', ocrt3.ContractState);

    expect(extracted).toEqual(cellSv(0x07).encode());
  });

  // The realistic production bug is not a tampered envelope but a *valid*
  // state read with the wrong LedgerVersion — e.g. a protocolVersion mapping
  // error routing a genuine v9 state to the pre-fork decoder. Each envelope
  // carries its own era's header tag, so each direction must fail closed.
  it('rejects a valid post-fork envelope read as v8', () => {
    expect(() => extractEncodedStateValue(ledger9Envelope(0x07), 'v8', ocrt3.ContractState)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  it('rejects a valid pre-fork envelope read as v9', () => {
    expect(() => extractEncodedStateValue(ledger8Envelope(cellSv(0x07)), 'v9', ocrt3.ContractState)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  it.each([
    { name: 'empty input', raw: new Uint8Array(0) },
    { name: 'a truncated envelope', raw: ledger9Envelope(0x07).slice(0, 20) },
    { name: 'an envelope with trailing bytes', raw: Uint8Array.from([...ledger9Envelope(0x07), 0, 0, 0, 0]) }
  ])('rejects $name rather than yielding a partial state', ({ raw }) => {
    expect(() => extractEncodedStateValue(raw, 'v9', ocrt3.ContractState)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  it('never returns a silently empty state — it throws instead', () => {
    expect(() => extractEncodedStateValue(new Uint8Array(0), 'v8', ocrt3.ContractState)).toThrow(
      DownConvertFailedError
    );
  });

  it('never leaks a raw hex/byte dump in the thrown error message', () => {
    try {
      extractEncodedStateValue(ledger9Envelope(0x07).slice(0, 20), 'v9', ocrt3.ContractState);
      expect.unreachable('a truncated envelope must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DownConvertFailedError);
      expect((error as DownConvertFailedError).message).not.toMatch(/[0-9a-f]{16,}/i);
    }
  });

  it('names the failing stage, including the version the caller asked for', () => {
    try {
      extractEncodedStateValue(new Uint8Array(0), 'v8', ocrt3.ContractState);
      expect.unreachable('empty input must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DownConvertFailedError);
      expect((error as DownConvertFailedError).stage).toBe('v8 envelope extraction');
    }
  });
});

describe('Merkle rehash', () => {
  it('a freshly built, never-rehashed tree fails checkRoot with MERKLE_NOT_REHASHED', () => {
    const tree = buildNeverRehashedTree(0x55);

    expect(() => checkRoot(tree)).toThrow(MerkleNotRehashedError);
    expect(() => checkRoot(tree)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED })
    );
  });

  // This is the vendor behaviour `assertMerkleTreesRehashed`'s fail-fast
  // design rests on: because a round trip materializes hashes, a rootless tree
  // reaching the walk can only be an upstream programming error, never
  // ordinary state. If a vendor bump ever stops materializing them, this test
  // fails and the fail-fast reasoning has to be revisited — rather than the
  // change surfacing in production.
  it('an encode/decode round trip materializes the hashes of a tree that was never rehashed', () => {
    const encoded = neverRehashedTreeSv(0x55).encode();

    const decoded = ocrt3.StateValue.decode(encoded);

    expect(() => checkRoot(decoded.asBoundedMerkleTree()!)).not.toThrow();
  });
});

describe('assertMerkleTreesRehashed recursion (contract-agnostic StateValue algebra)', () => {
  // These call assertMerkleTreesRehashed directly on structures that have
  // never been through an encode()/decode() round trip — nothing here can
  // materialize the nested tree's hash as a side effect. A throw is therefore
  // only producible if the walk actually reached the never-rehashed tree.
  it('recurses into an array and rejects a nested tree that was never rehashed', () => {
    expect(() => assertMerkleTreesRehashed(arrayOf(neverRehashedTreeSv(0x11)))).toThrow(MerkleNotRehashedError);
  });

  it('recurses into a map and rejects a nested tree that was never rehashed', () => {
    expect(() => assertMerkleTreesRehashed(mapOf([0x22, neverRehashedTreeSv(0x33)]))).toThrow(MerkleNotRehashedError);
  });

  // A walk that only inspected each container's first element would pass every
  // single-element test above. These place the rootless tree last.
  it('rejects a tree at a non-first array position', () => {
    const sv = arrayOf(cellSv(0x01), rehashedTreeSv(0x02), neverRehashedTreeSv(0x03));

    expect(() => assertMerkleTreesRehashed(sv)).toThrow(MerkleNotRehashedError);
  });

  it('rejects a tree at a non-first map entry', () => {
    const sv = mapOf([0x01, cellSv(0x01)], [0x02, rehashedTreeSv(0x02)], [0x03, neverRehashedTreeSv(0x03)]);

    expect(() => assertMerkleTreesRehashed(sv)).toThrow(MerkleNotRehashedError);
  });

  // A walk flattened to a single level — checking each container's immediate
  // children instead of recursing — would pass every test above. These nest
  // the rootless tree two containers deep, through both container variants.
  it('rejects a tree nested two arrays deep', () => {
    const sv = arrayOf(cellSv(0x01), arrayOf(cellSv(0x02), neverRehashedTreeSv(0x03)));

    expect(() => assertMerkleTreesRehashed(sv)).toThrow(MerkleNotRehashedError);
  });

  it('rejects a tree nested in a map inside an array', () => {
    const sv = arrayOf(cellSv(0x01), mapOf([0x02, cellSv(0x02)], [0x03, neverRehashedTreeSv(0x04)]));

    expect(() => assertMerkleTreesRehashed(sv)).toThrow(MerkleNotRehashedError);
  });

  it('rejects a tree nested in an array inside a map', () => {
    const sv = mapOf([0x01, cellSv(0x01)], [0x02, arrayOf(cellSv(0x03), neverRehashedTreeSv(0x04))]);

    expect(() => assertMerkleTreesRehashed(sv)).toThrow(MerkleNotRehashedError);
  });

  it('accepts nested containers whose trees have all been rehashed', () => {
    const sv = arrayOf(
      ocrt3.StateValue.newNull(),
      cellSv(0x01),
      rehashedTreeSv(0x02),
      mapOf([0x03, rehashedTreeSv(0x04)], [0x05, arrayOf(rehashedTreeSv(0x06))])
    );

    expect(() => assertMerkleTreesRehashed(sv)).not.toThrow();
  });
});

describe('downConvertForExecution safety net', () => {
  it('passes a top-level null StateValue through unchanged', () => {
    const downConverted = downConvertForExecution(ocrt3.StateValue.newNull().encode(), ocrt3);

    expect(downConverted.data.state.type()).toBe('null');
  });

  it('throws DOWN_CONVERT_FAILED if the decoded StateValue collapsed to null', () => {
    const nonNullEncoded = cellSv(0x44).encode();

    expect(() =>
      downConvertForExecution(nonNullEncoded, runtimeDecoding(() => ocrt3.StateValue.newNull()))
    ).toThrowError(expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED }));
  });

  // Partial loss is the mode a top-level tag comparison cannot see: the source
  // and the decoded value are both arrays, so only a full structural
  // comparison catches the dropped element.
  it('throws DOWN_CONVERT_FAILED if the decoded array silently lost an element', () => {
    const source = arrayOf(cellSv(0x01), cellSv(0x02)).encode();

    expect(() => downConvertForExecution(source, runtimeDecoding(() => arrayOf(cellSv(0x01))))).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  it('throws DOWN_CONVERT_FAILED if the decoded map silently lost an entry', () => {
    const source = mapOf([0x01, cellSv(0x01)], [0x02, cellSv(0x02)]).encode();

    expect(() => downConvertForExecution(source, runtimeDecoding(() => mapOf([0x01, cellSv(0x01)])))).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  it('throws DOWN_CONVERT_FAILED if a nested cell changed value', () => {
    const source = arrayOf(cellSv(0x01), arrayOf(cellSv(0x02))).encode();

    expect(() =>
      downConvertForExecution(source, runtimeDecoding(() => arrayOf(cellSv(0x01), arrayOf(cellSv(0x99)))))
    ).toThrowError(expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED }));
  });

  it('wraps a StateValue.decode failure in DownConvertFailedError', () => {
    const throwingRuntime = runtimeDecoding(() => {
      throw new Error('simulated decode failure');
    });

    expect(() => downConvertForExecution(ocrt3.StateValue.newNull().encode(), throwingRuntime)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  // ChargedState construction is where a genuine dual-instantiation surfaces:
  // wasm-bindgen rejects a StateValue built by the other physical copy. It has
  // to leave this function as a coded error like every other failure, or
  // code-based discrimination breaks exactly where it matters most.
  it('wraps a ChargedState construction failure in DownConvertFailedError', () => {
    class ThrowingChargedState extends ocrt3.ChargedState {
      constructor(state: ocrt3.StateValue) {
        super(state);
        throw new Error('simulated ChargedState rejection');
      }
    }
    const runtime: Ledger8CompactRuntime = { StateValue: ocrt3.StateValue, ChargedState: ThrowingChargedState };

    expect(() => downConvertForExecution(cellSv(0x44).encode(), runtime)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  it('throws MERKLE_NOT_REHASHED instead of returning a state whose tree has no readable root', () => {
    // A real encode()/decode() round trip materializes tree hashes, so the
    // only way a never-rehashed tree can reach the walk is an injected decode.
    // The source is encoded from the same structure so the re-encode
    // comparison passes and the Merkle assertion is what fails.
    const source = arrayOf(neverRehashedTreeSv(0x55)).encode();

    expect(() =>
      downConvertForExecution(source, runtimeDecoding(() => arrayOf(neverRehashedTreeSv(0x55))))
    ).toThrowError(expect.objectContaining({ code: PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED }));
  });
});

describe('structurallyEqual', () => {
  it('holds for a state value and its own re-encoding, including a multi-entry map', () => {
    // Also pins the assumption the comparison relies on: the runtime emits map
    // entries in a canonical key order, so a value and its re-encoding iterate
    // identically even when the entries were inserted out of order.
    const encoded = mapOf([0x33, cellSv(0x33)], [0x11, cellSv(0x11)], [0x77, cellSv(0x77)]).encode();

    expect(structurallyEqual(ocrt3.StateValue.decode(encoded).encode(), encoded)).toBe(true);
  });

  it.each([
    { name: 'identical primitives', a: 1, b: 1, equal: true },
    { name: 'different primitives', a: 1, b: 2, equal: false },
    { name: 'null against an object', a: null, b: {}, equal: false },
    { name: 'an object against a primitive', a: {}, b: 1, equal: false },
    { name: 'equal byte arrays', a: new Uint8Array([1, 2]), b: new Uint8Array([1, 2]), equal: true },
    { name: 'byte arrays of different length', a: new Uint8Array([1, 2]), b: new Uint8Array([1]), equal: false },
    { name: 'byte arrays differing in one byte', a: new Uint8Array([1, 2]), b: new Uint8Array([1, 3]), equal: false },
    { name: 'a byte array against a plain array', a: new Uint8Array([1]), b: [1], equal: false },
    { name: 'equal maps', a: new Map([['k', 1]]), b: new Map([['k', 1]]), equal: true },
    { name: 'maps of different size', a: new Map([['k', 1]]), b: new Map(), equal: false },
    { name: 'maps with different keys', a: new Map([['k', 1]]), b: new Map([['j', 1]]), equal: false },
    { name: 'maps with different values', a: new Map([['k', 1]]), b: new Map([['k', 2]]), equal: false },
    { name: 'a map against a plain object', a: new Map([['k', 1]]), b: { k: 1 }, equal: false },
    { name: 'equal arrays', a: [1, 2], b: [1, 2], equal: true },
    { name: 'arrays of different length', a: [1, 2], b: [1], equal: false },
    { name: 'an array against an object', a: [1], b: { 0: 1 }, equal: false },
    { name: 'equal objects', a: { x: 1, y: [2] }, b: { x: 1, y: [2] }, equal: true },
    { name: 'objects with different key counts', a: { x: 1 }, b: { x: 1, y: 2 }, equal: false },
    { name: 'objects with different values', a: { x: 1 }, b: { x: 2 }, equal: false },
    { name: 'objects with different keys', a: { x: 1 }, b: { y: 1 }, equal: false }
  ])('is $equal for $name', ({ a, b, equal }) => {
    expect(structurallyEqual(a, b)).toBe(equal);
  });
});

// Compile-time drift detector. If a vendor bump ever changes the wire shape of
// EncodedStateValue, Op, or AlignedValue between the pre-fork
// (onchain-runtime-v3) and post-fork (ledger-v9) packages this engine bridges,
// this block stops compiling. It is enforced by `yarn typecheck:tests`, which
// the pre-push hook runs; it is deliberately not paired with a runtime
// assertion, since any such assertion would be a tautology after erasure.
type AssertEqual<A, B> = (<T>() => T extends A ? 1 : 0) extends <T>() => T extends B ? 1 : 0 ? true : false;
type Expect<T extends true> = T;

type _EncodedStateValueUnchanged = Expect<AssertEqual<ocrt3.EncodedStateValue, LedgerV9EncodedStateValue>>;
type _OpUnchanged = Expect<AssertEqual<ocrt3.Op<null>, LedgerV9Op<null>>>;
type _AlignedValueUnchanged = Expect<AssertEqual<ocrt3.AlignedValue, LedgerV9AlignedValue>>;

// The ledger-v8 axis, pinned for the same reason: assemble-call.ts crosses the
// envelope into whichever ledger module it is handed, and its safety argument
// ("a safe envelope crossing, not a lossy re-encode") covers ledger-v8 as soon
// as the v8-native leg binds to it. Without these rows a ledger-v8 vendor bump
// would break that argument with no compile error.
type _V8EncodedStateValueUnchanged = Expect<AssertEqual<LedgerV8EncodedStateValue, LedgerV9EncodedStateValue>>;
type _V8OpUnchanged = Expect<AssertEqual<LedgerV8Op<null>, LedgerV9Op<null>>>;
type _V8AlignedValueUnchanged = Expect<AssertEqual<LedgerV8AlignedValue, LedgerV9AlignedValue>>;
