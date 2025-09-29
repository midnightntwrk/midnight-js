/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitRemoveVerifierKeyTx } from '../submit-remove-vk-tx';
import { submitTx } from '../submit-tx';
import { createUnprovenRemoveVerifierKeyTx } from '../utils';
import {
  createMockContractAddress,
  createMockContractState,
  createMockFinalizedTxData,
  createMockProviders,
  createMockSigningKey,
  createMockUnprovenTx
} from './test-mocks';

vi.mock('../submit-tx');
vi.mock('../utils');

describe('submitRemoveVerifierKeyTx', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockContractState: ReturnType<typeof createMockContractState>;
  let mockSigningKey: ReturnType<typeof createMockSigningKey>;
  let mockUnprovenTx: ReturnType<typeof createMockUnprovenTx>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockProviders = createMockProviders();
    mockContractAddress = createMockContractAddress();
    mockContractState = createMockContractState();
    mockSigningKey = createMockSigningKey();
    mockUnprovenTx = createMockUnprovenTx();
  });

  describe('happy path', () => {
    it('should successfully submit remove verifier key transaction', async () => {
      const circuitId = 'testCircuit';
      const mockFinalizedTxData = createMockFinalizedTxData();
      const mockOperation = { verifierKey: new Uint8Array(32) };

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockProviders.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(mockSigningKey);
      mockContractState.operation = vi.fn().mockReturnValue(mockOperation);
      
      vi.mocked(createUnprovenRemoveVerifierKeyTx).mockReturnValue(mockUnprovenTx);
      vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

      const result = await submitRemoveVerifierKeyTx(
        mockProviders,
        mockContractAddress,
        circuitId
      );

      expect(mockProviders.publicDataProvider.queryContractState).toHaveBeenCalledWith(mockContractAddress);
      expect(mockProviders.privateStateProvider.getSigningKey).toHaveBeenCalledWith(mockContractAddress);
      expect(mockContractState.operation).toHaveBeenCalledWith(circuitId);
      expect(createUnprovenRemoveVerifierKeyTx).toHaveBeenCalledWith(
        mockContractAddress,
        circuitId,
        mockContractState,
        mockSigningKey
      );
      expect(submitTx).toHaveBeenCalledWith(mockProviders, { unprovenTx: mockUnprovenTx });
      expect(result).toBe(mockFinalizedTxData);
    });
  });

  describe('error scenarios', () => {
    it('should throw RemoveVerifierKeyTxFailedError when transaction fails', async () => {
      const { RemoveVerifierKeyTxFailedError } = await import('../errors');
      const { FailEntirely } = await import('@midnight-ntwrk/midnight-js-types');
      
      const circuitId = 'testCircuit';
      const failedTxData = createMockFinalizedTxData(FailEntirely);
      const mockOperation = { verifierKey: new Uint8Array(32) };

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockProviders.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(mockSigningKey);
      mockContractState.operation = vi.fn().mockReturnValue(mockOperation);
      
      vi.mocked(createUnprovenRemoveVerifierKeyTx).mockReturnValue(mockUnprovenTx);
      vi.mocked(submitTx).mockResolvedValue(failedTxData);

      await expect(
        submitRemoveVerifierKeyTx(mockProviders, mockContractAddress, circuitId)
      ).rejects.toThrow(RemoveVerifierKeyTxFailedError);
    });
  });
});
