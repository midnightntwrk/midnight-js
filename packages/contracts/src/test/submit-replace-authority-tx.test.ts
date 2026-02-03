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

import { submitReplaceAuthorityTx } from '../submit-replace-authority-tx';
import { submitTx } from '../submit-tx';
import { createUnprovenReplaceAuthorityTx } from '../utils';
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

describe('submitReplaceAuthorityTx', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockCompiledContract: ReturnType<typeof createMockCompiledContract>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockContractState: ReturnType<typeof createMockContractState>;
  let mockCoinPublicKey: ReturnType<typeof createMockCoinPublicKey>;
  let mockCurrentAuthority: ReturnType<typeof createMockSigningKey>;
  let mockNewAuthority: ReturnType<typeof createMockSigningKey>;
  let mockUnprovenTx: Promise<ReturnType<typeof createMockUnprovenTx>>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockProviders = createMockProviders();
    mockCompiledContract = createMockCompiledContract();
    mockContractAddress = createMockContractAddress();
    mockContractState = createMockContractState();
    mockCoinPublicKey = createMockCoinPublicKey();
    mockCurrentAuthority = createMockSigningKey();
    mockNewAuthority = createMockSigningKey();
    mockUnprovenTx = Promise.resolve(createMockUnprovenTx());
  });

  describe('happy path', () => {
    it('should successfully submit replace authority transaction and update signing key', async () => {
      const mockFinalizedTxData = createMockFinalizedTxData();

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockProviders.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(mockCurrentAuthority);
      mockProviders.privateStateProvider.setSigningKey = vi.fn().mockResolvedValue(undefined);
      mockProviders.walletProvider.getCoinPublicKey = vi.fn().mockReturnValue(mockCoinPublicKey);
      
      vi.mocked(createUnprovenReplaceAuthorityTx).mockReturnValue(mockUnprovenTx);
      vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

      const replaceAuthorityFn = submitReplaceAuthorityTx(mockProviders, mockCompiledContract, mockContractAddress);
      const result = await replaceAuthorityFn(mockNewAuthority);

      expect(mockProviders.publicDataProvider.queryContractState).toHaveBeenCalledWith(mockContractAddress);
      expect(mockProviders.privateStateProvider.getSigningKey).toHaveBeenCalledWith(mockContractAddress);
      expect(createUnprovenReplaceAuthorityTx).toHaveBeenCalledWith(
        mockProviders.zkConfigProvider,
        mockCompiledContract,
        mockContractAddress,
        mockNewAuthority,
        mockContractState,
        mockCurrentAuthority,
        mockCoinPublicKey
      );
      expect(submitTx).toHaveBeenCalledWith(mockProviders, { unprovenTx: await mockUnprovenTx });
      expect(mockProviders.privateStateProvider.setSigningKey).toHaveBeenCalledWith(mockContractAddress, mockNewAuthority);
      expect(result).toBe(mockFinalizedTxData);
    });
  });

  describe('error scenarios', () => {
    it('should throw ReplaceMaintenanceAuthorityTxFailedError when transaction fails', async () => {
      const { ReplaceMaintenanceAuthorityTxFailedError } = await import('../errors');
      const { FailEntirely } = await import('@midnight-ntwrk/midnight-js-types');
      
      const failedTxData = createMockFinalizedTxData(FailEntirely);

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockProviders.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(mockCurrentAuthority);
      mockProviders.privateStateProvider.setSigningKey = vi.fn().mockResolvedValue(undefined);
      
      vi.mocked(createUnprovenReplaceAuthorityTx).mockReturnValue(mockUnprovenTx);
      vi.mocked(submitTx).mockResolvedValue(failedTxData);

      const replaceAuthorityFn = submitReplaceAuthorityTx(mockProviders, mockCompiledContract, mockContractAddress);
      
      await expect(replaceAuthorityFn(mockNewAuthority)).rejects.toThrow(ReplaceMaintenanceAuthorityTxFailedError);
    });
  });
});
