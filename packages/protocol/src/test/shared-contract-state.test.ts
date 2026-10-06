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


import { hashVerifierKey } from '@midnight-ntwrk/compact-js';
import type * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as ledgerV8 from '@midnightntwrk/ledger-v8';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { PROTOCOL_ERROR_CODES, StateDecodeFailedError } from '../errors';
import { extractV9EncodedStateValue } from '../lib/era/envelope';
import {
  type ContractBalance,
  type ContractStateDecoder,
  type DecodableContractState,
  decodeContractStateWith
} from '../lib/shared/contract-state';
import { entryPointName } from '../lib/shared/verifier-keys';
import { expectStructuredCloneable } from './clone-assertions';
import { readHexFixture } from './fixtures';
import type { Assert, MutuallyAssignable } from './type-assertions';


// Same full-decode check the golden-fixture suite uses: `Buffer.from(_, 'hex')`
// stops silently at the first non-hex character, so a truncated golden would
// otherwise make a negative test pass for the wrong reason.

const serializedStateWithBlankOperation = (): Uint8Array => {
  const contractState = new ledgerV9.ContractState();
  contractState.setOperation('increment', new ledgerV9.ContractOperation());
  return contractState.serialize();
};

describe('decodeContractStateWith', () => {
  it('reads a real migrated state to its declared entry points, each carrying its deployed key', () => {
    const raw = readHexFixture('state-migrated-v9.hex');

    const pojo = decodeContractStateWith(raw, 'v9', ledgerV9);

    const declared = ledgerV9.ContractState.deserialize(raw);
    expect(pojo.entryPoints.map((entry) => entry.circuitId).sort()).toEqual(
      declared.operations().map(entryPointName).sort()
    );
    expect(pojo.entryPoints.length).toBeGreaterThan(0);
    for (const entry of pojo.entryPoints) {
      const key = entry.verifierKey;
      if (key === undefined) {
        throw new Error(`test fixture invariant violated: '${entry.circuitId}' carries no verifier key`);
      }
      expect(key.length).toBeGreaterThan(0);
      expect(entry.verifierKeyHash).toBe(hashVerifierKey(key));
    }
  });

  // The state a caller needs for execution is the same value the envelope
  // reader produces. Deriving it twice would let the two drift apart.
  it('carries exactly the encoded state the envelope reader produces', () => {
    const raw = readHexFixture('state-migrated-v9.hex');

    expect(decodeContractStateWith(raw, 'v9', ledgerV9).state).toEqual(extractV9EncodedStateValue(raw));
  });

  // A blank slot is not a key of zero bytes: hashing nothing would produce a
  // real-looking hash for a key that does not exist, and a caller comparing
  // hashes would match a contract that was never deployed.
  it('reports a blank operation slot as carrying no key, rather than hashing nothing', () => {
    const pojo = decodeContractStateWith(serializedStateWithBlankOperation(), 'v9', ledgerV9);

    expect(pojo.entryPoints).toHaveLength(1);
    expect(pojo.entryPoints[0].circuitId).toBe('increment');
    expect(pojo.entryPoints[0].verifierKey).toBeUndefined();
    expect(pojo.entryPoints[0].verifierKeyHash).toBeUndefined();
  });

  // 0xff and 0xfe are each an invalid UTF-8 sequence, so both decode to the
  // SAME replacement character. Keying the result by name would silently drop
  // one of two genuinely distinct declared entry points; an array keeps both
  // visible to a caller that has to reconcile them.
  it('keeps both of two byte-declared entry points that resolve to the same name', () => {
    const AMBIGUOUS_A = new Uint8Array([0xff]);
    const AMBIGUOUS_B = new Uint8Array([0xfe]);
    class ByteEntryPointContractState extends ledgerV9.ContractState {
      static override deserialize(): ByteEntryPointContractState {
        return new ByteEntryPointContractState();
      }

      override operations(): (string | Uint8Array)[] {
        return [AMBIGUOUS_A, AMBIGUOUS_B];
      }

      // Declared AND resolvable, because a real state is both: the decoder
      // refuses a state that declares an entry point it cannot resolve.
      override operation(): ledgerV9.ContractOperation {
        return new ledgerV9.ContractOperation();
      }
    }
    const decoder: ContractStateDecoder = { ContractState: ByteEntryPointContractState };

    const pojo = decodeContractStateWith(new Uint8Array(), 'v9', decoder);

    expect(entryPointName(AMBIGUOUS_A)).toBe(entryPointName(AMBIGUOUS_B));
    expect(Buffer.from(AMBIGUOUS_A).equals(Buffer.from(AMBIGUOUS_B))).toBe(false);
    expect(pojo.entryPoints).toHaveLength(2);
    expect(pojo.entryPoints.map((entry) => entry.circuitId)).toEqual([
      entryPointName(AMBIGUOUS_A),
      entryPointName(AMBIGUOUS_B)
    ]);
  });

  // `verifierKey: undefined` means "declared but never deployed". A state that
  // declares an entry point and then cannot resolve an operation for it is a
  // different thing: broken. Reporting it as the first would have a caller
  // comparing key hashes conclude a deployed contract does not match its
  // artifacts.
  it('refuses a state that declares an entry point it cannot resolve, rather than reading it as unkeyed', () => {
    class UnresolvableContractState extends ledgerV9.ContractState {
      static override deserialize(): UnresolvableContractState {
        return new UnresolvableContractState();
      }

      override operations(): (string | Uint8Array)[] {
        return ['increment'];
      }

      override operation(): undefined {
        return undefined;
      }
    }

    let caught: unknown;
    try {
      decodeContractStateWith(new Uint8Array(), 'v9', { ContractState: UnresolvableContractState });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(StateDecodeFailedError);
    expect(caught).toMatchObject({ code: PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED, version: 'v9' });
    expect((caught as StateDecodeFailedError).cause).toBeInstanceOf(Error);
  });

  // The facade's boundary rule, mechanised by two assertions that check
  // DIFFERENT things. Both are wanted; neither subsumes the other.
  //
  // The prototype checks -- on the result and on every entry point -- pin that
  // the decoder hands back object literals rather than class instances, so the
  // value carries no methods and no identity a caller could come to depend on.
  // They reach exactly two levels (the result, and each `entryPoints` member)
  // and say nothing about anything nested deeper.
  //
  // `expectStructuredCloneable` is the handle check, and it is the one that
  // goes all the way down. A live WASM handle does NOT make `structuredClone`
  // throw, and comparing content cannot tell it apart from its own clone either
  // -- both degrade to `{ __wbg_ptr: <number> }` with every real field gone
  // (see `clone-assertions.ts`). It rejects a handle by walking the value's own
  // structure for that pointer property at any depth.
  it('returns plain data a structured clone can carry across a boundary', () => {
    const pojo = decodeContractStateWith(readHexFixture('state-migrated-v9.hex'), 'v9', ledgerV9);

    expect(Object.getPrototypeOf(pojo)).toBe(Object.prototype);
    expectStructuredCloneable(pojo);
    // Without this the loop below can run zero times and assert nothing: an empty `entryPoints`
    // clones fine, so the per-entry half would be silently vacuous while the test stayed green.
    expect(pojo.entryPoints.length).toBeGreaterThan(0);
    for (const entry of pojo.entryPoints) {
      expect(Object.getPrototypeOf(entry)).toBe(Object.prototype);
    }
  });

  it('refuses a state written by the other era, naming the era whose decoder rejected it', () => {
    let caught: unknown;
    try {
      decodeContractStateWith(readHexFixture('state-v8.hex'), 'v9', ledgerV9);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(StateDecodeFailedError);
    const failure = caught as StateDecodeFailedError;
    expect(failure.code).toBe(PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED);
    expect(failure.version).toBe('v9');
    expect(failure.cause).toBeInstanceOf(Error);
    expect(failure.message).not.toMatch(/[0-9a-f]{16,}/i);
  });
});

// The balance is the contract's own, and it lives on `ContractState.balance`
// rather than inside the primary state — so a reader that returns only `state`
// leaves a caller no way to reach it. A retained-era call that executes without
// it reads every balance back as zero.
describe('decodeContractStateWith carries the contract balance', () => {
  const COLOUR = { tag: 'unshielded', raw: 'ab'.repeat(32) } as const;

  const serializedStateHolding = (amount: bigint): Uint8Array => {
    const contractState = new ledgerV9.ContractState();
    contractState.balance = new Map([[COLOUR, amount]]);
    return contractState.serialize();
  };

  it('reads back the balance the state declares', () => {
    const pojo = decodeContractStateWith(serializedStateHolding(1_000n), 'v9', ledgerV9);

    expect([...pojo.balance]).toEqual([[COLOUR, 1_000n]]);
  });

  it('reads an empty balance as empty rather than as absent', () => {
    const pojo = decodeContractStateWith(serializedStateWithBlankOperation(), 'v9', ledgerV9);

    expect([...pojo.balance]).toEqual([]);
  });

  // The pojo is what crosses the era boundary, so the balance has to be plain
  // data like every other member — a live handle here would not survive the
  // trip and would pin the value to the runtime instance that decoded it.
  //
  // Asserted on `pojo.balance`, NOT on the whole pojo: `expectStructuredCloneable`
  // walks whatever it is given, so a pojo that carried no balance at all would
  // satisfy it. The content assertion beside it is what keeps the member in
  // scope of the check.
  it('carries it as plain data, with no live handle', () => {
    const pojo = decodeContractStateWith(serializedStateHolding(7n), 'v9', ledgerV9);

    expectStructuredCloneable(pojo.balance);
    expect([...pojo.balance]).toEqual([[COLOUR, 7n]]);
  });

  // `new Map(...)` preserves every entry, but so would an implementation that
  // read only the first: a single-entry map cannot tell the two apart, and
  // neither can one colour tell a tag-blind implementation from a correct one.
  it('reads back every entry, across token-type variants', () => {
    const shielded = { tag: 'shielded', raw: 'ef'.repeat(32) } as const;
    const dust = { tag: 'dust' } as const;
    const contractState = new ledgerV9.ContractState();
    contractState.balance = new Map<ledgerV9.TokenType, bigint>([
      [COLOUR, 1n],
      [shielded, 2n],
      [dust, 3n]
    ]);

    const pojo = decodeContractStateWith(contractState.serialize(), 'v9', ledgerV9);

    // Sorted by tag on both sides: the decoder's iteration order is the runtime's
    // canonical one, and this test is about entries surviving, not about order.
    expect([...pojo.balance].sort(([a], [b]) => a.tag.localeCompare(b.tag))).toEqual([
      [dust, 3n],
      [shielded, 2n],
      [COLOUR, 1n]
    ]);
  });
});

// The RETAINED arm is the only place this code path runs in production, and
// every test above it reads a v9 state. `DecodableContractState.balance` is
// structural, so a retained state whose `.balance` resolved to `undefined`
// would decode to an empty map and reproduce #1345 with the v9 tests all green.
describe('decodeContractStateWith carries the balance off a RETAINED-era state', () => {
  const COLOUR = { tag: 'unshielded', raw: 'cd'.repeat(32) } as const;

  it('reads back the balance a ledger-v8 state declares', () => {
    const contractState = new ledgerV8.ContractState();
    contractState.balance = new Map([[COLOUR, 4_200n]]);

    const pojo = decodeContractStateWith(contractState.serialize(), 'v8', ledgerV8);

    expect([...pojo.balance]).toEqual([[COLOUR, 4_200n]]);
  });
});

// `DecodableContractState.balance` is structural and both vendors declare it
// non-optional, so only an INJECTED decoder can answer without one. That is
// exactly the seam worth failing loudly at: `new Map(undefined)` is an empty
// map, indistinguishable from a contract that holds nothing, which is the
// substitution #1345 was made of.
describe('decodeContractStateWith refuses a state that resolves no balance', () => {
  const REFUSED_COLOUR = { tag: 'unshielded', raw: 'ab'.repeat(32) } as const;

  // A plain-object decoder rather than a `ContractState` subclass: the vendor
  // declares `balance` as a non-optional data property, so an override cannot
  // express the shape under test. `ContractStateDecoder` is declared
  // structurally for exactly this reason.
  const decoderAnswering = (balance: unknown): ContractStateDecoder => ({
    ContractState: {
      deserialize: (): DecodableContractState => ({
        data: new ledgerV9.ContractState().data,
        balance: balance as ContractBalance,
        operations: () => [],
        operation: () => undefined
      })
    }
  });

  const decodeFailure = (balance: unknown): unknown => {
    let caught: unknown;
    try {
      decodeContractStateWith(new Uint8Array(), 'v9', decoderAnswering(balance));
    } catch (error) {
      caught = error;
    }
    return caught;
  };

  it('refuses an absent balance rather than reading it as an empty one', () => {
    const caught = decodeFailure(undefined);

    expect(caught).toBeInstanceOf(StateDecodeFailedError);
    expect(caught).toMatchObject({ code: PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED, version: 'v9' });
    expect((caught as StateDecodeFailedError).cause).toBeInstanceOf(Error);
    expect(((caught as StateDecodeFailedError).cause as Error).message).toMatch(/resolves no usable balance/);
  });

  // A separate case, not a restatement: `new Map(null)` is an empty map too, so
  // a guard that caught only `undefined` would let this one through silently.
  it('refuses a null balance for the same reason', () => {
    const caught = decodeFailure(null);

    expect(caught).toBeInstanceOf(StateDecodeFailedError);
    expect(((caught as StateDecodeFailedError).cause as Error).message).toMatch(/resolves no usable balance/);
  });

  // Nullish is not the whole substitution. `new Map(...)` turns each of these
  // into an empty map just as quietly, and a plain object is what a JSON round
  // trip leaves behind.
  const emptyButNotAMap: readonly [label: string, balance: unknown][] = [
    ['an empty array', []],
    ['an empty Set', new Set()],
    ['an empty string', ''],
    ['a plain object, the shape a JSON round trip leaves behind', {}]
  ];

  it.each(emptyButNotAMap)('refuses %s rather than reading it as an empty balance', (_label, balance) => {
    const caught = decodeFailure(balance);

    expect(caught).toBeInstanceOf(StateDecodeFailedError);
    expect(((caught as StateDecodeFailedError).cause as Error).message).toMatch(/resolves no usable balance/);
  });

  // Every case above dies on the FIRST structural clause, so the remaining
  // three were carried by nothing: deleting them left the suite green. One
  // case per clause, each answering the clauses before it.
  // An iterator that yields nothing. A genuine empty balance iterates exactly
  // like this, so these cases are about the SURFACE clauses, not about
  // emptiness -- nothing here can tell an empty map from an empty fake.
  const yieldsNothing = (): Iterator<never> => [][Symbol.iterator]();

  const partialMapSurface: readonly [label: string, balance: unknown][] = [
    ['an object with no `get`', { has: () => false, size: 0, [Symbol.iterator]: yieldsNothing }],
    ['an object with `get` but no `has`', { get: () => undefined, size: 0, [Symbol.iterator]: yieldsNothing }],
    [
      'an object whose `size` is not a number',
      { get: () => undefined, has: () => false, size: '0', [Symbol.iterator]: yieldsNothing }
    ],
    ['an object that is not iterable', { get: () => undefined, has: () => false, size: 0 }]
  ];

  it.each(partialMapSurface)('refuses %s, which answers only part of the map surface', (_label, balance) => {
    const caught = decodeFailure(balance);

    expect(caught).toBeInstanceOf(StateDecodeFailedError);
    expect(((caught as StateDecodeFailedError).cause as Error).message).toMatch(/resolves no usable balance/);
  });

  // `Map.prototype`'s members throw rather than answer when invoked with a
  // foreign receiver, so a guard that reads them plainly is not a total
  // predicate: it propagates a `TypeError` instead of refusing. Neither shape
  // can serve as a balance -- `new Map(...)` throws on the same receiver -- so
  // both belong in the refusal, and with the diagnostic message, not with the
  // vendor's.
  const throwsOnTheMapSurface: readonly [label: string, balance: unknown][] = [
    ['a proxied map, which `new Map(...)` cannot read either', new Proxy(new Map([[REFUSED_COLOUR, 5n]]), {})],
    ['an object that only inherits `Map.prototype`', Object.create(Map.prototype)]
  ];

  it.each(throwsOnTheMapSurface)('refuses %s rather than propagating its TypeError', (_label, balance) => {
    const caught = decodeFailure(balance);

    expect(caught).toBeInstanceOf(StateDecodeFailedError);
    expect(((caught as StateDecodeFailedError).cause as Error).message).toMatch(/resolves no usable balance/);
    expect(((caught as StateDecodeFailedError).cause as Error).message).not.toMatch(/incompatible receiver/);
  });

  // The container alone is not the balance. A map carrying the wrong entry
  // types satisfies every structural clause and then feeds the circuit
  // arithmetic it cannot do, which is the same class of silent wrong answer
  // #1345 was -- so `value is ContractBalance` has to mean the entries too.
  const mapWithUnusableEntries: readonly [label: string, balance: unknown][] = [
    ['amounts that are not bigints', new Map([[REFUSED_COLOUR, '1000']])],
    ['amounts that are numbers', new Map([[REFUSED_COLOUR, 1000]])],
    ['colours that are not token types', new Map([['unshielded', 1_000n]])],
    ['colours carrying no tag', new Map([[{ raw: 'ab'.repeat(32) }, 1_000n]])],
    // A real `Map` always iterates `[key, value]` pairs; a hand-built object
    // claiming the surface need not, and `new Map(...)` throws on it rather
    // than answering. Refused here instead, with the diagnosis.
    [
      'entries that are values rather than pairs',
      { get: () => undefined, has: () => false, size: 1, [Symbol.iterator]: () => [1_000n][Symbol.iterator]() }
    ],
    [
      'entries that are pairs of the wrong length',
      {
        get: () => undefined,
        has: () => false,
        size: 1,
        [Symbol.iterator]: () => [[REFUSED_COLOUR]][Symbol.iterator]()
      }
    ]
  ];

  it.each(mapWithUnusableEntries)('refuses a map with %s', (_label, balance) => {
    const caught = decodeFailure(balance);

    expect(caught).toBeInstanceOf(StateDecodeFailedError);
    expect(((caught as StateDecodeFailedError).cause as Error).message).toMatch(/resolves no usable balance/);
  });

  // `describeValue` exists for one distinction -- `typeof null` is `'object'`,
  // which reads as a map that was there -- and until now nothing asserted its
  // output: replacing its body with a bare `typeof` passed every test.
  it.each([
    ['null', null, 'null'],
    ['undefined', undefined, 'undefined'],
    ['a plain object', {}, 'object'],
    ['an empty string', '', 'string']
  ] as const)('names what arrived when it refuses %s', (_label, balance, described) => {
    const caught = decodeFailure(balance);

    expect(((caught as StateDecodeFailedError).cause as Error).message).toContain(`received ${described}`);
  });

  // The guard and the copy must read the SAME object. A decoder is injectable,
  // so one that answers with a fresh map on every access can have the guard
  // approve one value and the copy take another -- and this double hands out a
  // held balance first and an empty map afterwards.
  it('copies the very object it validated, not a later answer from the same decoder', () => {
    const heldColour = { tag: 'unshielded', raw: '11'.repeat(32) } as const;
    const held: ContractBalance = new Map([[heldColour, 9n]]);
    let answered = false;
    const shiftingDecoder: ContractStateDecoder = {
      ContractState: {
        deserialize: (): DecodableContractState => ({
          data: new ledgerV9.ContractState().data,
          get balance(): ContractBalance {
            if (answered) {
              return new Map();
            }
            answered = true;
            return held;
          },
          operations: () => [],
          operation: () => undefined
        })
      }
    };

    const pojo = decodeContractStateWith(new Uint8Array(), 'v9', shiftingDecoder);

    expect([...pojo.balance]).toEqual([...held]);
  });

  // The copy is what makes the pojo own its balance. The shifting-decoder test
  // above proves the guard and the copy read the SAME object; it does not prove
  // a copy happened at all, and dropping `new Map(...)` left the whole suite
  // green. Identity is the only thing that separates the two.
  it('copies the map rather than handing back the decoder own answer', () => {
    const held: ContractBalance = new Map([[REFUSED_COLOUR, 3n]]);

    const pojo = decodeContractStateWith(new Uint8Array(), 'v9', decoderAnswering(held));

    expect(pojo.balance).not.toBe(held);
    expect([...pojo.balance]).toEqual([...held]);
  });
});

// The pin `ContractBalance`'s own doc comment names. `ContractBalance` keys by
// ledger-v9's `TokenType`, yet the map it describes is decoded off a ledger-v8
// state and written onto the 0.16 runtime's own `block.balance`. That is THREE
// declarations, so all three are pinned: the onchain-runtime-v3 one is where
// the map actually lands, and until now it was covered only incidentally, by
// `execute.ts` happening to compile.
//
// The pin is STRUCTURAL and cannot be more than that: `raw` is an opaque
// `string` in all three, so assignability says the handoff type-checks and
// says nothing about two eras reading a given key as the same colour. @see
// FailClosedDecoding

// Prefixed `_`: never instantiated, they exist only to make the compiler check.
type _TokenTypeIdenticalAcrossEras = Assert<MutuallyAssignable<ledgerV8.TokenType, ledgerV9.TokenType>>;
type _TokenTypeIdenticalOnTheExecutionRuntime = Assert<MutuallyAssignable<ocrt3.TokenType, ledgerV9.TokenType>>;

// The pins above are worth exactly what `MutuallyAssignable` refuses. `any` is
// assignable in both directions, so a vendor `.d.ts` that resolved `TokenType`
// to `any` -- what a broken or missing type after a bump looks like -- would
// satisfy a bare assignability test and turn both of them into green no-ops.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the negative case under test IS `any`
type _AnyDoesNotSatisfyThePin = Assert<MutuallyAssignable<any, ledgerV9.TokenType> extends false ? true : false>;
