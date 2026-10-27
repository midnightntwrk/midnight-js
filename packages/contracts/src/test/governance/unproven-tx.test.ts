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

import { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  MaintenanceUpdate,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleSigningKey,
  type UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { LedgerTransaction, type UnprovenTx } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import {
  createUnprovenRemoveVerifierKeyTx,
  createUnprovenReplaceAuthorityTx,
  unprovenTxFromContractUpdates
} from '../../governance/unproven-tx';
import { createMockCompiledContract, createMockZKConfigProvider, MOCK_CONFIG } from '../test-mocks';

const ledgerTxOf = (handle: UnprovenTx): UnprovenTransaction => LedgerTransaction.unwrap(handle, 'v9');

const networkIdOfTx = (handle: UnprovenTx): string | undefined =>
  /network_id: "([^"]*)"/.exec(ledgerTxOf(handle).toString(false))?.[1];

const ttlOfTx = (handle: UnprovenTx): Date => {
  const [intent, ...others] = ledgerTxOf(handle).intents?.values() ?? [];
  assertDefined(intent, 'Expected the transaction to carry an intent');
  expect(others).toEqual([]);
  return intent.ttl;
};

const toWholeSecond = (ms: number): number => Math.floor(ms / 1000) * 1000;

describe('governance/unproven-tx', () => {
  const mockZKProvider = createMockZKConfigProvider();
  const mockCompiledContract = createMockCompiledContract();
  const dummySigningKey = sampleSigningKey();
  const dummySigningKey2 = sampleSigningKey();
  const dummyContractState = new CompactContractState();
  const dummyContractAddress = sampleContractAddress();
  const dummyCPK = sampleCoinPublicKey();

  it('unprovenTxFromContractUpdates returns an unproven v9 handle', async () => {
    const tx = await unprovenTxFromContractUpdates(
      () => Promise.resolve(new MaintenanceUpdate(dummyContractAddress, [], 1n)),
      MOCK_CONFIG
    );
    expect(LedgerTransaction.isLedgerTransaction(tx)).toBe(true);
    expect({ era: tx.era, stage: tx.stage }).toEqual({ era: 'v9', stage: 'Unproven' });
  });

  it('builds a maintenance update for the configured network with the configured TTL', async () => {
    const before = Date.now();
    const tx = await unprovenTxFromContractUpdates(
      () => Promise.resolve(new MaintenanceUpdate(dummyContractAddress, [], 1n)),
      { networkId: 'preview', ttlSeconds: 300 }
    );
    const after = Date.now();

    expect(networkIdOfTx(tx)).toBe('preview');
    expect(ttlOfTx(tx).getTime()).toBeGreaterThanOrEqual(toWholeSecond(before + 300_000));
    expect(ttlOfTx(tx).getTime()).toBeLessThanOrEqual(after + 300_000);
  });

  it('refuses an invalid TTL before signing the update', async () => {
    const updateAndSign = vi.fn(() => Promise.resolve(new MaintenanceUpdate(dummyContractAddress, [], 1n)));

    await expect(unprovenTxFromContractUpdates(updateAndSign, { networkId: 'preview', ttlSeconds: -5 })).rejects.toThrow(InvalidArgumentError);
    expect(updateAndSign).not.toHaveBeenCalled();
  });

  it('createUnprovenReplaceAuthorityTx returns an unproven v9 handle', async () => {
    const tx = await createUnprovenReplaceAuthorityTx(
      mockZKProvider,
      mockCompiledContract,
      dummyContractAddress,
      dummySigningKey,
      dummyContractState,
      dummySigningKey2,
      dummyCPK,
      MOCK_CONFIG
    );
    expect(LedgerTransaction.isLedgerTransaction(tx)).toBe(true);
    expect({ era: tx.era, stage: tx.stage }).toEqual({ era: 'v9', stage: 'Unproven' });
  });

  it('createUnprovenRemoveVerifierKeyTx returns an unproven v9 handle', async () => {
    const tx = await createUnprovenRemoveVerifierKeyTx(
      mockZKProvider,
      mockCompiledContract,
      dummyContractAddress,
      'op',
      dummyContractState,
      dummySigningKey,
      dummyCPK,
      MOCK_CONFIG
    );
    expect(LedgerTransaction.isLedgerTransaction(tx)).toBe(true);
    expect({ era: tx.era, stage: tx.stage }).toEqual({ era: 'v9', stage: 'Unproven' });
  });
});
