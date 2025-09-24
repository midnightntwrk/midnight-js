/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { ContractState as LedgerContractState } from '@midnight-ntwrk/ledger';
import { Effect } from 'effect';

/** @internal */
export const asLedgerContractState: (
  contractState: ContractState
) => Effect.Effect<LedgerContractState, ContractRuntimeError.ContractRuntimeError> =
  (state) => Effect.try({
    try: () => LedgerContractState.deserialize(state.serialize()),
    catch: (err) => ContractRuntimeError.make('Unexpected error converting runtime contract state', err),
  });

/** @internal */
export const asLedgerContractStateFromBytes: (
  bytes: Uint8Array
) => Effect.Effect<LedgerContractState, ContractRuntimeError.ContractRuntimeError> =
  (bytes) => Effect.try({
    try: () => LedgerContractState.deserialize(bytes),
    catch: (err) => ContractRuntimeError.make('Unexpected error deserializing ledger contract state from bytes', err),
  });

/** @internal */
export const asContractState: (
  contractState: LedgerContractState
) => Effect.Effect<ContractState, ContractRuntimeError.ContractRuntimeError> =
  (state) => Effect.try({
    try: () => ContractState.deserialize(state.serialize()),
    catch: (err) => ContractRuntimeError.make('Unexpected error converting ledger contract state', err),
  });