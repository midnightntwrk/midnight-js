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

import { hashVerifierKey } from '@midnightntwrk/compact-js';
import type { EncodedStateValue, TokenType } from '@midnightntwrk/ledger-v9';

import { StateDecodeFailedError, StateInconsistentError } from '../../errors';
import type { LedgerEra } from './ledger-version';
import { entryPointName } from './verifier-keys';

export interface DecodableContractOperation {
  readonly verifierKey?: Uint8Array;
}

/**
 * The public balances a contract holds, keyed by token type.
 *
 * Plain data: it survives `structuredClone`, but not a JSON round trip, which
 * leaves a plain object the balance guards refuse.
 *
 * @see {@link InjectedVendorSlices}
 */
export type ContractBalance = ReadonlyMap<TokenType, bigint>;

// Names what a rejected value was without rendering it; `typeof null` alone would read as a map.
export const describeValue = (value: unknown): string => (value === null ? 'null' : typeof value);

// Iterability is checked by everyEntryIsAColouredAmount, not here.
const answersTheMapSurface = (candidate: Partial<ContractBalance>): boolean =>
  typeof candidate.get === 'function' && typeof candidate.has === 'function' && typeof candidate.size === 'number';

// A non-iterable candidate throws in `for...of`; isContractBalance turns that into the refusal.
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

// Structural, checks the entries, and never throws; see FailClosedDecoding. It cannot tell a
// genuine empty balance from a forged one, which is why the option is required, not defaulted.
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

// Both eras' class satisfies it structurally; `maintenanceAuthority` is absent on purpose (see FailClosedDecoding).
export interface DecodableContractState {
  readonly data: { readonly state: { readonly encode: () => EncodedStateValue } };
  readonly balance: ContractBalance;
  readonly operations: () => (string | Uint8Array)[];
  readonly operation: (entryPoint: string | Uint8Array) => DecodableContractOperation | undefined;
}

// Declared structurally and injected; see InjectedVendorSlices.
export interface ContractStateDecoder {
  readonly ContractState: { readonly deserialize: (raw: Uint8Array) => DecodableContractState };
}

/**
 * One entry point a contract state declares, with the verifier key registered
 * against it if there is one.
 *
 * `verifierKey` and `verifierKeyHash` are both absent for a blank slot, the
 * shape a constructor-built state has before a deploy fills it in.
 *
 * @see {@link FailClosedDecoding}
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
   * The balances the contract holds. They are not part of `state`, and a
   * ledger 8 circuit executed without them reads every balance as zero.
   */
  readonly balance: ContractBalance;
  readonly entryPoints: readonly ContractEntryPointPojo[];
}

// Every failure leaves as StateDecodeFailedError naming `version`, so both read paths fail alike.
export const extractStateWith = (
  raw: Uint8Array,
  version: LedgerEra,
  extract: (raw: Uint8Array) => EncodedStateValue
): EncodedStateValue => {
  try {
    return extract(raw);
  } catch (cause) {
    throw new StateDecodeFailedError(version, cause);
  }
};

// Returns plain data only, never a live WASM handle; see FailClosedDecoding.
export const decodeContractStateWith = (
  raw: Uint8Array,
  version: LedgerEra,
  ledger: ContractStateDecoder
): ContractStatePojo => {
  let decoded: DecodableContractState;
  try {
    decoded = ledger.ContractState.deserialize(raw);
  } catch (cause) {
    throw new StateDecodeFailedError(version, cause);
  }

  try {
    const entryPoints = decoded.operations().map((entryPoint): ContractEntryPointPojo => {
      // Deliberately not optional-chained: an unresolvable entry point is an
      // inconsistent state, not a blank slot -- see FailClosedDecoding.
      const operation = decoded.operation(entryPoint);
      if (operation === undefined) {
        throw new StateInconsistentError(
          version,
          new Error(`contract state declares entry point '${entryPointName(entryPoint)}' but resolves no operation for it.`)
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
      throw new StateInconsistentError(
        version,
        new Error(
          `contract state resolves no usable balance (received ${describeValue(balance)}); a contract that holds ` +
            'nothing still declares an empty map.'
        )
      );
    }

    // Copied, so the pojo owns a map nothing else holds.
    return { state: decoded.data.state.encode(), balance: new Map(balance), entryPoints };
  } catch (cause) {
    throw cause instanceof StateInconsistentError ? cause : new StateInconsistentError(version, cause);
  }
};
