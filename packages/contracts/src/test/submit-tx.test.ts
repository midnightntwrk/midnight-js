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

import type { ImpureCircuitId } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitTx, type SubmitTxOptions } from '../submit-tx';
import {
  createMockFinalizedTxData,
  createMockProvenTx,
  createMockProviders,
  createMockUnprovenTx
} from './test-mocks';

describe('submitTx', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockUnprovenTx: ReturnType<typeof createMockUnprovenTx>;
  let mockProvenTx: ReturnType<typeof createMockProvenTx>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProviders = createMockProviders();
    mockUnprovenTx = createMockUnprovenTx();
    mockProvenTx = createMockProvenTx();
  });

  describe('happy path', () => {
    it('should successfully submit transaction without circuit ID', async () => {
      const mockRecipe = { type: 'TransactionToProve' as const, transaction: mockProvenTx };
      const mockFinalizedTxData = createMockFinalizedTxData();
      const mockIdentifier = 'test-identifier';

      mockProvenTx.identifiers = vi.fn().mockReturnValue([mockIdentifier]);
      mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockRecipe);
      mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
      mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

      const options: SubmitTxOptions<ImpureCircuitId> = {
        unprovenTx: mockUnprovenTx,
      };

      const result = await submitTx(mockProviders, options);

      expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockUnprovenTx, undefined);
      expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockProvenTx, undefined);
      expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
      expect(mockProviders.publicDataProvider.watchForTxData).toHaveBeenCalledWith(mockIdentifier);
      expect(result).toBe(mockFinalizedTxData);
    });

    it('should successfully submit transaction with circuit ID', async () => {
      const circuitId = 'testCircuit' as ImpureCircuitId;
      const mockZkConfig = { zkConfig: 'test-config' };
      const mockRecipe = { type: 'TransactionToProve' as const, transaction: mockProvenTx };
      const mockFinalizedTxData = createMockFinalizedTxData();
      const mockIdentifier = 'test-identifier';

      mockProvenTx.identifiers = vi.fn().mockReturnValue([mockIdentifier]);
      mockProviders.zkConfigProvider.get = vi.fn().mockResolvedValue(mockZkConfig);
      mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockRecipe);
      mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
      mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

      const options: SubmitTxOptions<ImpureCircuitId> = {
        unprovenTx: mockUnprovenTx,
        circuitId
      };

      const result = await submitTx(mockProviders, options);

      expect(mockProviders.zkConfigProvider.get).toHaveBeenCalledWith(circuitId);
      expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockUnprovenTx, undefined);
      expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockProvenTx, { zkConfig: mockZkConfig });
      expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
      expect(mockProviders.publicDataProvider.watchForTxData).toHaveBeenCalledWith(mockIdentifier);
      expect(result).toBe(mockFinalizedTxData);
    });
  });
});
