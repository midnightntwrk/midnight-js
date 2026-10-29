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

import type { LedgerTransactionTypes } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { FinalizedTransaction, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { LEDGER_VERSIONS, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { dispatch, type Route } from './internal/dispatch';
import { readEraEntries } from './internal/read-era-entries';
import type { FinalizedTx } from './ledger-transaction';

/**
 * Interface for Midnight transaction submission logic. It could be implemented, e.g., by a wallet,
 * a third-party service, or a node itself.
 */
export interface MidnightProvider {
  /**
   * The ledger eras THIS INSTANCE serves. See
   * {@link ProofProvider.supportedEras} — the field means the same on all three
   * transaction providers, and all three are read together before an operation
   * starts.
   */
  readonly supportedEras: readonly LedgerVersion[];

  /**
   * Submit a transaction to the network to be consensed upon.
   *
   * @param tx The finalized transaction handle to submit.
   * @returns The transaction identifier of the submitted transaction. A transaction identifier is
   *          era-independent.
   * @throws InvalidTransactionHandleError if `tx` is not a finalized handle of this package.
   * @throws ProviderEraUnsupportedError if the implementation does not serve the handle's era.
   */
  submitTx(tx: FinalizedTx): Promise<TransactionId>;
}

/**
 * The per-era handlers {@link createMidnightProviderFromHandlers} assembles a
 * {@link MidnightProvider} from: one key per ledger era, a handler for an era
 * the provider submits and `undefined` for one it does not.
 *
 * A handler takes an object of the ledger copy this framework loaded for its
 * era. A handler that hands the transaction to another ledger copy serializes
 * it on the way out.
 */
export type MidnightProviderHandlers = {
  readonly [E in LedgerVersion]: ((tx: LedgerTransactionTypes[E]['Finalized']) => Promise<TransactionId>) | undefined;
};

/**
 * Assembles a {@link MidnightProvider} from one handler per ledger era.
 *
 * The counterpart to `createProofProviderFromHandlers`, with the same guarantees:
 * `supportedEras` is computed from the handlers given, and each handle is routed
 * to its own era's handler.
 *
 * Every handler is called with `handlers` as `this`.
 *
 * @param handlers One entry per ledger era.
 * @returns A {@link MidnightProvider} routing each handle to its era's handler.
 * @throws UnusableEraEntryError if an era entry is neither `undefined` nor a
 *         function. Raised at construction.
 * @throws InvalidArgumentError if `handlers` is not an object, has no key for
 *         a ledger era, or serves no era (every entry `undefined`). Raised at
 *         construction.
 */
export const createMidnightProviderFromHandlers = (handlers: MidnightProviderHandlers): MidnightProvider => {
  const served = readEraEntries('submitTx', handlers, 'handler');
  const supportedEras = Object.freeze(LEDGER_VERSIONS.filter((era) => served[era] !== undefined));
  const route: Route<'Finalized', [], Readonly<Record<LedgerVersion, TransactionId>>, TransactionId> = {
    method: 'submitTx',
    stage: 'Finalized',
    handlers: served,
    receiver: handlers,
    supportedEras,
    answer: (_era, txId) => txId
  };
  return {
    supportedEras,
    submitTx: (tx) => dispatch(route, tx, [])
  };
};

/**
 * Lifts a v9-only submission function into the {@link MidnightProvider}
 * interface, unwrapping each handle on the way in.
 *
 * The returned provider serves v9 only — `supportedEras` says so — and refuses
 * a v8 handle with `ProviderEraUnsupportedError`. To serve v8 as well, use
 * {@link createMidnightProviderFromHandlers}.
 *
 * @param submitTx The v9-only submission function to wrap.
 * @returns A {@link MidnightProvider} serving v9.
 *
 * @example
 * ```typescript
 * const midnightProvider = createMidnightProvider((tx) => wallet.submitTransaction(tx.serialize()));
 * ```
 */
export const createMidnightProvider = (
  submitTx: (tx: FinalizedTransaction) => Promise<TransactionId>
): MidnightProvider => createMidnightProviderFromHandlers({ v8: undefined, v9: submitTx });
