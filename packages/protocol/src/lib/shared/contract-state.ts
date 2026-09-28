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
import type { EncodedStateValue, TokenType } from '@midnightntwrk/ledger-v9';

import { StateDecodeFailedError } from '../../errors';
import type { LedgerVersion } from './ledger-version';
import { entryPointName } from './verifier-keys';

/** The one property {@link decodeContractStateWith} reads off a registered operation. */
export interface DecodableContractOperation {
  readonly verifierKey?: Uint8Array;
}

/**
 * The public balances a contract holds, keyed by token type.
 *
 * Derived from the vendor's own `TokenType` rather than restated, so a rename
 * fails this build instead of leaving a mirror describing a shape neither
 * runtime has.
 *
 * `shared-contract-state.test.ts` pins all three `TokenType` declarations —
 * both eras' and the execution runtime's, which is where the map actually
 * lands — mutually assignable. That pin is STRUCTURAL and can be no more:
 * `raw` is an opaque `string` everywhere, so assignability says the handoff
 * type-checks and says nothing about two eras reading a given key as the same
 * colour.
 *
 * Plain data end to end — string-tagged objects and `bigint`s — so it crosses
 * an era boundary like every other member of {@link ContractStatePojo}. That is
 * a statement about `structuredClone`, which carries a `Map`; a JSON round trip
 * does NOT, and leaves the plain object the balance guards refuse.
 */
export type ContractBalance = ReadonlyMap<TokenType, bigint>;

/**
 * Names what a rejected value WAS, without rendering any of it.
 *
 * `typeof` alone reports `'object'` for `null`, which reads as a map that was
 * there, and that is the one distinction a caller chasing an absent balance
 * needs.
 *
 * @param value The rejected value.
 * @returns `'null'`, or the value's `typeof`.
 */
export const describeValue = (value: unknown): string => (value === null ? 'null' : typeof value);

/**
 * Whether a candidate answers the `ReadonlyMap` lookup surface.
 *
 * Iterability is NOT checked here: `everyEntryIsAColouredAmount` iterates, so a
 * non-iterable candidate is refused there. A clause for it as well would be one
 * no test could distinguish -- verified by deleting it.
 */
const answersTheMapSurface = (candidate: Partial<ContractBalance>): boolean =>
  typeof candidate.get === 'function' && typeof candidate.has === 'function' && typeof candidate.size === 'number';

/**
 * Whether every entry is a colour keyed against an amount the ledger can do
 * arithmetic with.
 *
 * Refuses a candidate that cannot be iterated at all: `for...of` throws on one,
 * and {@link isContractBalance} turns that into the refusal.
 */
const everyEntryIsAColouredAmount = (candidate: Iterable<unknown>): boolean => {
  for (const entry of candidate) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return false;
    }
    const [colour, amount]: readonly unknown[] = entry;
    if (typeof amount !== 'bigint' || typeof colour !== 'object' || colour === null) {
      return false;
    }
    if (typeof (colour as { readonly tag?: unknown }).tag !== 'string') {
      return false;
    }
  }
  return true;
};

/**
 * Whether a value can serve as a {@link ContractBalance}.
 *
 * Structural rather than `instanceof Map`, so a map from another realm — a
 * worker, a VM context — is accepted. Every other iterable is refused: `new
 * Map(...)` turns an empty array, an empty `Set` and an empty string alike into
 * an empty map, which is the substitution the balance guards exist to prevent.
 *
 * The entries are checked too, not just the container. A map carrying amounts
 * that are not `bigint`s answers every structural clause and then feeds the
 * circuit arithmetic it cannot do — the same class of silent wrong answer this
 * guard exists to stop — so the `value is ContractBalance` narrowing has to
 * cover them or it overclaims.
 *
 * TOTAL: it answers rather than throws for every input. `Map.prototype`'s
 * members reject a foreign receiver — a proxied map and an object that merely
 * inherits the prototype both make `size` and iteration throw — and neither can
 * serve as a balance, because `new Map(...)` would throw on that same receiver.
 * They belong in the refusal, carrying the caller's diagnosis rather than the
 * vendor's `TypeError`.
 *
 * Not a claim that an empty answer is genuine: a hand-built object declaring an
 * empty iterator is a valid empty balance as far as anything here can tell, and
 * so is a contract holding nothing. That is why the option is required at the
 * seams rather than defaulted.
 *
 * @param value The candidate, from an injected decoder or an untyped caller.
 * @returns Whether it answers the `ReadonlyMap` surface with usable entries.
 * @see {@link FailClosedDecoding}
 */
export const isContractBalance = (value: unknown): value is ContractBalance => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ContractBalance>;
  try {
    return answersTheMapSurface(candidate) && everyEntryIsAColouredAmount(candidate as Iterable<unknown>);
  } catch {
    return false;
  }
};

/**
 * The slice of a ledger `ContractState` {@link decodeContractStateWith} reads.
 * Both eras' class satisfies it structurally, which is what lets one decoder
 * serve both axes without either era's types being named here.
 *
 * @see {@link FailClosedDecoding} for why `maintenanceAuthority` is absent
 * where `balance` is not.
 */
export interface DecodableContractState {
  readonly data: { readonly state: { readonly encode: () => EncodedStateValue } };
  readonly balance: ContractBalance;
  readonly operations: () => (string | Uint8Array)[];
  readonly operation: (entryPoint: string | Uint8Array) => DecodableContractOperation | undefined;
}

/**
 * The era module slice {@link decodeContractStateWith} needs: just the
 * `ContractState` class and its static reader.
 *
 * @see {@link InjectedVendorSlices} for why this slice is declared
 * structurally rather than derived from one era's class.
 * @see {@link ModuleGraphAndLazyLoading} for why the module is injected rather
 * than imported.
 */
export interface ContractStateDecoder {
  readonly ContractState: { readonly deserialize: (raw: Uint8Array) => DecodableContractState };
}

/**
 * One entry point a contract state declares, with the verifier key registered
 * against it if there is one.
 *
 * `verifierKey` and `verifierKeyHash` are both absent for a blank slot — the
 * shape a constructor-built state has before a deploy fills it in.
 *
 * @see {@link FailClosedDecoding} for why they are absent rather than
 * zero-length or a hash of nothing.
 */
export interface ContractEntryPointPojo {
  readonly circuitId: string;
  readonly verifierKey: Uint8Array | undefined;
  readonly verifierKeyHash: string | undefined;
}

/**
 * A contract state as plain data: the primary state in its encoded form, the
 * balances the contract holds, and the entry points the state declares.
 *
 * `entryPoints` is an ARRAY, not a map keyed by circuit id: two distinct byte
 * entry points can decode to the same name, and a caller has to reconcile
 * them.
 *
 * @see {@link FailClosedDecoding}
 */
export interface ContractStatePojo {
  readonly state: EncodedStateValue;
  /**
   * The balances the contract holds, which are NOT part of the primary state:
   * the ledger keeps them beside it, so a caller reading only `state` cannot
   * reach them. A retained-era call that executes without them runs every
   * circuit against an empty balance — see {@link RetainedEraExecution}.
   */
  readonly balance: ContractBalance;
  readonly entryPoints: readonly ContractEntryPointPojo[];
}

/**
 * Reads the primary state out of a raw envelope with the given era's extractor,
 * reporting every failure as {@link StateDecodeFailedError} naming `version`.
 *
 * @param raw The serialized contract-state envelope.
 * @param version The era whose extractor is used, and which every failure
 * raised here names.
 * @param extract The era's own envelope extractor.
 * @returns The primary state read out of the envelope.
 * @throws StateDecodeFailedError for every failure, carrying the extractor's
 * own diagnosis on `cause`.
 * @see {@link FailClosedDecoding}
 */
export const extractStateWith = (
  raw: Uint8Array,
  version: LedgerVersion,
  extract: (raw: Uint8Array) => EncodedStateValue
): EncodedStateValue => {
  try {
    return extract(raw);
  } catch (cause) {
    throw new StateDecodeFailedError(version, cause);
  }
};

/**
 * Reads a raw, serialized contract-state envelope into a
 * {@link ContractStatePojo} using the given era's own `ContractState`.
 *
 * Nothing that crosses back is a live WASM handle: the primary state leaves as
 * an `EncodedStateValue` (plain objects, arrays, `Map`s, `Uint8Array`s and
 * primitives) and each entry point as a plain record.
 *
 * @param raw The serialized contract-state envelope.
 * @param version The era whose decoder is used, and which every failure raised
 * here names.
 * @param ledger The era module slice carrying its own `ContractState`.
 * @returns The state and the entry points it declares, as plain data.
 * @throws StateDecodeFailedError for every failure — the whole read is
 * covered, not just the deserialization — with the decoder's own diagnosis on
 * `cause`.
 * @see {@link FailClosedDecoding}
 * @see {@link EraSeam}
 */
export const decodeContractStateWith = (
  raw: Uint8Array,
  version: LedgerVersion,
  ledger: ContractStateDecoder
): ContractStatePojo => {
  try {
    const decoded = ledger.ContractState.deserialize(raw);
    const entryPoints = decoded.operations().map((entryPoint): ContractEntryPointPojo => {
      // Deliberately not optional-chained: an unresolvable entry point is an
      // inconsistent state, not a blank slot -- see FailClosedDecoding.
      const operation = decoded.operation(entryPoint);
      if (operation === undefined) {
        throw new Error(
          `contract state declares entry point '${entryPointName(entryPoint)}' but resolves no operation for it.`
        );
      }
      const { verifierKey } = operation;
      return {
        circuitId: entryPointName(entryPoint),
        verifierKey,
        verifierKeyHash: verifierKey === undefined ? undefined : hashVerifierKey(verifierKey)
      };
    });

    // Read ONCE. An injected decoder may answer with a different object on each
    // access, which would have the guard validate one map and the copy take
    // another.
    const balance: unknown = decoded.balance;
    // Not defaulted: `new Map(undefined)` is an empty map, indistinguishable
    // from a contract that holds nothing. @see FailClosedDecoding
    if (!isContractBalance(balance)) {
      throw new Error(
        `contract state resolves no usable balance (received ${describeValue(balance)}); a contract that holds ` +
          'nothing still declares an empty map.'
      );
    }

    // Copied, so the pojo owns a map nothing else holds.
    return { state: decoded.data.state.encode(), balance: new Map(balance), entryPoints };
  } catch (cause) {
    throw new StateDecodeFailedError(version, cause);
  }
};
