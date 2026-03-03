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

import { type VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitInsertVerifierKeyTx } from '../submit-insert-vk-tx';
import { submitTx } from '../submit-tx';
import { createUnprovenInsertVerifierKeyTx } from '../utils';
import {
  createMockCoinPublicKey,
  createMockCompiledContract,
  createMockContractAddress,
  createMockContractState,
  createMockFinalizedTxData,
  createMockProviders,
  createMockSigningKey,
  createMockUnprovenTx
} from './test-mocks';

vi.mock('../submit-tx');
vi.mock('../utils');

describe('submitInsertVerifierKeyTx', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockCompiledContract: ReturnType<typeof createMockCompiledContract>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockContractState: ReturnType<typeof createMockContractState>;
  let mockSigningKey: ReturnType<typeof createMockSigningKey>;
  let mockCoinPublicKey: ReturnType<typeof createMockCoinPublicKey>;
  let mockUnprovenTx: Promise<ReturnType<typeof createMockUnprovenTx>>;
  let mockVerifierKey: VerifierKey;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockProviders = createMockProviders();
    mockCompiledContract = createMockCompiledContract();
    mockContractAddress = createMockContractAddress();
    mockContractState = createMockContractState();
    mockSigningKey = createMockSigningKey();
    mockCoinPublicKey = createMockCoinPublicKey();
    mockUnprovenTx = Promise.resolve(createMockUnprovenTx());
    mockVerifierKey = new Uint8Array(32) as VerifierKey;
  });

  describe('happy path', () => {
    it('should successfully submit insert verifier key transaction', async () => {
      const circuitId = 'testCircuit';
      const mockFinalizedTxData = createMockFinalizedTxData();

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockProviders.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(mockSigningKey);
      mockProviders.walletProvider.getCoinPublicKey = vi.fn().mockReturnValue(mockCoinPublicKey);
      mockContractState.operation = vi.fn().mockReturnValue(undefined);
      
      vi.mocked(createUnprovenInsertVerifierKeyTx).mockReturnValue(mockUnprovenTx);
      vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

      const result = await submitInsertVerifierKeyTx(
        mockProviders,
        mockCompiledContract,
        mockContractAddress,
        circuitId,
        mockVerifierKey
      );

      expect(mockProviders.publicDataProvider.queryContractState).toHaveBeenCalledWith(mockContractAddress);
      expect(mockProviders.privateStateProvider.getSigningKey).toHaveBeenCalledWith(mockContractAddress);
      expect(mockContractState.operation).toHaveBeenCalledWith(circuitId);
      expect(createUnprovenInsertVerifierKeyTx).toHaveBeenCalledWith(
        mockProviders.zkConfigProvider,
        mockCompiledContract,
        mockContractAddress,
        circuitId,
        mockVerifierKey,
        mockContractState,
        mockSigningKey,
        mockCoinPublicKey
      );
      expect(submitTx).toHaveBeenCalledWith(mockProviders, { unprovenTx: await mockUnprovenTx });
      expect(result).toBe(mockFinalizedTxData);
    });
  });

  describe('error scenarios', () => {
    it('should throw InsertVerifierKeyTxFailedError when transaction fails', async () => {
      const { InsertVerifierKeyTxFailedError } = await import('../errors');
      const { FailEntirely } = await import('@midnight-ntwrk/midnight-js-types');
      
      const circuitId = 'testCircuit';
      const failedTxData = createMockFinalizedTxData(FailEntirely);

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockProviders.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(mockSigningKey);
      mockContractState.operation = vi.fn().mockReturnValue(undefined);
      
      vi.mocked(createUnprovenInsertVerifierKeyTx).mockReturnValue(mockUnprovenTx);
      vi.mocked(submitTx).mockResolvedValue(failedTxData);

      await expect(
        submitInsertVerifierKeyTx(mockProviders, mockCompiledContract, mockContractAddress, circuitId, mockVerifierKey)
      ).rejects.toThrow(InsertVerifierKeyTxFailedError);
    });
  });
});
