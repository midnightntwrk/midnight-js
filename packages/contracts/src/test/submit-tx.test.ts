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

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { AnyProvableCircuitId } from '@midnight-ntwrk/midnight-js-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { submitTx, submitTxAsync, type SubmitTxOptions } from '../submit-tx';
import { createMockFinalizedTxData, createMockProvenTx, createMockProviders, createMockUnprovenTx } from './test-mocks';

describe('submit-tx', () => {
  it('submit-tx.ts imports no filesystem API', () => {
    const source = readFileSync(fileURLToPath(new URL('../submit-tx.ts', import.meta.url)), 'utf8');
    expect(source).not.toMatch(/(?:from|require\(|import\()\s*['"](?:node:)?fs(?:\/promises)?['"]/);
  });

  describe('submitTx', () => {
    let mockProviders: ReturnType<typeof createMockProviders>;
    let mockUnprovenTx: ReturnType<typeof createMockUnprovenTx>;
    let mockProvenTx: ReturnType<typeof createMockProvenTx>;
    let originalMnDebug: string | undefined;

    beforeEach(() => {
      vi.clearAllMocks();

      mockProviders = createMockProviders();
      mockUnprovenTx = createMockUnprovenTx();
      mockProvenTx = createMockProvenTx();
      originalMnDebug = process.env.MN_DEBUG;
    });

    afterEach(() => {
      // Restore any vi.spyOn (e.g. console spies in the debug-logging test) so stubs do
      // not leak into subsequent tests; clearAllMocks alone does not un-spy.
      vi.restoreAllMocks();
      if (originalMnDebug === undefined) {
        delete process.env.MN_DEBUG;
      } else {
        process.env.MN_DEBUG = originalMnDebug;
      }
    });

    describe('happy path', () => {
      it('should successfully submit transaction without circuit ID', async () => {
        const mockFinalizedTxData = createMockFinalizedTxData();

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

        const options: SubmitTxOptions<AnyProvableCircuitId> = {
          unprovenTx: mockUnprovenTx
        };

        const result = await submitTx(mockProviders, options);

        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx);
        expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockProvenTx);
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
        expect(mockProviders.publicDataProvider.watchForTxData).toHaveBeenCalledWith('test-tx-id');
        expect(result).toBe(mockFinalizedTxData);
      });

      it('should successfully submit transaction with circuit ID', async () => {
        const circuitId = 'testCircuit';
        const mockFinalizedTxData = createMockFinalizedTxData();

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

        const options: SubmitTxOptions<AnyProvableCircuitId> = {
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

      it('submits successfully with debug logging enabled even if serialization throws', async () => {
        // __DEBUG__ is compiled to `true` in this package's vitest config, so MN_DEBUG=true
        // forces the debug-logging branch in logTransaction to run. That branch must never
        // break submission — its serialization is wrapped in try/catch and emits only to
        // the console (no filesystem writes; see the source-level invariant above).
        process.env.MN_DEBUG = 'true';
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const mockFinalizedTxData = createMockFinalizedTxData();
        mockProvenTx.serialize = vi.fn().mockImplementation(() => {
          throw new Error('serialize boom');
        });

        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

        const options: SubmitTxOptions<AnyProvableCircuitId> = {
          unprovenTx: mockUnprovenTx,
          circuitId: 'testCircuit'
        };

        const result = await submitTx(mockProviders, options);

        // Debug branch ran (serialization was attempted and its failure was swallowed)...
        expect(mockProvenTx.serialize).toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalled();
        // ...and submission still succeeded.
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
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

        const options: SubmitTxOptions<AnyProvableCircuitId> = {
          unprovenTx: mockUnprovenTx
        };

        const result = await submitTxAsync(mockProviders, options);

        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx);
        expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(mockProvenTx);
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
        expect(mockProviders.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
        expect(result).toBe(expectedTxId);
      });

      it('should submit transaction with circuit ID and return txId', async () => {
        const circuitId = 'testCircuit';
        const expectedTxId = 'test-tx-id-with-circuit';

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue(expectedTxId);

        const options: SubmitTxOptions<AnyProvableCircuitId> = {
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

        const options: SubmitTxOptions<AnyProvableCircuitId> = {
          unprovenTx: mockUnprovenTx
        };

        await expect(submitTxAsync(mockProviders, options)).rejects.toThrow('Balance transaction failed');
        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(mockUnprovenTx);
        expect(mockProviders.midnightProvider.submitTx).not.toHaveBeenCalled();
      });

      it('should propagate proveTx errors', async () => {
        const proveError = new Error('Proof generation failed');

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockRejectedValue(proveError);

        const options: SubmitTxOptions<AnyProvableCircuitId> = {
          unprovenTx: mockUnprovenTx
        };

        await expect(submitTxAsync(mockProviders, options)).rejects.toThrow('Proof generation failed');
        expect(mockProviders.midnightProvider.submitTx).not.toHaveBeenCalled();
      });

      it('should propagate submitTx errors', async () => {
        const submitError = new Error('Network submission failed');

        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(mockProvenTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockRejectedValue(submitError);

        const options: SubmitTxOptions<AnyProvableCircuitId> = {
          unprovenTx: mockUnprovenTx
        };

        await expect(submitTxAsync(mockProviders, options)).rejects.toThrow('Network submission failed');
      });
    });
  });
});
