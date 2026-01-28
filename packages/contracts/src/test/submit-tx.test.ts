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

import type { Contract } from '@midnight-ntwrk/compact-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitTx, submitTxAsync, type SubmitTxOptions } from '../submit-tx';
import {
  createMockFinalizedTxData,
  createMockProvenTx,
  createMockProviders,
  createMockUnprovenTx
} from './test-mocks';

describe('submit-tx', () => {
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
        const mockFinalizedTxData = createMockFinalizedTxData();

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

        const options: SubmitTxOptions<Contract.ImpureCircuitId<Contract.Any>> = {
          unprovenTx: mockUnprovenTx,
        };

        const result = await submitTx(mockProviders, options);

        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx);
        expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockProvenTx);
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
        expect(mockProviders.publicDataProvider.watchForTxData).toHaveBeenCalledWith('test-tx-id');
        expect(result).toBe(mockFinalizedTxData);
      });

      it('should successfully submit transaction with circuit ID', async () => {
        const circuitId = 'testCircuit' as Contract.ImpureCircuitId<Contract.Any>;
        const mockFinalizedTxData = createMockFinalizedTxData();

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

        const options: SubmitTxOptions<Contract.ImpureCircuitId<Contract.Any>> = {
          unprovenTx: mockUnprovenTx,
          circuitId
        };

        const result = await submitTx(mockProviders, options);

        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx);
        expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockProvenTx);
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
        expect(mockProviders.publicDataProvider.watchForTxData).toHaveBeenCalledWith('test-tx-id');
        expect(result).toBe(mockFinalizedTxData);
      });
    });
  });

  describe('submitTxAsync', () => {
    let mockProviders: ReturnType<typeof createMockProviders>;
    let mockUnprovenTx: ReturnType<typeof createMockUnprovenTx>;
    let mockProvenTx: ReturnType<typeof createMockProvenTx>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockProviders = createMockProviders();
      mockUnprovenTx = createMockUnprovenTx();
      mockProvenTx = createMockProvenTx();
    });

    describe('successful submission', () => {
      it('should submit transaction and return txId without waiting for finalization', async () => {
        const expectedTxId = 'test-tx-id';

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue(expectedTxId);

        const options: SubmitTxOptions<Contract.ImpureCircuitId<Contract.Any>> = {
          unprovenTx: mockUnprovenTx,
        };

        const result = await submitTxAsync(mockProviders, options);

        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx);
        expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockProvenTx);
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
        expect(mockProviders.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
        expect(result).toBe(expectedTxId);
      });

      it('should submit transaction with circuit ID and return txId', async () => {
        const circuitId = 'testCircuit' as Contract.ImpureCircuitId<Contract.Any>;
        const expectedTxId = 'test-tx-id-with-circuit';

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue(expectedTxId);

        const options: SubmitTxOptions<Contract.ImpureCircuitId<Contract.Any>> = {
          unprovenTx: mockUnprovenTx,
          circuitId
        };

        const result = await submitTxAsync(mockProviders, options);

        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx);
        expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockProvenTx);
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
        expect(mockProviders.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
        expect(result).toBe(expectedTxId);
      });

    });

    describe('error handling', () => {
      it('should propagate balanceTx errors', async () => {
        const balanceError = new Error('Balance transaction failed');
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockRejectedValue(balanceError);

        const options: SubmitTxOptions<Contract.ImpureCircuitId<Contract.Any>> = {
          unprovenTx: mockUnprovenTx,
        };

        await expect(submitTxAsync(mockProviders, options)).rejects.toThrow('Balance transaction failed');
        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx);
        expect(mockProviders.midnightProvider.submitTx).not.toHaveBeenCalled();
      });

      it('should propagate proveTx errors', async () => {
        const proveError = new Error('Proof generation failed');

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockRejectedValue(proveError);

        const options: SubmitTxOptions<Contract.ImpureCircuitId<Contract.Any>> = {
          unprovenTx: mockUnprovenTx,
        };

        await expect(submitTxAsync(mockProviders, options)).rejects.toThrow('Proof generation failed');
        expect(mockProviders.midnightProvider.submitTx).not.toHaveBeenCalled();
      });

      it('should propagate submitTx errors', async () => {
        const submitError = new Error('Network submission failed');

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockRejectedValue(submitError);

        const options: SubmitTxOptions<Contract.ImpureCircuitId<Contract.Any>> = {
          unprovenTx: mockUnprovenTx,
        };

        await expect(submitTxAsync(mockProviders, options)).rejects.toThrow('Network submission failed');
      });
    });
  });
});
