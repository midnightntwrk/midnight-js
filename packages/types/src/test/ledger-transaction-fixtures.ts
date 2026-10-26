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
import type { LedgerTransactionTypes } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { ProvingProvider as Ledger8ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';

import { type FinalizedTx, LedgerTransaction, type UnboundTx, type UnprovenTx } from '../ledger-transaction';

const NETWORK_ID = 'undeployed';

/**
 * Answers without proving anything. A transaction with no offers and no calls
 * drives no circuits, so proving one never consults it.
 */
export const inertLedger8ProvingProvider: Ledger8ProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array())
};

export const inertProvingProvider: ProvingProvider = {
  ...inertLedger8ProvingProvider,
  lookupKey: () => Promise.resolve(undefined)
};

/** Real, empty ledger transactions of each era at each stage. */
export const ledgerTransactions = {
  v9: {
    Unproven: (): LedgerTransactionTypes['v9']['Unproven'] => Transaction.fromParts(NETWORK_ID),
    Unbound: (): Promise<LedgerTransactionTypes['v9']['Unbound']> =>
      Transaction.fromParts(NETWORK_ID).prove(inertProvingProvider, CostModel.initialCostModel()),
    Finalized: async (): Promise<LedgerTransactionTypes['v9']['Finalized']> =>
      (await ledgerTransactions.v9.Unbound()).bind()
  },
  v8: {
    Unproven: async (): Promise<LedgerTransactionTypes['v8']['Unproven']> =>
      (await loadLedger8Protocol()).Transaction.fromParts(NETWORK_ID),
    Unbound: async (): Promise<LedgerTransactionTypes['v8']['Unbound']> => {
      const v8 = await loadLedger8Protocol();
      return v8.Transaction.fromParts(NETWORK_ID).prove(inertLedger8ProvingProvider, v8.CostModel.initialCostModel());
    },
    Finalized: async (): Promise<LedgerTransactionTypes['v8']['Finalized']> =>
      (await ledgerTransactions.v8.Unbound()).bind()
  }
};

/** Handles of each era at each stage, sealed around the transactions above. */
export const handles = {
  v9: {
    Unproven: (): UnprovenTx => LedgerTransaction.seal('v9', 'Unproven', ledgerTransactions.v9.Unproven()),
    Unbound: async (): Promise<UnboundTx> => LedgerTransaction.seal('v9', 'Unbound', await ledgerTransactions.v9.Unbound()),
    Finalized: async (): Promise<FinalizedTx> =>
      LedgerTransaction.seal('v9', 'Finalized', await ledgerTransactions.v9.Finalized())
  },
  v8: {
    Unproven: async (): Promise<UnprovenTx> => LedgerTransaction.seal('v8', 'Unproven', await ledgerTransactions.v8.Unproven()),
    Unbound: async (): Promise<UnboundTx> => LedgerTransaction.seal('v8', 'Unbound', await ledgerTransactions.v8.Unbound()),
    Finalized: async (): Promise<FinalizedTx> =>
      LedgerTransaction.seal('v8', 'Finalized', await ledgerTransactions.v8.Finalized())
  }
};
