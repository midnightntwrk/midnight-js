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
import type { EncodedStateValue } from '@midnightntwrk/ledger-v9';

import { StateDecodeFailedError } from '../../errors';
import type { LedgerVersion } from './ledger-version';
import { entryPointName } from './verifier-keys';

/** The one property {@link decodeContractStateWith} reads off a registered operation. */
export interface DecodableContractOperation {
  readonly verifierKey?: Uint8Array;
}

/**
 * The slice of a ledger `ContractState` {@link decodeContractStateWith} reads.
 * Both eras' class satisfies it structurally, which is what lets one decoder
 * serve both axes without either era's types being named here.
 *
 * @see {@link FailClosedDecoding} for why `maintenanceAuthority` and `balance`
 * are deliberately absent.
 */
export interface DecodableContractState {
  readonly data: { readonly state: { readonly encode: () => EncodedStateValue } };
  readonly operations: () => (string | Uint8Array)[];
  readonly operation: (entryPoint: string | Uint8Array) => DecodableContractOperation | undefined;
}

/**
 * The era module slice {@link decodeContractStateWith} needs: just the
 * `ContractState` class and its static reader.
 *
 * @see {@link ModuleGraphAndLazyLoading} for why this slice is declared
 * structurally rather than derived from one era's class, and why the module is
 * injected rather than imported.
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
 * A contract state as plain data: the primary state in its encoded form, and
 * the entry points the state declares.
 *
 * `entryPoints` is an ARRAY, not a map keyed by circuit id: two distinct byte
 * entry points can decode to the same name, and a caller has to reconcile
 * them.
 *
 * @see {@link FailClosedDecoding}
 */
export interface ContractStatePojo {
  readonly state: EncodedStateValue;
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

    return { state: decoded.data.state.encode(), entryPoints };
  } catch (cause) {
    throw new StateDecodeFailedError(version, cause);
  }
};
