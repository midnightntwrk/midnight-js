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
  StateMap as LedgerV9StateMap,
  StateValue as LedgerV9StateValue
} from '@midnightntwrk/ledger-v9';
import type * as ocrt4 from '@midnightntwrk/onchain-runtime-v4';
import { describe, expect, it } from 'vitest';

import {
  DownConvertFailedError,
  Ledger8RuntimeInvalidError,
  MerkleNotRehashedError,
  PROTOCOL_ERROR_CODES,
  UnknownLedgerVersionError
} from '../errors';
import type { Ledger8CompactRuntime } from '../lib/engine/down-convert';
import {
  assertMerkleTreesRehashed,
  checkRoot,
  downConvertForExecution,
  structurallyEqual
} from '../lib/engine/down-convert';
import { extractEncodedStateValue } from '../lib/engine/envelope';

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
  ContractState: ocrt3.ContractState,
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

  it.each([
    { version: 'v8' as const, stage: 'v8 envelope extraction' },
    { version: 'v9' as const, stage: 'v9 envelope extraction' }
  ])('names the failing stage as $stage for a $version extraction', ({ version, stage }) => {
    try {
      extractEncodedStateValue(new Uint8Array(0), version, ocrt3.ContractState);
      expect.unreachable('empty input must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DownConvertFailedError);
      expect((error as DownConvertFailedError).stage).toBe(stage);
    }
  });

  // The class message deliberately carries no detail of its own — it tells the
  // caller to read the cause, which is where the runtime's own diagnosis
  // (tag mismatch vs truncated vs trailing vs empty) lives. Dropping the
  // `{ cause }` argument would leave that instruction pointing at nothing, so
  // the wiring is asserted rather than assumed.
  it.each([{ version: 'v8' as const }, { version: 'v9' as const }])(
    'preserves the runtime cause behind a failed $version extraction',
    ({ version }) => {
      try {
        extractEncodedStateValue(new Uint8Array(0), version, ocrt3.ContractState);
        expect.unreachable('empty input must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(DownConvertFailedError);
        expect((error as DownConvertFailedError).cause).toBeDefined();
      }
    }
  );

  // A caller that omits the pre-fork runtime has a runtime-acquisition fault,
  // not a bad envelope. Reporting it as DOWN_CONVERT_FAILED at the extraction
  // stage sends them to inspect bytes that are perfectly fine, so it gets its
  // own code. Reachable only from untyped JS, like the version guard.
  it.each([{ probe: undefined }, { probe: null }, { probe: {} }, { probe: { deserialize: 'nope' } }])(
    'rejects a runtime that cannot deserialize ($probe) without blaming the input bytes',
    ({ probe }) => {
      try {
        // @ts-expect-error - reaching the runtime guard that exists for untyped JS callers
        extractEncodedStateValue(ledger8Envelope(cellSv(0x07)), 'v8', probe);
        expect.unreachable('an unusable ledger-8 runtime must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(Ledger8RuntimeInvalidError);
        expect((error as Ledger8RuntimeInvalidError).code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_INVALID);
      }
    }
  );

  // Validated before the version is dispatched, so a v9 caller who omits the
  // runtime gets the same accurate diagnosis rather than reaching the decoder
  // and succeeding by luck.
  it('rejects an unusable runtime on the v9 path too, before decoding', () => {
    expect(() =>
      // @ts-expect-error - reaching the runtime guard that exists for untyped JS callers
      extractEncodedStateValue(ledger9Envelope(0x07), 'v9', undefined)
    ).toThrowError(expect.objectContaining({ code: PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_INVALID }));
  });

  // The v8 decoder is a different implementation from the v9 one, so the
  // failure modes the docstring promises have to be pinned on both. A lenient
  // decoder that ignored trailing garbage would accept a corrupted envelope.
  it.each([
    { name: 'a truncated envelope', mangle: (raw: Uint8Array): Uint8Array => raw.slice(0, 20) },
    { name: 'an envelope with trailing bytes', mangle: (raw: Uint8Array): Uint8Array => Uint8Array.from([...raw, 0, 0, 0, 0]) }
  ])('rejects $name read as v8', ({ mangle }) => {
    expect(() => extractEncodedStateValue(mangle(ledger8Envelope(cellSv(0x07))), 'v8', ocrt3.ContractState)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });

  // An object-literal decoder table resolves an unexpected key through
  // Object.prototype: 'constructor' calls Object and hands the raw bytes back
  // as an EncodedStateValue, 'toString' returns '[object Undefined]' (read into
  // a local and called bare, so its `this` is undefined, not the table).
  // Both are silent wrong answers from a function documented to fail closed,
  // and both are reachable in practice: extractEncodedStateValue sits behind
  // the public Ledger8Engine.extractState, so an untyped consumer can reach it
  // with any string. They must throw a coded error instead, and the
  // unvalidated string must never reach the error's `stage`.
  //
  // 'v7' is in the list for the other half of the problem: a plausible era
  // string that is simply not supported has to fail the same way as a
  // prototype member, not fall through to a decoder.
  it.each(['v7', 'constructor', 'toString', 'valueOf', 'isPrototypeOf', '__proto__', 'bogus'])(
    'rejects the non-ledger version %s instead of resolving it through the prototype chain',
    (version) => {
      expect(() =>
        // @ts-expect-error - reaching the runtime guard that exists for untyped JS callers
        extractEncodedStateValue(ledger9Envelope(0x07), version, ocrt3.ContractState)
      ).toThrowError(expect.objectContaining({ code: PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION }));
    }
  );

  it('does not carry an unvalidated version string into the error message', () => {
    try {
      // @ts-expect-error - reaching the runtime guard that exists for untyped JS callers
      extractEncodedStateValue(ledger9Envelope(0x07), 'toString', ocrt3.ContractState);
      expect.unreachable('an unknown ledger version must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownLedgerVersionError);
      expect((error as UnknownLedgerVersionError).message).not.toContain('toString');
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

  // The wasm-bindgen shim for root() rethrows a Rust Err rather than always
  // resolving to a value or undefined. That throw has to keep the
  // MERKLE_NOT_REHASHED code: a consumer switching on the code to choose a
  // remediation would otherwise be told to check its envelope bytes when the
  // real fix is to rehash the tree.
  it('reports a throwing root() accessor as MERKLE_NOT_REHASHED, preserving the cause', () => {
    const cause = new Error('tree not rehashed');
    const throwingTree = {
      root: () => {
        throw cause;
      }
    };

    try {
      // @ts-expect-error - simulating the fallible vendor binding, which the .d.ts does not model
      checkRoot(throwingTree);
      expect.unreachable('a throwing root() must be reported');
    } catch (error) {
      expect(error).toBeInstanceOf(MerkleNotRehashedError);
      expect((error as MerkleNotRehashedError).cause).toBe(cause);
    }
  });

  it('treats a null root as not-rehashed, not as a readable root', () => {
    expect(() =>
      // @ts-expect-error - serde can emit null rather than undefined for a Rust None
      checkRoot({ root: () => null })
    ).toThrow(MerkleNotRehashedError);
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

  // A switch with no default arm returns void on an unrecognised variant,
  // having checked nothing and recursed into nothing — so every Merkle tree
  // nested inside a container variant the pinned typings do not know about
  // would be skipped silently. The compile-time exhaustiveness guard cannot
  // see this: the runtime StateValue comes from a caller-injected runtime,
  // whose WASM can emit a tag the shipped .d.ts does not declare.
  it('rejects a StateValue variant it does not recognise instead of skipping it', () => {
    expect(() =>
      // @ts-expect-error - a runtime-only variant, which the pinned typings exclude by construction
      assertMerkleTreesRehashed({ type: () => 'sparseContainer' })
    ).toThrowError(expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED }));
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

// The envelope seam validates its injected runtime so that a runtime fault is
// not reported as a data fault. This seam dereferences a runtime too, and
// without the same check a missing binding surfaces as a TypeError that the
// catch below relabels DOWN_CONVERT_FAILED — an error whose message sends the
// caller to audit input bytes that are fine.
describe('downConvertForExecution runtime guard', () => {
  it.each([
    { name: 'no runtime at all', runtime: undefined, missingMember: 'StateValue.decode' },
    { name: 'a null runtime', runtime: null, missingMember: 'StateValue.decode' },
    { name: 'a runtime with no StateValue', runtime: {}, missingMember: 'StateValue.decode' },
    { name: 'a StateValue that cannot decode', runtime: { StateValue: { decode: 'nope' } }, missingMember: 'StateValue.decode' },
    {
      name: 'a runtime with no ChargedState',
      runtime: { StateValue: ocrt3.StateValue },
      missingMember: 'ChargedState'
    }
  ])('rejects $name without blaming the input bytes', ({ runtime, missingMember }) => {
    try {
      // @ts-expect-error - reaching the runtime guard that exists for untyped JS callers
      downConvertForExecution(ocrt3.StateValue.newNull().encode(), runtime);
      expect.unreachable('an unusable ledger-8 runtime must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(Ledger8RuntimeInvalidError);
      expect(error).toMatchObject({ code: PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_INVALID, missingMember });
    }
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

  // DOWN_CONVERT_FAILED is shared by three stages, so `stage` is the only
  // thing that tells a consumer "your envelope bytes are bad" apart from "the
  // bridge lost data mid-conversion". Every failure raised inside
  // downConvertForExecution must therefore name the down-convert stage, and
  // must carry the underlying cause: the class message says to read it.
  it.each([
    {
      name: 'a re-encode mismatch',
      run: () => downConvertForExecution(cellSv(0x44).encode(), runtimeDecoding(() => ocrt3.StateValue.newNull()))
    },
    {
      name: 'a decode failure',
      run: () =>
        downConvertForExecution(
          ocrt3.StateValue.newNull().encode(),
          runtimeDecoding(() => {
            throw new Error('simulated decode failure');
          })
        )
    }
  ])('names the state down-convert stage and preserves the cause for $name', ({ run }) => {
    try {
      run();
      expect.unreachable('the safety net must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DownConvertFailedError);
      expect((error as DownConvertFailedError).stage).toBe('state down-convert');
      expect((error as DownConvertFailedError).cause).toBeDefined();
    }
  });

  // The injected failure is the exact object the caller's runtime threw, so
  // this pins pass-through identity rather than mere presence — a wrapper that
  // re-created the cause would lose the runtime's own diagnosis.
  it('passes the runtime error through as the cause, not a copy of it', () => {
    const thrown = new Error('simulated decode failure');

    try {
      downConvertForExecution(
        ocrt3.StateValue.newNull().encode(),
        runtimeDecoding(() => {
          throw thrown;
        })
      );
      expect.unreachable('a throwing decode must fail the down-convert');
    } catch (error) {
      expect((error as DownConvertFailedError).cause).toBe(thrown);
    }
  });

  // ChargedState construction is where a genuine dual-instantiation surfaces:
  // wasm-bindgen rejects a StateValue built by the other physical copy. It has
  // to leave this function as a coded error like every other failure, or
  // code-based discrimination breaks exactly where it matters most.
  it('wraps a ChargedState construction failure in DownConvertFailedError', () => {
    const rejection = new Error('simulated ChargedState rejection');
    class ThrowingChargedState extends ocrt3.ChargedState {
      constructor(state: ocrt3.StateValue) {
        super(state);
        throw rejection;
      }
    }
    const runtime: Ledger8CompactRuntime = {
      ContractState: ocrt3.ContractState,
      StateValue: ocrt3.StateValue,
      ChargedState: ThrowingChargedState
    };

    try {
      downConvertForExecution(cellSv(0x44).encode(), runtime);
      expect.unreachable('a rejecting ChargedState must fail the down-convert');
    } catch (error) {
      expect(error).toBeInstanceOf(DownConvertFailedError);
      expect((error as DownConvertFailedError).code).toBe(PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED);
      expect((error as DownConvertFailedError).stage).toBe('state down-convert');
      expect((error as DownConvertFailedError).cause).toBe(rejection);
    }
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
    { name: 'objects with different keys', a: { x: 1 }, b: { y: 1 }, equal: false },
    // Key *counts* matching is not key *sets* matching. Looking each of a's
    // keys up in b without checking the key exists reads `undefined` on both
    // sides and short-circuits to equal, so these two disagree on every key
    // and still compare equal. Unreachable in today's EncodedStateValue
    // algebra, which has no undefined-valued fields — and the reason this is
    // pinned rather than left to that assumption holding forever.
    { name: 'objects whose keys differ, with an undefined value', a: { x: undefined }, b: { y: 1 }, equal: false },
    { name: 'objects whose keys differ, both undefined-valued', a: { x: undefined }, b: { y: undefined }, equal: false },
    // Map order-sensitivity is deliberate, not incidental: it is what makes
    // the re-encode comparison exact. A get()-based rewrite would pass every
    // string-keyed row above and silently drop that property.
    { name: 'maps with the same entries in a different order', a: new Map([['a', 1], ['b', 2]]), b: new Map([['b', 2], ['a', 1]]), equal: false }
  ])('is $equal for $name', ({ a, b, equal }) => {
    expect(structurallyEqual(a, b)).toBe(equal);
  });
});

// The production comparison is cross-codec: the source EncodedStateValue is
// produced by ledger-v9 and the re-encoding by onchain-runtime-v3. Every other
// container test in this file builds both sides with ocrt3, so it cannot fail
// for ordering reasons. These build the v9 side natively and run the real
// bridge over the two container variants — the shapes where a divergence in map
// iteration order between the two eras would surface.
//
// Not covered here: a v9-built boundedMerkleTree. Its leaf map is the third
// ordered structure in the algebra, and the only golden that carries one has a
// single leaf, which compares equal under any ordering. That gap is real and
// outstanding.
describe('cross-codec down-convert over containers', () => {
  const v9Field = (byte: number): LedgerV9AlignedValue => ({
    value: [new Uint8Array(32).fill(byte)],
    alignment: FIELD_ALIGNMENT
  });

  const v9Envelope = (state: LedgerV9StateValue): Uint8Array => {
    const contractState = new LedgerV9ContractState();
    contractState.data = new LedgerV9ChargedState(state);
    return contractState.serialize();
  };

  const v9MapOf = (...keys: readonly number[]): LedgerV9StateValue =>
    LedgerV9StateValue.newMap(
      keys.reduce(
        (acc, key) => acc.insert(v9Field(key), LedgerV9StateValue.newCell(v9Field(key))),
        new LedgerV9StateMap()
      )
    );

  const v9ArrayOf = (...bytes: readonly number[]): LedgerV9StateValue =>
    bytes.reduce(
      (acc, byte) => acc.arrayPush(LedgerV9StateValue.newCell(v9Field(byte))),
      LedgerV9StateValue.newArray()
    );

  it('down-converts a multi-entry map inserted out of key order', () => {
    const extracted = extractEncodedStateValue(v9Envelope(v9MapOf(0x33, 0x11, 0x77)), 'v9', ocrt3.ContractState);
    const downConverted = downConvertForExecution(extracted, ocrt3);

    expect(downConverted.data.state.encode()).toEqual(
      extractEncodedStateValue(
        ledger8Envelope(mapOf([0x33, cellSv(0x33)], [0x11, cellSv(0x11)], [0x77, cellSv(0x77)])),
        'v8',
        ocrt3.ContractState
      )
    );
  });

  it('down-converts a nested array without losing an element', () => {
    const extracted = extractEncodedStateValue(v9Envelope(v9ArrayOf(0x01, 0x02, 0x03)), 'v9', ocrt3.ContractState);
    const downConverted = downConvertForExecution(extracted, ocrt3);

    expect(downConverted.data.state.encode()).toEqual(
      extractEncodedStateValue(
        ledger8Envelope(arrayOf(cellSv(0x01), cellSv(0x02), cellSv(0x03))),
        'v8',
        ocrt3.ContractState
      )
    );
  });
});

// Compile-time drift detector. If a vendor bump ever changes the wire shape of
// EncodedStateValue, Op, or AlignedValue between the pre-fork
// (onchain-runtime-v3) and post-fork (ledger-v9) packages this engine bridges,
// this block stops compiling. It is deliberately not paired with a runtime
// assertion, since any such assertion would be a tautology after erasure.
//
// Where it is checked, precisely: `yarn typecheck:tests`, run by the pre-push
// hook. Test files are outside tsconfig.build.json and vitest transpiles
// without type-checking, so CI does not evaluate this block — a `--no-verify`
// push carrying a vendor bump that diverged the two eras' wire shapes would go
// green. Treat a failure here as the signal it is, and do not assume CI will
// repeat it.
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

// Era rejection, and why it needs pinning here rather than trusting the
// interface to keep working. `Ledger8CompactRuntime` must accept only the
// pre-fork runtime, but `StateValue.decode` and `new ChargedState(...)` are
// structurally identical across the fork (the assertions above are exactly
// that fact), so neither member discriminates. `ContractState` is what does:
// its `query()` returns a `GatherResult` whose `log` variant gained fields
// post-fork. That divergence is incidental to this engine — a vendor bump
// that aligned the two shapes would silently make every post-fork runtime
// assignable again, reopening a hole where the whole bridge decodes with the
// wrong era's codec while every runtime check still passes. These two lines
// turn that back into a build failure.
//
// Checked in the same place as the block above: `yarn typecheck:tests` via the
// pre-push hook, not CI.
type NotAssignable<T, U> = T extends U ? false : true;

type _PostForkOnchainRuntimeIsRejected = Expect<NotAssignable<typeof ocrt4, Ledger8CompactRuntime>>;
type _PostForkLedgerIsRejected = Expect<
  NotAssignable<{ ContractState: typeof LedgerV9ContractState; StateValue: typeof LedgerV9StateValue }, Ledger8CompactRuntime>
>;
