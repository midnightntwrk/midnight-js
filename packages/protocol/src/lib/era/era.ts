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

import type { LedgerVersion } from '../ledger-version';
import type { ContractStatePojo } from './contract-state';

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
 * objects, never a live WASM handle. That is what lets a caller hold a result
 * without also holding the module that produced it, keeps the two eras'
 * results comparable, and makes a result safe to send through a
 * `structuredClone` or a worker boundary.
 *
 * The methods are synchronous. Asking for an era is the point at which its
 * runtime is acquired, so by the time a caller holds one of these there is
 * nothing left to await.
 */
export interface LedgerEra {
  /** The era this object is bound to — the value that was passed to `loadLedgerEra`. */
  readonly version: LedgerVersion;

  /**
   * Reads the primary state out of a raw, serialized contract-state envelope
   * written by this era.
   *
   * Fails closed on an envelope this era cannot read — including one written
   * by the other era — rather than returning a partial or empty state.
   */
  extractState(raw: Uint8Array): EncodedStateValue;

  /**
   * Reads a raw, serialized contract-state envelope written by this era into
   * plain data: its primary state, and the entry points it declares with the
   * verifier key registered against each.
   */
  decodeContractState(raw: Uint8Array): ContractStatePojo;
}
