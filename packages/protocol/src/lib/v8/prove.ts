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

import { InvalidArgumentError } from '../../errors';
import type { ProvingProvider } from '../../v8.js';
import {
  isFrameworkLedgerTransaction,
  type LedgerTransactionTypes,
  transactionStageOf
} from '../shared/ledger-transaction';
import { loadLedger8Protocol } from './load';

/**
 * Proves a retained-era transaction.
 *
 * The cost model comes from the same `loadLedger8Protocol` result as the
 * transaction class, and that pairing is load-bearing: the retained ledger
 * ships its own `CostModel` and its `prove()` checks the argument against that
 * class across the WASM boundary, so the current era's cost model is rejected
 * with `expected instance of CostModel`.
 *
 * @param tx The unproven transaction, an object of the v8 ledger copy this
 *   framework loaded (read one with `deserializeTransactionAtStage`).
 * @param provingProvider The circuit-level proving provider to drive, typed as
 *   the RETAINED era's `ProvingProvider`: `check` and `prove`, and no
 *   `lookupKey`. That is the declared return type of an in-process prover's
 *   `asV8ProvingProvider()`, so registering one here needs no cast. The current
 *   era's shape is a superset, so a provider serving both eras also satisfies
 *   this parameter and needs no adapter.
 * @returns The proven, unbound transaction.
 * @throws Ledger8RuntimeMissingError If the retained runtime cannot be loaded.
 * @throws InvalidArgumentError If `tx` is not an unproven transaction of the
 *   v8 ledger copy this framework loaded.
 *
 * @remarks Intended for `ProofProvider` implementations. Application code
 * should call `proveTx` on a provider rather than this directly.
 */
export const proveLedger8Transaction = async (
  tx: LedgerTransactionTypes['v8']['Unproven'],
  provingProvider: ProvingProvider
): Promise<LedgerTransactionTypes['v8']['Unbound']> => {
  const v8 = await loadLedger8Protocol();
  const check = isFrameworkLedgerTransaction('v8', tx);
  if (check !== 'own') {
    throw new InvalidArgumentError(
      `proveLedger8Transaction takes a v8 transaction of the ledger copy this framework loaded (${check}). ` +
        `Read one with deserializeTransactionAtStage('v8', 'Unproven', bytes).`
    );
  }
  const stage = transactionStageOf(tx);
  if (stage !== 'Unproven') {
    throw new InvalidArgumentError(
      `proveLedger8Transaction takes an Unproven transaction, but the transaction is ${stage ?? 'at no pipeline stage'}.`
    );
  }
  return tx.prove(provingProvider, v8.CostModel.initialCostModel());
};
