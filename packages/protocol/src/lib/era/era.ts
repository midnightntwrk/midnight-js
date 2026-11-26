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

import type { ComposeCallOptions, ComposeCallResultPojo, ComposeDeployOptions, DeployResultPojo } from '../shared/compose-types';
import type { ContractStatePojo } from '../shared/contract-state';
import type { LedgerEra } from '../shared/ledger-version';

/**
 * The facade of one ledger era, obtained from `loadLedgerEra`. Both eras expose
 * the same synchronous methods; {@link LedgerEraFacade.version} says which era
 * an object is bound to.
 *
 * Every value crossing it is plain data (`Uint8Array`s and plain objects), so a
 * result survives `structuredClone` and a worker boundary.
 *
 * @see {@link EraBoundary}
 */
export interface LedgerEraFacade {
  /** The era this object is bound to — the value that was passed to `loadLedgerEra`. */
  readonly version: LedgerEra;

  /**
   * Reads the primary state out of a raw, serialized contract-state envelope
   * written by this era.
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
   * @throws StateDecodeFailedError if this era's decoder rejects `raw`.
   * @throws StateInconsistentError if the decoded state is internally
   * inconsistent — an entry point it cannot resolve, a verifier key that will
   * not hash, or no usable balance.
   * @see {@link FailClosedDecoding}
   */
  decodeContractState(raw: Uint8Array): ContractStatePojo;

  /**
   * Composes an UNPROVEN call transaction and serializes it. Ledger 8 composes
   * exactly one call. A call's Zswap offer is a factory that receives the
   * transcript split this method resolves.
   *
   * @param options The calls to compose and the transaction-wide envelope.
   * @returns The serialized UNPROVEN transaction and each call's partition.
   * @throws ComposeOptionError if an option is unusable on this era; `option` names it.
   * @throws ComposeFailedError if a call cannot be assembled; `stage` names
   * which step refused it.
   * @see {@link ComposeRefusalOrder}
   */
  composeCallTx(options: ComposeCallOptions): ComposeCallResultPojo;

  /**
   * Composes an UNPROVEN deploy transaction. Returns the address because a
   * deploy mints a fresh nonce, so the caller cannot recompute it.
   *
   * @param options The initial state, its verifier keys, and the
   * transaction-wide envelope.
   * @returns The serialized UNPROVEN transaction, the address the deployment
   * will have, and the initial state that address was derived from.
   * @throws ComposeOptionError if an option is unusable on this era; `option` names it.
   * @throws ComposeFailedError if the keys do not match the declared entry
   * points or the ledger rejects a key blob; `stage` names which check.
   * @see {@link VerifierKeys}
   * @see {@link ComposeRefusalOrder}
   */
  composeDeployTx(options: ComposeDeployOptions): DeployResultPojo;
}
