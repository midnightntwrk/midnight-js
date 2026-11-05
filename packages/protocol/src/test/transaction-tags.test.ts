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

import { CostModel, type ProvingProvider, Transaction } from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { loadLedger8Protocol } from '../lib/v8/load';
import { LEDGER_ERAS, LEDGER_TRANSACTION_TAGS, type LedgerEra, TRANSACTION_STAGES, type TransactionStage } from '../version';

const NETWORK_ID = 'undeployed';

const inertProvingProvider: ProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array()),
  lookupKey: () => Promise.resolve(undefined)
};

type Staged = { serialize(): Uint8Array };

const transactionsOf = async (era: LedgerEra): Promise<Record<TransactionStage, Staged>> => {
  const { Transaction: EraTransaction, CostModel: EraCostModel } = era === 'v9' ? { Transaction, CostModel } : await loadLedger8Protocol();
  const unproven = EraTransaction.fromParts(NETWORK_ID);
  const unbound = await unproven.prove(inertProvingProvider, EraCostModel.initialCostModel());
  return { Unproven: unproven, Unbound: unbound, Finalized: unbound.bind() };
};

const leadingHeader = (bytes: Uint8Array, header: string): string =>
  new TextDecoder().decode(bytes.subarray(0, header.length + 1));

describe('LEDGER_TRANSACTION_TAGS', () => {
  it('has one row per era and one header per stage', () => {
    expect(Object.keys(LEDGER_TRANSACTION_TAGS).sort()).toEqual([...LEDGER_ERAS].sort());
    for (const era of LEDGER_ERAS) {
      expect(Object.keys(LEDGER_TRANSACTION_TAGS[era]).sort()).toEqual([...TRANSACTION_STAGES].sort());
    }
  });

  it.each(LEDGER_ERAS.flatMap((era) => TRANSACTION_STAGES.map((stage) => [era, stage] as const)))(
    'holds the header the %s ledger writes for a %s transaction',
    async (era, stage) => {
      const bytes = (await transactionsOf(era))[stage].serialize();

      expect(leadingHeader(bytes, LEDGER_TRANSACTION_TAGS[era][stage])).toBe(`${LEDGER_TRANSACTION_TAGS[era][stage]}:`);
    }
  );

  it('gives every era and stage its own header', () => {
    const headers = LEDGER_ERAS.flatMap((era) => TRANSACTION_STAGES.map((stage) => LEDGER_TRANSACTION_TAGS[era][stage]));

    expect(new Set(headers).size).toBe(headers.length);
  });

  it('is frozen at every level', () => {
    expect(Object.isFrozen(LEDGER_TRANSACTION_TAGS)).toBe(true);
    expect(LEDGER_ERAS.every((era) => Object.isFrozen(LEDGER_TRANSACTION_TAGS[era]))).toBe(true);
    expect(Object.isFrozen(TRANSACTION_STAGES)).toBe(true);
  });
});
