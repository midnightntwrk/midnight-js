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

import type { ShieldedCoinInfo } from '@midnight-ntwrk/compact-runtime';
import type { ImpureCircuitId } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitTx, type SubmitTxOptions } from '../submit-tx';
import {
  createMockCoinInfo,
  createMockFinalizedTxData,
  createMockProviders,
  createMockUnprovenTx
} from './test-mocks';

describe('submitTx', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockUnprovenTx: ReturnType<typeof createMockUnprovenTx>;
  let mockCoinInfo: ShieldedCoinInfo;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProviders = createMockProviders();
    mockUnprovenTx = createMockUnprovenTx();
    mockCoinInfo = createMockCoinInfo();
  });

  describe('happy path', () => {
    it('should successfully submit transaction without circuit ID', async () => {
      const mockBalancedTx = { balanced: true };
      const mockTxId = 'test-tx-id';
      const mockFinalizedTxData = createMockFinalizedTxData();

      const options: SubmitTxOptions<ImpureCircuitId> = {
        unprovenTx: mockUnprovenTx,
        newCoins: [mockCoinInfo]
      };

      mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockBalancedTx);
      mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockBalancedTx);
      mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue(mockTxId);
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

      const result = await submitTx(mockProviders, options);

      expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx, undefined);
      expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockBalancedTx, [mockCoinInfo]);
      expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalledWith(mockBalancedTx);
      expect(mockProviders.publicDataProvider.watchForTxData).toHaveBeenCalledWith(mockTxId);
      expect(result).toBe(mockFinalizedTxData);
    });

    it('should successfully submit transaction with circuit ID', async () => {
      const circuitId = 'testCircuit' as ImpureCircuitId;
      const mockZkConfig = { zkConfig: 'test-config' };
      const mockBalancedTx = { balanced: true };
      const mockTxId = 'test-tx-id';
      const mockFinalizedTxData = createMockFinalizedTxData();

      const options: SubmitTxOptions<ImpureCircuitId> = {
        unprovenTx: mockUnprovenTx,
        circuitId,
        newCoins: []
      };

      mockProviders.zkConfigProvider.get = vi.fn().mockResolvedValue(mockZkConfig);
      mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockBalancedTx);
      mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockBalancedTx);
      mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue(mockTxId);
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

      const result = await submitTx(mockProviders, options);

      expect(mockProviders.zkConfigProvider.get).toHaveBeenCalledWith(circuitId);
      expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx, { zkConfig: mockZkConfig });
      expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockBalancedTx, []);
      expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalledWith(mockBalancedTx);
      expect(mockProviders.publicDataProvider.watchForTxData).toHaveBeenCalledWith(mockTxId);
      expect(result).toBe(mockFinalizedTxData);
    });
  });
});
