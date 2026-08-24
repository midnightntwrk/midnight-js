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
import { entryPointName } from '../engine/deploy-v8';
import type { LedgerVersion } from '../ledger-version';

/** The one property {@link decodeContractStateWith} reads off a registered operation. */
export interface DecodableContractOperation {
  readonly verifierKey?: Uint8Array;
}

/**
 * The slice of a ledger `ContractState` {@link decodeContractStateWith} reads.
 * Both eras' class satisfies it structurally, which is what lets one decoder
 * serve both axes without either era's types being named here.
 *
 * `maintenanceAuthority` and `balance` are deliberately absent: nothing in this
 * framework reads them off a decoded state, and a field carried "in case"
 * becomes a field a caller depends on.
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
 * Injected rather than imported as a value, for the same reason
 * `Ledger8ContractState` (`../engine/envelope.ts`) is: a value import of either
 * era's module would statically link its WASM into whatever bundle reaches this
 * one, so a consumer of the other era would pay for a runtime it never calls.
 */
export interface ContractStateDecoder {
  readonly ContractState: { readonly deserialize: (raw: Uint8Array) => DecodableContractState };
}

/**
 * One entry point a contract state declares, with the verifier key registered
 * against it if there is one.
 *
 * `verifierKey` and `verifierKeyHash` are both absent for a blank slot — the
 * shape a constructor-built state has before a deploy fills it in. They are
 * absent rather than zero-length or a hash of nothing on purpose: hashing an
 * empty key yields a real-looking digest that a caller comparing hashes would
 * match against a contract that was never deployed.
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
 * `entryPoints` is an ARRAY, not a map keyed by circuit id. A contract state
 * can declare two distinct byte entry points that decode to the same name
 * (bytes that are not valid UTF-8 both resolve to the replacement character),
 * and a name-keyed result would silently drop one of them. An array leaves both
 * visible to a caller that has to reconcile them.
 */
export interface ContractStatePojo {
  readonly state: EncodedStateValue;
  readonly entryPoints: readonly ContractEntryPointPojo[];
}

/**
 * Reads a raw, serialized contract-state envelope into a
 * {@link ContractStatePojo} using the given era's own `ContractState`.
 *
 * Nothing that crosses back is a live WASM handle: the primary state leaves as
 * an `EncodedStateValue` (plain objects, arrays, `Map`s, `Uint8Array`s and
 * primitives) and each entry point as a plain record. A caller therefore cannot
 * hold an object whose owning module it cannot see, and the result survives a
 * `structuredClone`.
 *
 * Every failure leaves as {@link StateDecodeFailedError} naming `version` — the
 * era whose decoder was used — with the decoder's own diagnosis on `cause`. The
 * whole read is covered, not just the deserialization, so no raw runtime error
 * escapes this seam uncoded.
 */
export const decodeContractStateWith = (
  raw: Uint8Array,
  version: LedgerVersion,
  ledger: ContractStateDecoder
): ContractStatePojo => {
  try {
    const decoded = ledger.ContractState.deserialize(raw);
    const entryPoints = decoded.operations().map((entryPoint): ContractEntryPointPojo => {
      const verifierKey = decoded.operation(entryPoint)?.verifierKey;
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
