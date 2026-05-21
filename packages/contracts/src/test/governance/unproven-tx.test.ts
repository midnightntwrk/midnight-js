/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  MaintenanceUpdate,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleSigningKey,
  Transaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  createUnprovenRemoveVerifierKeyTx,
  createUnprovenReplaceAuthorityTx,
  unprovenTxFromContractUpdates
} from '../../governance/unproven-tx';
import { createMockCompiledContract, createMockZKConfigProvider } from '../test-mocks';

describe('governance/unproven-tx', () => {
  beforeAll(() => {
    setNetworkId('undeployed');
  });

  const mockZKProvider = createMockZKConfigProvider();
  const mockCompiledContract = createMockCompiledContract();
  const dummySigningKey = sampleSigningKey();
  const dummySigningKey2 = sampleSigningKey();
  const dummyContractState = new CompactContractState();
  const dummyContractAddress = sampleContractAddress();
  const dummyCPK = sampleCoinPublicKey();

  it('unprovenTxFromContractUpdates returns an UnprovenTransaction', async () => {
    const tx = await unprovenTxFromContractUpdates(
      () => Promise.resolve(new MaintenanceUpdate(dummyContractAddress, [], 1n))
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenReplaceAuthorityTx returns an UnprovenTransaction', async () => {
    const tx = await createUnprovenReplaceAuthorityTx(
      mockZKProvider,
      mockCompiledContract,
      dummyContractAddress,
      dummySigningKey,
      dummyContractState,
      dummySigningKey2,
      dummyCPK
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenRemoveVerifierKeyTx returns an UnprovenTransaction', async () => {
    const tx = await createUnprovenRemoveVerifierKeyTx(
      mockZKProvider,
      mockCompiledContract,
      dummyContractAddress,
      'op',
      dummyContractState,
      dummySigningKey,
      dummyCPK
    );
    expect(tx).toBeInstanceOf(Transaction);
  });
});
