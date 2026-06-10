/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type Binding,
  ContractState as LedgerContractState,
  type EncodedStateValue,
  LedgerParameters,
  type Proof,
  type SignatureEnabled,
  StateValue as LedgerStateValue,
  Transaction as LedgerTransaction,
  ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/ledger';

import { withDeserializationContext } from './with-deserialization-context';

/**
 * Minimal context the caller of a typed deserialization wrapper must supply.
 * The `dataType` and `source` are baked into each wrapper.
 */
export interface CallSiteContext {
  readonly caller: string;
}

/**
 * Deserialize a ledger {@link LedgerContractState} from raw bytes.
 *
 * @throws {DeserializationError} On any underlying ledger deserialization
 *   failure. The error carries classification, direction inference, and
 *   actionable mitigation hints.
 *
 * @example
 * ```ts
 * const state = deserializeContractState(buf, {
 *   caller: '@midnight-ntwrk/midnight-js-indexer-public-data-provider:queryContractState'
 * });
 * ```
 *
 * The `caller` should be fully qualified (`@scope/package:function`) — this
 * convention is enforced across the codebase and surfaces in the rendered
 * error message.
 */
export const deserializeContractState = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): LedgerContractState =>
  withDeserializationContext(
    {
      dataType: 'ContractState',
      source: 'ledger',
      caller: ctx.caller
    },
    () => LedgerContractState.deserialize(bytes)
  );

/**
 * Deserialize a compact-runtime {@link CompactContractState} from raw bytes.
 *
 * @throws {DeserializationError} On any underlying compact-runtime
 *   deserialization failure.
 */
export const deserializeCompactContractState = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): CompactContractState =>
  withDeserializationContext(
    {
      dataType: 'ContractState',
      source: 'compact-runtime',
      caller: ctx.caller
    },
    () => CompactContractState.deserialize(bytes)
  );

/**
 * Deserialize a ledger {@link ZswapChainState} from raw bytes.
 *
 * @throws {DeserializationError} On any underlying ledger deserialization
 *   failure.
 */
export const deserializeZswapChainState = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): ZswapChainState =>
  withDeserializationContext(
    {
      dataType: 'ZswapChainState',
      source: 'ledger',
      caller: ctx.caller
    },
    () => ZswapChainState.deserialize(bytes)
  );

/**
 * Deserialize a ledger {@link LedgerTransaction} from raw bytes.
 * The proof / signature / binding markers are hidden — all current callers
 * use `('signature', 'proof', 'binding', ...)`. Add a new wrapper if a
 * different combination is needed.
 *
 * @throws {DeserializationError} On any underlying ledger deserialization
 *   failure.
 */
export const deserializeLedgerTransaction = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): LedgerTransaction<SignatureEnabled, Proof, Binding> =>
  withDeserializationContext(
    {
      dataType: 'LedgerTransaction',
      source: 'ledger',
      caller: ctx.caller
    },
    () => LedgerTransaction.deserialize('signature', 'proof', 'binding', bytes)
  );

/**
 * Deserialize ledger {@link LedgerParameters} from raw bytes.
 *
 * @throws {DeserializationError} On any underlying ledger deserialization
 *   failure.
 */
export const deserializeLedgerParameters = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): LedgerParameters =>
  withDeserializationContext(
    {
      dataType: 'LedgerParameters',
      source: 'ledger',
      caller: ctx.caller
    },
    () => LedgerParameters.deserialize(bytes)
  );

/**
 * Decode an onchain-runtime {@link LedgerStateValue} from its
 * {@link EncodedStateValue} representation (a tagged union, NOT a byte
 * buffer — `StateValue.decode` operates on the structured encoding produced
 * by `StateValue.encode()`).
 *
 * Source attribution is `onchain-runtime` (per D8) even though the type
 * is re-exported through the `ledger` sub-path — mitigation hints point
 * to the underlying runtime package.
 *
 * @throws {DeserializationError} On any underlying onchain-runtime decode
 *   failure.
 */
export const decodeLedgerStateValue = (
  encoded: EncodedStateValue,
  ctx: CallSiteContext
): LedgerStateValue =>
  withDeserializationContext(
    {
      dataType: 'StateValue',
      source: 'onchain-runtime',
      caller: ctx.caller
    },
    () => LedgerStateValue.decode(encoded)
  );
