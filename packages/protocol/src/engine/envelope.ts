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

import { ContractState as OnchainContractStateV3 } from '@midnight-ntwrk/onchain-runtime-v3';
import { ContractState as LedgerContractStateV9, type EncodedStateValue } from '@midnightntwrk/ledger-v9';

import { DownConvertFailedError } from '../errors';
import type { LedgerVersion } from '../version';

export type { EncodedStateValue };

/**
 * Extracts the primary {@link EncodedStateValue} out of a raw, serialized
 * `ContractState` envelope, choosing the decoder that matches `version`:
 *
 * - `'v9'` — a post-fork `contract-state[v8]`-tagged envelope, read via
 *   `@midnightntwrk/ledger-v9`.
 * - `'v8'` — a pre-fork `contract-state[v6]`-tagged envelope, read directly
 *   via `@midnight-ntwrk/onchain-runtime-v3` (the same codec that produced
 *   it — `compact-runtime@0.16` is a pure re-export of this package).
 *
 * Never returns a silently empty or partial state: any deserialization
 * failure (malformed bytes, a truncated payload, or an envelope tagged for
 * the other ledger version) is wrapped in a {@link DownConvertFailedError}
 * with `{ cause }`, so failures propagate loudly instead of producing a
 * misleading result.
 */
export const extractEncodedStateValue = (raw: Uint8Array, version: LedgerVersion): EncodedStateValue => {
  try {
    return version === 'v9'
      ? LedgerContractStateV9.deserialize(raw).data.state.encode()
      : OnchainContractStateV3.deserialize(raw).data.state.encode();
  } catch (cause) {
    throw new DownConvertFailedError(`${version} envelope extraction`, cause);
  }
};
