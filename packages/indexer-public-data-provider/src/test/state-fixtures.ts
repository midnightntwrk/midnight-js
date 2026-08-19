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

import { ledger, loadV8 } from '@midnight-ntwrk/midnight-js-protocol';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

// Contract-state fixtures are minted here, at test time, from the two ledger
// runtimes themselves — never checked in as byte blobs. Minting keeps the
// fixtures honest (they are whatever the pinned runtimes actually produce)
// and keeps them tiny: a freshly constructed, empty `ContractState` is a few
// dozen bytes, so no large binary ever enters the unit-test run.
//
// The v8 runtime is reached through `loadV8()`, the only sanctioned path to
// it; nothing here depends on the v8 ledger package directly.

/** A newly constructed, empty contract state serialized by the v9 runtime. */
export const mintV9ContractStateBytes = (): Uint8Array => new ledger.ContractState().serialize();

/** A newly constructed, empty contract state serialized by the v8 runtime. */
export const mintV8ContractStateBytes = async (): Promise<Uint8Array> => {
  const v8 = await loadV8();
  return new v8.ContractState().serialize();
};

/** The v9 fixture in the indexer's wire encoding: lowercase hex, no prefix. */
export const mintV9ContractStateHex = (): string => toHex(mintV9ContractStateBytes());

/** The v8 fixture in the indexer's wire encoding: lowercase hex, no prefix. */
export const mintV8ContractStateHex = async (): Promise<string> => toHex(await mintV8ContractStateBytes());

/** Protocol-version integer for a node release whose ledger runtime is v8. */
export const V8_ERA_PROTOCOL_VERSION = 1_000_000;

/** Protocol-version integer for a node release whose ledger runtime is v9. */
export const V9_ERA_PROTOCOL_VERSION = 2_000_000;
