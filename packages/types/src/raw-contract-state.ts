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
 * `version` is derived from `protocolVersion`. It is the network's DATING of the
 * record, not a guarantee about the bytes: nothing here compares it against the
 * envelope inside `raw`.
 *
 * Implementing this? Set `version` at exactly ONE construction point, from
 * `protocolVersion`, never independently.
 *
 * @see {@link VersionTaggedPayloads} for why the state crosses as bytes, and for
 * the three things the tag does not establish.
 */
export interface RawContractState {
  /**
   * The ledger era this record is dated to, derived from
   * {@link protocolVersion} alone.
   *
   * This layer does not check that the era agrees with the envelope {@link raw}
   * actually carries, so this is a statement about the record's
   * `protocolVersion`, not a verified statement about the bytes. A caller that
   * cannot tolerate the two disagreeing must inspect the envelope itself.
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

  /**
   * The ledger parameters the chain held at the block that dated this state, exactly as served —
   * no envelope reading, no decode.
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
