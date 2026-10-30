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

import { LedgerParameters, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { PrivateStateId, PublicStatesRead } from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractNotFoundError, PrivateStateNotFoundError } from '../errors';
import { getPublicStates, getStates } from '../get-states';
import {
  createMockContractAddress,
  createMockPrivateStateId,
  createMockProviders,
  publicStatesRead,
  publicStatesReadStub} from './test-mocks';

describe('get-states', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockPrivateStateId: PrivateStateId;
  let mockPrivateState: { test: string };

  const ledger9States = (): PublicStatesRead =>
    publicStatesRead({
      zswapChainState: new ZswapChainState(),
      ledgerParameters: LedgerParameters.initialParameters()
    });

  // `toEqual` compares a `SerializedState` by its public fields only, so the record is checked by identity.
  const expectSameRecord = (actual: PublicStatesRead, expected: PublicStatesRead): void => {
    expect(actual.protocolVersion).toBe(expected.protocolVersion);
    expect(actual.contractState).toBe(expected.contractState);
    expect(actual.zswapChainState).toBe(expected.zswapChainState);
    expect(actual.ledgerParameters).toBe(expected.ledgerParameters);
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockProviders = createMockProviders();
    mockContractAddress = createMockContractAddress();
    mockPrivateStateId = createMockPrivateStateId();
    mockPrivateState = { test: 'mock-private-state' };
  });

  describe('getPublicStates', () => {
    it.each([
      ['v9', ledger9States],
      ['v8', () => publicStatesReadStub('v8')]
    ] as const)('returns the %s record the provider served, as bytes', async (_era, states) => {
      const served = states();
      mockProviders.publicDataProvider.queryZSwapAndContractState = vi.fn().mockResolvedValue(served);

      const result = await getPublicStates(mockProviders.publicDataProvider, mockContractAddress, 'ab'.repeat(32));

      expect(mockProviders.publicDataProvider.queryZSwapAndContractState).toHaveBeenCalledWith(mockContractAddress, {
        type: 'blockHash',
        blockHash: 'ab'.repeat(32)
      });
      expect(result).toBe(served);
    });

    it('reads the latest states when no block is named', async () => {
      mockProviders.publicDataProvider.queryZSwapAndContractState = vi.fn().mockResolvedValue(ledger9States());

      await getPublicStates(mockProviders.publicDataProvider, mockContractAddress);

      expect(mockProviders.publicDataProvider.queryZSwapAndContractState).toHaveBeenCalledWith(mockContractAddress, undefined);
    });

    it('refuses an address with no public state as ContractNotFoundError', async () => {
      mockProviders.publicDataProvider.queryZSwapAndContractState = vi.fn().mockResolvedValue(null);

      const rejection = getPublicStates(mockProviders.publicDataProvider, mockContractAddress);

      await expect(rejection).rejects.toBeInstanceOf(ContractNotFoundError);
      await expect(rejection).rejects.toMatchObject({
        code: CONTRACTS_ERROR_CODES.CONTRACT_NOT_FOUND,
        category: 'USAGE',
        message: `No public state found at contract address '${mockContractAddress}'`
      });
    });
  });

  describe('getStates', () => {
    it('refuses a private state id under which nothing is stored as PrivateStateNotFoundError', async () => {
      mockProviders.publicDataProvider.queryZSwapAndContractState = vi.fn().mockResolvedValue(ledger9States());
      mockProviders.privateStateProvider.get = vi.fn().mockResolvedValue(null);

      const rejection = getStates(
        mockProviders.publicDataProvider,
        mockProviders.privateStateProvider,
        mockContractAddress,
        mockPrivateStateId
      );

      await expect(rejection).rejects.toBeInstanceOf(PrivateStateNotFoundError);
      await expect(rejection).rejects.toMatchObject({
        code: CONTRACTS_ERROR_CODES.PRIVATE_STATE_NOT_FOUND,
        category: 'USAGE',
        message: `No private state found at private state ID '${mockPrivateStateId}'`
      });
    });

    it.each([
      ['v9', ledger9States],
      ['v8', () => publicStatesReadStub('v8')]
    ] as const)('returns the %s public states as bytes, with the private state', async (_era, states) => {
      const served = states();
      mockProviders.publicDataProvider.queryZSwapAndContractState = vi.fn().mockResolvedValue(served);
      mockProviders.privateStateProvider.get = vi.fn().mockResolvedValue(mockPrivateState);

      const result = await getStates(
        mockProviders.publicDataProvider,
        mockProviders.privateStateProvider,
        mockContractAddress,
        mockPrivateStateId
      );

      expect(mockProviders.privateStateProvider.get).toHaveBeenCalledWith(mockPrivateStateId);
      expectSameRecord(result, served);
      expect(result.privateState).toBe(mockPrivateState);
    });
  });
});
