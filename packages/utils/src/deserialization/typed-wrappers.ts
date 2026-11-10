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

import { UnknownLedgerEraError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  ContractState as LedgerContractState,
  type EncodedStateValue,
  LedgerParameters,
  StateValue as LedgerStateValue,
  ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/v9';
import { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { LEDGER_ERAS, type LedgerEra } from '@midnight-ntwrk/midnight-js-protocol/version';
import { LedgerTransaction } from '@midnight-ntwrk/midnight-js-types';

import { withDeserializationContext } from './with-deserialization-context';

/**
 * Minimal context the caller of a typed deserialization wrapper must supply.
 * The `dataType` and `source` are baked into each wrapper.
 */
export interface CallSiteContext {
  readonly caller: string;
  /**
   * Facts identifying the particular read that failed, rendered on the error
   * and kept on its `context`. Diagnosis only: nothing here changes the
   * classification or the mitigation.
   */
  readonly details?: Readonly<Record<string, string | number>>;
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
 * const state = deserializeLedger9ContractState(buf, {
 *   caller: '@midnight-ntwrk/midnight-js-indexer-public-data-provider:queryContractState'
 * });
 * ```
 *
 * The `caller` should be fully qualified (`@scope/package:function`) — this
 * convention is enforced across the codebase and surfaces in the rendered
 * error message.
 */
export const deserializeLedger9ContractState = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): LedgerContractState =>
  withDeserializationContext(
    {
      dataType: 'ContractState',
      source: 'ledger',
      caller: ctx.caller,
      details: ctx.details
    },
    () => LedgerContractState.deserialize(bytes)
  );

/**
 * Deserialize a compact-runtime {@link CompactContractState} from raw bytes.
 *
 * @throws {DeserializationError} On any underlying compact-runtime
 *   deserialization failure.
 */
export const deserializeLedger9CompactContractState = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): CompactContractState =>
  withDeserializationContext(
    {
      dataType: 'ContractState',
      source: 'compact-runtime',
      caller: ctx.caller,
      details: ctx.details
    },
    () => CompactContractState.deserialize(bytes)
  );

/**
 * Deserialize a ledger {@link ZswapChainState} from raw bytes.
 *
 * @throws {DeserializationError} On any underlying ledger deserialization
 *   failure.
 */
export const deserializeLedger9ZswapChainState = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): ZswapChainState =>
  withDeserializationContext(
    {
      dataType: 'ZswapChainState',
      source: 'ledger',
      caller: ctx.caller,
      details: ctx.details
    },
    () => ZswapChainState.deserialize(bytes)
  );

/**
 * Wraps the bytes of a finalized ledger transaction of the given era in a
 * {@link LedgerTransaction} handle of that era. Only the header is checked;
 * the caller decodes the handle with its own ledger copy, so reading a v8
 * record does not load the v8 runtime.
 *
 * @param era The ledger era that wrote the bytes. Never derived from the bytes.
 * @param bytes The serialized finalized transaction.
 * @param ctx The call site, named on a refusal.
 * @returns A finalized handle of `era`.
 * @throws {DeserializationError} If the bytes do not start with the header the
 *   ledger of `era` writes for a finalized transaction, including bytes written
 *   by the other era.
 * @throws {UnknownLedgerEraError} If `era` is not a ledger era.
 */
export const deserializeLedgerTransaction = async <E extends LedgerEra>(
  era: E,
  bytes: Uint8Array,
  ctx: CallSiteContext
): Promise<LedgerTransaction<'Finalized', E>> => {
  if (!LEDGER_ERAS.includes(era)) {
    throw new UnknownLedgerEraError(era);
  }
  return withDeserializationContext(
    {
      dataType: 'LedgerTransaction',
      source: 'ledger',
      caller: ctx.caller,
      details: ctx.details
    },
    () => LedgerTransaction.fromBytes(era, 'Finalized', bytes)
  );
};

/**
 * Deserialize ledger {@link LedgerParameters} from raw bytes.
 *
 * @throws {DeserializationError} On any underlying ledger deserialization
 *   failure.
 */
export const deserializeLedger9Parameters = (
  bytes: Uint8Array,
  ctx: CallSiteContext
): LedgerParameters =>
  withDeserializationContext(
    {
      dataType: 'LedgerParameters',
      source: 'ledger',
      caller: ctx.caller,
      details: ctx.details
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
export const decodeLedger9StateValue = (
  encoded: EncodedStateValue,
  ctx: CallSiteContext
): LedgerStateValue =>
  withDeserializationContext(
    {
      dataType: 'StateValue',
      source: 'onchain-runtime',
      caller: ctx.caller,
      details: ctx.details
    },
    () => LedgerStateValue.decode(encoded)
  );
