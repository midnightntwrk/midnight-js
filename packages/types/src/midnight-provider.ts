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

import { unwrapV9 } from './unwrap-v9';
import type { VersionedFinalizedTransaction } from './wallet-provider';

/**
 * Interface for Midnight transaction submission logic. It could be implemented, e.g., by a wallet,
 * a third-party service, or a node itself.
 */
export interface MidnightProvider {
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
 * Lifts a v9-only submission function into the version-tagged
 * {@link MidnightProvider} interface.
 *
 * The counterpart to `createWalletProvider`, and worth using for the same
 * reason: it keeps the `version` tag out of implementation code, so an
 * implementer never meets the parameter-mismatch error the tagged interface
 * otherwise produces.
 *
 * The returned provider serves the v9 arm only: it rejects a v8 payload with
 * `V8PayloadUnsupportedError` and an untagged one with `UntaggedPayloadError`.
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
): MidnightProvider => ({
  async submitTx(tx: VersionedFinalizedTransaction): Promise<TransactionId> {
    return submitTx(unwrapV9(tx, 'submitTx'));
  }
});
