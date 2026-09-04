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

import type { EncodedStateValue } from '@midnightntwrk/ledger-v9';

import type { ComposeCallOptions, ComposeDeployOptions, DeployResultPojo } from '../shared/compose-types';
import type { ContractStatePojo } from '../shared/contract-state';
import type { LedgerVersion } from '../shared/ledger-version';

/**
 * One ledger era, as a single object a caller holds and calls.
 *
 * Both eras expose the SAME methods with the same signatures. Which era an
 * object is bound to is readable from {@link LedgerEra.version} and nowhere
 * else — a caller that has resolved the era for a record (see
 * `protocolVersionToLedger` in `../../version.ts`) hands that value to
 * `loadLedgerEra` once and then writes era-agnostic code.
 *
 * Every value crossing this boundary is plain data: `Uint8Array`s and plain
 * objects, never a live WASM handle, so a result outlives the module that
 * produced it and survives a `structuredClone` or a worker boundary.
 *
 * The methods are synchronous. Asking for an era is the point at which its
 * runtime is acquired, so by the time a caller holds one of these there is
 * nothing left to await.
 *
 * @see {@link EraSeam}
 */
export interface LedgerEra {
  /** The era this object is bound to — the value that was passed to `loadLedgerEra`. */
  readonly version: LedgerVersion;

  /**
   * Reads the primary state out of a raw, serialized contract-state envelope
   * written by this era.
   *
   * Fails closed on an envelope this era cannot read — including one written
   * by the other era — rather than returning a partial or empty state. The
   * failure is a `StateDecodeFailedError` naming this era, the same class
   * {@link LedgerEra.decodeContractState} raises, with the decoder's own
   * diagnosis on `cause`.
   *
   * @param raw The serialized contract-state envelope.
   * @returns The primary state read out of the envelope.
   * @throws StateDecodeFailedError if this era's decoder rejects `raw`.
   * @see {@link FailClosedDecoding}
   */
  extractState(raw: Uint8Array): EncodedStateValue;

  /**
   * Reads a raw, serialized contract-state envelope written by this era into
   * plain data: its primary state, and the entry points it declares with the
   * verifier key registered against each.
   *
   * @param raw The serialized contract-state envelope.
   * @returns The decoded state. A `verifierKey` absent on an entry point means
   * that slot was never deployed, not that the key is empty.
   * @throws StateDecodeFailedError if this era's decoder rejects `raw`, or if
   * the state cannot resolve an entry point it declares itself.
   * @see {@link FailClosedDecoding}
   */
  decodeContractState(raw: Uint8Array): ContractStatePojo;

  /**
   * Composes an UNPROVEN call transaction and serializes it.
   *
   * The returned bytes are what `Transaction.serialize()` produces before
   * `.prove()` is ever called; proving needs a proving provider and a running
   * proof server, neither of which this seam has.
   *
   * The two eras are not equivalent here, and the difference is deliberate
   * rather than hidden: the retained pre-fork era composes exactly one call,
   * because a cross-contract call is a ledger-9-only feature a pre-fork
   * contract cannot emit. The refusal is raised, never worked around. A Zswap
   * offer is NOT refused on either era.
   *
   * @param options The calls to compose and the transaction-wide envelope.
   * @returns The serialized UNPROVEN transaction.
   * @throws ComposeOptionError if an option is unusable on this era — an
   * empty `networkId`, an invalid `ttl`, undecodable offer or state bytes, or
   * a call tree with more than one entry on the retained pre-fork era.
   * @throws ComposeFailedError if a call cannot be assembled; `stage` names
   * which step refused it.
   * @see {@link ComposeRefusalOrder}
   * @see {@link EraSeam}
   */
  composeCallTx(options: ComposeCallOptions): Uint8Array;

  /**
   * Composes an UNPROVEN deploy transaction and returns it together with the
   * address the deployment will have and the initial state that address was
   * derived from.
   *
   * The address cannot be recomputed from the state a caller passed in — a
   * deploy mints a fresh nonce — which is why it is returned rather than left
   * to the caller to derive.
   *
   * @param options The initial state, its verifier keys, and the
   * transaction-wide envelope.
   * @returns The serialized UNPROVEN transaction, the address the deployment
   * will have, and the initial state that address was derived from.
   * @throws ComposeOptionError if an option is unusable on this era — an
   * empty `networkId`, an invalid `ttl`, undecodable state bytes, or an
   * omitted `verifierKeys` for a state that still declares a blank key.
   * @throws ComposeFailedError if the supplied keys do not match the state's
   * declared entry points, or if the ledger rejects a key blob; `stage` names
   * which check refused it.
   * @see {@link VerifierKeys}
   * @see {@link ComposeRefusalOrder}
   */
  composeDeployTx(options: ComposeDeployOptions): DeployResultPojo;
}
