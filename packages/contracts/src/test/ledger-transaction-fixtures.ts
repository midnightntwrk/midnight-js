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
import { CostModel, type ProvingProvider, Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ProvingProvider as Ledger8ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';
import {
  type FinalizedTx,
  LedgerTransaction,
  type UnboundTx,
  type UnprovenTx
} from '@midnight-ntwrk/midnight-js-types';

const NETWORK_ID = 'undeployed';

/**
 * Answers without proving anything. A transaction with no offers and no calls
 * drives no circuits, so proving one never consults it.
 */
const inertLedger8ProvingProvider: Ledger8ProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array())
};

const inertProvingProvider: ProvingProvider = {
  ...inertLedger8ProvingProvider,
  lookupKey: () => Promise.resolve(undefined)
};

/** Handles of each era at each stage, sealed around real, empty ledger transactions. */
export const handles = {
  v9: {
    Unproven: (): UnprovenTx => LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts(NETWORK_ID)),
    Unbound: async (): Promise<UnboundTx> =>
      LedgerTransaction.seal(
        'v9',
        'Unbound',
        await Transaction.fromParts(NETWORK_ID).prove(inertProvingProvider, CostModel.initialCostModel())
      ),
    Finalized: async (): Promise<FinalizedTx> =>
      LedgerTransaction.seal(
        'v9',
        'Finalized',
        (await Transaction.fromParts(NETWORK_ID).prove(inertProvingProvider, CostModel.initialCostModel())).bind()
      )
  },
  v8: {
    Unproven: async (): Promise<UnprovenTx> =>
      LedgerTransaction.seal('v8', 'Unproven', (await loadLedger8Protocol()).Transaction.fromParts(NETWORK_ID)),
    Unbound: async (): Promise<UnboundTx> => {
      const v8 = await loadLedger8Protocol();
      return LedgerTransaction.seal(
        'v8',
        'Unbound',
        await v8.Transaction.fromParts(NETWORK_ID).prove(inertLedger8ProvingProvider, v8.CostModel.initialCostModel())
      );
    },
    Finalized: async (): Promise<FinalizedTx> => {
      const v8 = await loadLedger8Protocol();
      const unbound = await v8.Transaction.fromParts(NETWORK_ID).prove(
        inertLedger8ProvingProvider,
        v8.CostModel.initialCostModel()
      );
      return LedgerTransaction.seal('v8', 'Finalized', unbound.bind());
    }
  }
};

/**
 * A proven stand-in in the era of `tx`, for a provider double that records what
 * it was handed. The content is an empty transaction, not the one handed in:
 * a transaction carrying contract calls cannot be proven without keys.
 */
export const unboundLike = (tx: UnprovenTx): Promise<UnboundTx> => handles[tx.era].Unbound();

/** A balanced stand-in in the era of `tx`; see {@link unboundLike}. */
export const finalizedLike = (tx: UnboundTx): Promise<FinalizedTx> => handles[tx.era].Finalized();
