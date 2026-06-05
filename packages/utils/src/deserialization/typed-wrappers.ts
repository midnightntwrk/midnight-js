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

import { defaultCalleeForSource } from './deserialization-error';
import { withDeserializationContext } from './with-deserialization-context';

/**
 * Minimal context the caller of a typed deserialization wrapper must supply.
 * The `dataType` and `source` are baked into each wrapper. `callee` defaults
 * to the source's pinned npm package; supply explicitly only to override.
 */
export interface CallSiteContext {
  readonly caller: string;
  readonly callee?: string;
}

const LEDGER_CALLEE = defaultCalleeForSource('ledger');
const COMPACT_RUNTIME_CALLEE = defaultCalleeForSource('compact-runtime');
const ONCHAIN_RUNTIME_CALLEE = defaultCalleeForSource('onchain-runtime');

/**
 * Deserialize a ledger {@link LedgerContractState} from raw bytes.
 * Throws {@link DeserializationError} on failure with structured context.
 */
export const deserializeContractState = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): LedgerContractState =>
  withDeserializationContext(
    {
      dataType: 'ContractState',
      source: 'ledger',
      caller: ctx.caller,
      callee: ctx.callee ?? LEDGER_CALLEE
    },
    () => LedgerContractState.deserialize(bytes)
  );

/**
 * Deserialize a compact-runtime {@link CompactContractState} from raw bytes.
 * Throws {@link DeserializationError} on failure with structured context.
 */
export const deserializeCompactContractState = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): CompactContractState =>
  withDeserializationContext(
    {
      dataType: 'ContractState',
      source: 'compact-runtime',
      caller: ctx.caller,
      callee: ctx.callee ?? COMPACT_RUNTIME_CALLEE
    },
    () => CompactContractState.deserialize(bytes)
  );

/**
 * Deserialize a ledger {@link ZswapChainState} from raw bytes.
 * Throws {@link DeserializationError} on failure with structured context.
 */
export const deserializeZswapChainState = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): ZswapChainState =>
  withDeserializationContext(
    {
      dataType: 'ZswapChainState',
      source: 'ledger',
      caller: ctx.caller,
      callee: ctx.callee ?? LEDGER_CALLEE
    },
    () => ZswapChainState.deserialize(bytes)
  );

/**
 * Deserialize a ledger {@link LedgerTransaction} from raw bytes.
 * The proof / signature / binding markers are hidden — all current callers
 * use `('signature', 'proof', 'binding', ...)`. Add a new wrapper if a
 * different combination is needed.
 *
 * Throws {@link DeserializationError} on failure with structured context.
 */
export const deserializeLedgerTransaction = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): LedgerTransaction<SignatureEnabled, Proof, Binding> =>
  withDeserializationContext(
    {
      dataType: 'LedgerTransaction',
      source: 'ledger',
      caller: ctx.caller,
      callee: ctx.callee ?? LEDGER_CALLEE
    },
    () => LedgerTransaction.deserialize('signature', 'proof', 'binding', bytes)
  );

/**
 * Deserialize ledger {@link LedgerParameters} from raw bytes.
 * Throws {@link DeserializationError} on failure with structured context.
 */
export const deserializeLedgerParameters = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): LedgerParameters =>
  withDeserializationContext(
    {
      dataType: 'LedgerParameters',
      source: 'ledger',
      caller: ctx.caller,
      callee: ctx.callee ?? LEDGER_CALLEE
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
 * Throws {@link DeserializationError} on failure with structured context.
 */
export const decodeLedgerStateValue = (
  encoded: EncodedStateValue,
  ctx: CallSiteContext
): LedgerStateValue =>
  withDeserializationContext(
    {
      dataType: 'StateValue',
      source: 'onchain-runtime',
      caller: ctx.caller,
      callee: ctx.callee ?? ONCHAIN_RUNTIME_CALLEE
    },
    () => LedgerStateValue.decode(encoded)
  );
