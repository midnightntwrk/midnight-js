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
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { PROTOCOL_ERROR_CODES, StateDecodeFailedError } from '../errors';
import { extractV9EncodedStateValue } from '../lib/era/envelope';
import { type ContractStateDecoder, decodeContractStateWith } from '../lib/shared/contract-state';
import { entryPointName } from '../lib/shared/verifier-keys';
import { expectStructuredCloneable } from './clone-assertions';
import { readHexFixture } from './fixtures';


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
  it('carries it as plain data, with no live handle', () => {
    expectStructuredCloneable(decodeContractStateWith(serializedStateHolding(7n), 'v9', ledgerV9));
  });
});
