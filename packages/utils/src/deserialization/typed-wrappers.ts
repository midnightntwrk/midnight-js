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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { UnknownLedgerVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { LedgerTransactionTypes } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import {
  type Binding,
  ContractState as LedgerContractState,
  type EncodedStateValue,
  LedgerParameters,
  type Proof,
  type SignatureEnabled,
  StateValue as LedgerStateValue,
  Transaction,
  ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/v9';
import { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { LEDGER_VERSIONS, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
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
export const deserializeCompactContractState = (
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
export const deserializeZswapChainState = (
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

type FinalizedReaders = {
  readonly [E in LedgerVersion]: () => Promise<(bytes: Uint8Array) => LedgerTransactionTypes[E]['Finalized']>;
};

const finalizedReaders: FinalizedReaders = Object.freeze({
  v8: async () => {
    const v8 = await loadLedger8Protocol();
    return (bytes: Uint8Array) => v8.Transaction.deserialize('signature', 'proof', 'binding', bytes);
  },
  v9: () =>
    Promise.resolve((bytes: Uint8Array) =>
      Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', bytes)
    )
});

/**
 * Deserialize a finalized ledger transaction of the given era from raw bytes
 * and seal it in a {@link LedgerTransaction} handle of that era.
 * The proof / signature / binding markers are hidden — all current callers
 * use `('signature', 'proof', 'binding', ...)`. Add a new wrapper if a
 * different combination is needed.
 *
 * A v8 transaction is read through `loadLedger8Protocol`, so the handle wraps
 * an object of the v8 ledger copy this framework loaded.
 *
 * @param era The ledger era that wrote the bytes. Never derived from the bytes.
 * @param bytes The serialized finalized transaction.
 * @param ctx The call site, named on a refusal.
 * @returns A finalized handle of `era`.
 * @throws {DeserializationError} On any underlying ledger deserialization
 *   failure, including bytes written by the other era.
 * @throws {UnknownLedgerVersionError} If `era` is not a ledger version.
 * @throws {Ledger8RuntimeMissingError} If `era` is `'v8'` and the v8 runtime
 *   cannot be loaded.
 * @throws {ForeignLedgerTransactionError} If a duplicate install of the ledger
 *   package decoded the bytes.
 */
export const deserializeLedgerTransaction = async <E extends LedgerVersion>(
  era: E,
  bytes: Uint8Array,
  ctx: CallSiteContext
): Promise<LedgerTransaction<'Finalized', E>> => {
  if (!LEDGER_VERSIONS.includes(era)) {
    throw new UnknownLedgerVersionError(String(era));
  }
  const read = await finalizedReaders[era]();
  const tx = withDeserializationContext(
    {
      dataType: 'LedgerTransaction',
      source: 'ledger',
      caller: ctx.caller,
      details: ctx.details
    },
    () => read(bytes)
  );
  return LedgerTransaction.seal(era, 'Finalized', tx);
};

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
export const decodeLedgerStateValue = (
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
