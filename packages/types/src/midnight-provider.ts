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

import type { FinalizedTransaction, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { CURRENT_LEDGER_VERSION, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { erasServedBy, narrowToEra, type RetainedEraEntries } from './era-entries';
import { readEraEntries } from './internal/read-era-entries';
import type { VersionedFinalizedTransaction } from './wallet-provider';

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
   * @param tx The version-tagged finalized transaction to submit: `{ version: 'v9', tx }` for a
   *           live v9 ledger object, `{ version: 'v8', txBytes }` for v8-era serialized bytes.
   * @returns The transaction identifier of the submitted transaction. Not version-tagged — a
   *          transaction identifier is era-independent.
   * @throws Ledger8PayloadUnsupportedError if the implementation does not handle v8 payloads.
   * @throws UntaggedPayloadError if `version` is missing or unrecognised.
   */
  submitTx(tx: VersionedFinalizedTransaction): Promise<TransactionId>;
}

/**
 * Submits a ledger 9 transaction, which is passed to `submitTx` as a live ledger
 * object. It fills the `currentEra` slot while ledger 9 is the current era.
 */
export type Ledger9Submitter = (tx: FinalizedTransaction) => Promise<TransactionId>;

/**
 * Submits a RETAINED-era transaction (an era in `RetainedLedgerVersion`; today
 * ledger 8), which is passed to `submitTx` as serialized
 * bytes.
 *
 * Unlike the other two transaction methods this one answers untagged, because a transaction
 * identifier is era-independent — the eras differ only in what they are handed.
 */
export type RetainedEraSubmitter = (txBytes: Uint8Array) => Promise<TransactionId>;

/**
 * The per-era handlers {@link createMidnightProviderFromHandlers} assembles a
 * {@link MidnightProvider} from.
 */
export interface MidnightProviderHandlers {
  /** Required: every submitter serves the current era. */
  readonly currentEra: Ledger9Submitter;
  /** Optional, one entry per retained era this submitter serves. */
  readonly retainedEras?: RetainedEraEntries<RetainedEraSubmitter>;
}

/**
 * Assembles a {@link MidnightProvider} from one handler per ledger era it serves.
 *
 * The counterpart to `createProofProviderFromHandlers`, with the same guarantees:
 * `supportedEras` is computed from the handlers supplied, and the tag never appears
 * in implementation code.
 *
 * `currentEra` is called with `handlers` as `this`; a retained-era handler is
 * called with no `this`.
 *
 * @param handlers The current-era handler, and one for each retained era served.
 * @returns A {@link MidnightProvider} routing each submission to its era's handler.
 * @throws UnusableEraEntryError if `currentEra`, or a `retainedEras` entry other
 *         than `undefined`, is not a function. Raised at construction.
 * @throws InvalidArgumentError if `handlers` is not an object, or `retainedEras`
 *         is not a plain object keyed only by retained eras. Raised at construction.
 */
export const createMidnightProviderFromHandlers = (handlers: MidnightProviderHandlers): MidnightProvider => {
  const { currentEra, retainedEras } = readEraEntries('submitTx', handlers, 'handler');
  return {
    supportedEras: erasServedBy(retainedEras),

    async submitTx(tx: VersionedFinalizedTransaction): Promise<TransactionId> {
      const request = narrowToEra(tx, 'submitTx', retainedEras);
      return request.era === CURRENT_LEDGER_VERSION
        ? Reflect.apply(currentEra, handlers, [request.tx])
        : Reflect.apply(request.handler, undefined, [request.txBytes]);
    }
  };
};

/**
 * Lifts a v9-only submission function into the version-tagged
 * {@link MidnightProvider} interface.
 *
 * The counterpart to `createWalletProvider`, and worth using for the same
 * reason: it keeps the `version` tag out of implementation code.
 *
 * The returned provider serves v9 payloads only — `supportedEras` says so — and
 * that is permanent rather than a gap: it lifts a v9-only implementation. It
 * rejects a v8 payload with `Ledger8PayloadUnsupportedError` and an untagged one with
 * `UntaggedPayloadError`. To serve a retained era as well, use
 * {@link createMidnightProviderFromHandlers}.
 *
 * @param submitTx The v9-only submission function to wrap.
 * @returns A {@link MidnightProvider} that narrows inbound payloads.
 * @see {@link ProviderEraDeclarations} for the compiler error this avoids.
 *
 * @example
 * ```typescript
 * const midnightProvider = createMidnightProvider((tx) => wallet.submitTransaction(tx));
 * ```
 */
export const createMidnightProvider = (
  submitTx: (tx: FinalizedTransaction) => Promise<TransactionId>
): MidnightProvider => createMidnightProviderFromHandlers({ currentEra: submitTx });
