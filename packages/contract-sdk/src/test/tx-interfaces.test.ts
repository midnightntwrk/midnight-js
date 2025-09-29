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

import {
  createCallTxOptions,
  createCircuitCallTxInterface,
} from '../tx-interfaces';
import {
  createMockContract,
  createMockContractAddress,
  createMockPrivateStateId,
  createMockProviders
} from '@midnight-ntwrk/midnight-js-contract-mocks';

vi.mock('../submit-call-tx');
vi.mock('../submit-insert-vk-tx');
vi.mock('../submit-remove-vk-tx');
vi.mock('../submit-replace-authority-tx');

describe('tx-interfaces', () => {
  let mockContract: ReturnType<typeof createMockContract>;
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockPrivateStateId: ReturnType<typeof createMockPrivateStateId>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContract = createMockContract();
    mockProviders = createMockProviders();
    mockContractAddress = createMockContractAddress();
    mockPrivateStateId = createMockPrivateStateId();
  });

  describe('createCallTxOptions', () => {
    it('should create call tx options without args', () => {
      const circuitId = 'testCircuit';
      const options = createCallTxOptions(
        mockContract,
        circuitId,
        mockContractAddress,
        undefined,
        []
      );

      expect(options).toEqual({
        contract: mockContract,
        circuitId,
        contractAddress: mockContractAddress
      });
    });

    it('should create call tx options with args', () => {
      const circuitId = 'testCircuit';
      const args = ['arg1', 'arg2'];
      const options = createCallTxOptions(
        mockContract,
        circuitId,
        mockContractAddress,
        undefined,
        args as never[]
      );

      expect(options).toEqual({
        contract: mockContract,
        circuitId,
        contractAddress: mockContractAddress,
        args
      });
    });

    it('should create call tx options with private state ID', () => {
      const circuitId = 'testCircuit';
      const args = ['arg1'];
      const options = createCallTxOptions(
        mockContract,
        circuitId,
        mockContractAddress,
        mockPrivateStateId,
        args as never[]
      );

      expect(options).toEqual({
        contract: mockContract,
        circuitId,
        contractAddress: mockContractAddress,
        privateStateId: mockPrivateStateId,
        args
      });
    });
  });

  describe('createCircuitCallTxInterface', () => {
    it('should create circuit call interface without private state', () => {
      const callInterface = createCircuitCallTxInterface(
        mockProviders,
        mockContract,
        mockContractAddress,
        undefined
      );

      expect(callInterface).toHaveProperty('testCircuit');
      expect(typeof callInterface.testCircuit).toBe('function');
    });

    it('should create circuit call interface with private state', () => {
      const callInterface = createCircuitCallTxInterface(
        mockProviders,
        mockContract,
        mockContractAddress,
        mockPrivateStateId
      );

      expect(callInterface).toHaveProperty('testCircuit');
      expect(typeof callInterface.testCircuit).toBe('function');
    });
  });
});
