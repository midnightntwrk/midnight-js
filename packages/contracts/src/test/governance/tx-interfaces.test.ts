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

import type { VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from '../../governance/tx-interfaces';
import {
  createMockCompiledContract,
  createMockContractAddress,
  createMockFinalizedTxData,
  createMockProviders
} from '../test-mocks';

vi.mock('../../governance/submit-insert-vk-tx');
vi.mock('../../governance/submit-remove-vk-tx');
vi.mock('../../governance/submit-replace-authority-tx');

describe('governance/tx-interfaces', () => {
  let mockCompiledContract: ReturnType<typeof createMockCompiledContract>;
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockFinalizedTxData: ReturnType<typeof createMockFinalizedTxData>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCompiledContract = createMockCompiledContract();
    mockProviders = createMockProviders();
    mockContractAddress = createMockContractAddress();
    mockFinalizedTxData = createMockFinalizedTxData();
  });

  describe('createCircuitMaintenanceTxInterface', () => {
    it('should create circuit maintenance interface', () => {
      const circuitId = 'testCircuit';
      const maintenanceInterface = createCircuitMaintenanceTxInterface(
        mockProviders,
        circuitId,
        mockCompiledContract,
        mockContractAddress
      );

      expect(maintenanceInterface).toHaveProperty('removeVerifierKey');
      expect(maintenanceInterface).toHaveProperty('insertVerifierKey');
      expect(typeof maintenanceInterface.removeVerifierKey).toBe('function');
      expect(typeof maintenanceInterface.insertVerifierKey).toBe('function');
    });

    it('should call removeVerifierKey function', async () => {
      const circuitId = 'testCircuit';
      const maintenanceInterface = createCircuitMaintenanceTxInterface(
        mockProviders,
        circuitId,
        mockCompiledContract,
        mockContractAddress
      );

      const { submitRemoveVerifierKeyTx } = await import('../../governance/submit-remove-vk-tx');
      vi.mocked(submitRemoveVerifierKeyTx).mockResolvedValue(mockFinalizedTxData);

      const result = await maintenanceInterface.removeVerifierKey();

      expect(submitRemoveVerifierKeyTx).toHaveBeenCalledWith(
        mockProviders,
        mockCompiledContract,
        mockContractAddress,
        circuitId
      );
      expect(result).toBe(mockFinalizedTxData);
    });

    it('should call insertVerifierKey function', async () => {
      const circuitId = 'testCircuit';
      const mockVerifierKey = new Uint8Array(32) as VerifierKey;
      const maintenanceInterface = createCircuitMaintenanceTxInterface(
        mockProviders,
        circuitId,
        mockCompiledContract,
        mockContractAddress
      );

      const { submitInsertVerifierKeyTx } = await import('../../governance/submit-insert-vk-tx');
      vi.mocked(submitInsertVerifierKeyTx).mockResolvedValue(mockFinalizedTxData);

      const result = await maintenanceInterface.insertVerifierKey(mockVerifierKey);

      expect(submitInsertVerifierKeyTx).toHaveBeenCalledWith(
        mockProviders,
        mockCompiledContract,
        mockContractAddress,
        circuitId,
        mockVerifierKey
      );
      expect(result).toBe(mockFinalizedTxData);
    });
  });

  describe('createCircuitMaintenanceTxInterfaces', () => {
    it('should create maintenance interfaces for all circuits', () => {
      const interfaces = createCircuitMaintenanceTxInterfaces(
        mockProviders,
        mockCompiledContract,
        mockContractAddress
      );

      expect(interfaces).toHaveProperty('testCircuit');
      expect(interfaces.testCircuit).toHaveProperty('removeVerifierKey');
      expect(interfaces.testCircuit).toHaveProperty('insertVerifierKey');
    });
  });

  describe('createContractMaintenanceTxInterface', () => {
    it('should create contract maintenance interface', () => {
      const contractInterface = createContractMaintenanceTxInterface(
        mockProviders,
        mockCompiledContract,
        mockContractAddress
      );

      expect(contractInterface).toBeDefined();
      expect(contractInterface).toBeTypeOf('object');
    });
  });
});
