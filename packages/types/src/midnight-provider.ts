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

import { erasServedBy, narrowToEraArm, type RetainedEraHandlers } from './era-arms';
import type { VersionedFinalizedTransaction } from './wallet-provider';

/**
 * Interface for Midnight transaction submission logic. It could be implemented, e.g., by a wallet,
 * a third-party service, or a node itself.
 */
export interface MidnightProvider {
  /**
   * The ledger eras THIS INSTANCE serves. See
   * {@link ProofProvider.supportedEras} — the field means the same on all three
   * transaction seams, and all three are read together before an operation
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
   * @throws V8PayloadUnsupportedError if the implementation does not handle the v8 arm.
   * @throws UntaggedPayloadError if `version` is missing or unrecognised.
   */
  submitTx(tx: VersionedFinalizedTransaction): Promise<TransactionId>;
}

/**
 * Submits a CURRENT-era transaction, which crosses this seam as a live ledger
 * object.
 */
export type CurrentEraSubmitter = (tx: FinalizedTransaction) => Promise<TransactionId>;

/**
 * Submits a RETAINED-era transaction, which crosses this seam as serialized
 * bytes.
 *
 * Unlike the other two seams this arm answers untagged, because a transaction
 * identifier is era-independent — the eras differ only in what they are handed.
 */
export type RetainedEraSubmitter = (txBytes: Uint8Array) => Promise<TransactionId>;

/**
 * The per-era arms {@link createMidnightProviderFromArms} assembles a
 * {@link MidnightProvider} from.
 */
export interface MidnightProviderArms {
  /** Required: every submitter serves the current era. */
  readonly currentEra: CurrentEraSubmitter;
  /** Optional, one entry per retained era this submitter serves. */
  readonly retainedEras?: RetainedEraHandlers<RetainedEraSubmitter>;
}

/**
 * Assembles a {@link MidnightProvider} from one arm per ledger era it serves.
 *
 * The counterpart to `createProofProviderFromArms`, with the same guarantees:
 * `supportedEras` is computed from the arms supplied, and the tag never appears
 * in implementation code.
 *
 * @param arms The current-era arm, and a handler for each retained era served.
 * @returns A {@link MidnightProvider} routing each submission to its era's arm.
 */
export const createMidnightProviderFromArms = (arms: MidnightProviderArms): MidnightProvider => ({
  supportedEras: erasServedBy(arms.retainedEras),

  async submitTx(tx: VersionedFinalizedTransaction): Promise<TransactionId> {
    const request = narrowToEraArm(tx, 'submitTx', arms.retainedEras);
    return request.era === CURRENT_LEDGER_VERSION
      ? arms.currentEra(request.tx)
      : request.handler(request.txBytes);
  }
});

/**
 * Lifts a v9-only submission function into the version-tagged
 * {@link MidnightProvider} interface.
 *
 * The counterpart to `createWalletProvider`, and worth using for the same
 * reason: it keeps the `version` tag out of implementation code, so an
 * implementer never meets the parameter-mismatch error the tagged interface
 * otherwise produces.
 *
 * The returned provider serves the v9 arm only — `supportedEras` says so — and
 * that is permanent rather than a gap: it lifts a v9-only implementation. It
 * rejects a v8 payload with `V8PayloadUnsupportedError` and an untagged one with
 * `UntaggedPayloadError`. To serve a retained era as well, use
 * {@link createMidnightProviderFromArms}.
 *
 * @param submitTx The v9-only submission function to wrap.
 * @returns A {@link MidnightProvider} that narrows inbound payloads.
 *
 * @example
 * ```typescript
 * const midnightProvider = createMidnightProvider((tx) => wallet.submitTransaction(tx));
 * ```
 */
export const createMidnightProvider = (
  submitTx: (tx: FinalizedTransaction) => Promise<TransactionId>
): MidnightProvider => createMidnightProviderFromArms({ currentEra: submitTx });
