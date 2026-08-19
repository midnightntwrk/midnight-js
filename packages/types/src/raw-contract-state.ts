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

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';

/**
 * A contract's on-chain state exactly as the network returned it: the
 * serialized bytes, still in their envelope, with nothing deserialized yet.
 *
 * During the ledger-fork window the two ledger runtimes are separate WASM
 * instances, so bytes produced by one cannot be handed to the other. Reading
 * the state as bytes plus the era they belong to lets a caller pick the right
 * runtime before it deserializes anything, instead of guessing and failing
 * deep inside a decoder.
 *
 * `version` is derived from `protocolVersion` — resolved the same way the
 * `read`-path resolver in `@midnight-ntwrk/midnight-js-protocol` resolves it.
 * On every value of this type the two fields therefore agree; the derivation
 * is never asserted here, because `types` stays declarations-only. Providers
 * and their mocks are responsible for setting `version` at exactly one
 * construction point, from `protocolVersion`, and never independently.
 */
export interface RawContractState {
  /**
   * The ledger runtime whose deserializer can read {@link raw}, derived from
   * {@link protocolVersion}.
   */
  readonly version: LedgerVersion;
  /**
   * The raw protocol-version integer the network reported for the state.
   */
  readonly protocolVersion: number;
  /**
   * The serialized contract state, byte for byte as the network returned it,
   * including the envelope that precedes the state body. Not deserialized,
   * and not narrowed by era — narrow on {@link version} first, then hand
   * these bytes to that era's deserializer.
   */
  readonly raw: Uint8Array;
}
