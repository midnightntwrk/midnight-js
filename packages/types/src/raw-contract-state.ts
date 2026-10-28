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
 * serialized bytes, still behind their version tag, with nothing deserialized yet.
 *
 * `version` is the ledger era that WROTE the bytes, read from the version tag
 * inside `raw`. `protocolVersion` dates the block the record was read under,
 * which can be newer: a record keeps the encoding it was written in.
 *
 * Implementing this? Read `version` off the version tag of `raw`, never from
 * `protocolVersion`, and refuse a version tag newer than the block that dates it.
 *
 * @see {@link VersionTaggedPayloads} for why the state crosses as bytes, and for
 * the three things the tag does not establish.
 */
export interface RawContractState {
  /**
   * The ledger era that wrote {@link raw}, read from its version tag.
   */
  readonly version: LedgerVersion;
  /**
   * The raw protocol-version integer the network reported for the block that
   * dates the state. Its era can be newer than {@link version}.
   */
  readonly protocolVersion: number;
  /**
   * The serialized contract state, byte for byte as the network returned it,
   * including the version tag that precedes the state body. Not deserialized,
   * and not narrowed by era — narrow on {@link version} first, then hand
   * these bytes to that era's deserializer.
   */
  readonly raw: Uint8Array;

  /**
   * The ledger parameters the chain held at the block that dated this state, exactly as served —
   * no version tag reading, no decode.
   *
   * They must come from the SAME block as the state: they are dynamic and era-tagged. DO NOT
   * substitute the ledger's own `initialParameters()` — that is a cost model the chain does not
   * use.
   *
   * Bytes rather than a decoded object, for the same reason {@link RawContractState.raw} is.
   *
   * Optional because a provider that cannot serve them is still a usable provider; a consumer that
   * needs them has to say what it does without them.
   *
   * @see {@link VersionTaggedPayloads} for why they travel with the state rather than separately.
   */
  readonly ledgerParameters?: Uint8Array;
}
