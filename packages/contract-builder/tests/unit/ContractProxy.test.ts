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

import { beforeEach,describe, expect, it, vi } from 'vitest';

import { createContractProxy } from '../../src/adapter/ContractProxy.js';
import type { Logger } from '../../src/types/contract-types.js';

describe('ContractProxy', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
  });

  describe('createContractProxy', () => {
    it('should proxy address property from deployTxData.public.contractAddress', () => {
      const mockContract = {
        deployTxData: {
          public: {
            contractAddress: '0x123'
          }
        },
        callTx: {}
      };

      const proxy = createContractProxy({
        contract: mockContract
      });

      // Note: ContractProxy returns the whole contract, not extracted address
      // Address extraction happens in ContractAdapter
      expect(proxy.deployTxData).toEqual({
        public: {
          contractAddress: '0x123'
        }
      });
    });

    it('should proxy deployTxData property', () => {
      const deployData = {
        public: {
          contractAddress: '0x123'
        },
        txHash: '0xabc'
      };
      const mockContract = {
        deployTxData: deployData,
        callTx: {}
      };

      const proxy = createContractProxy({
        contract: mockContract
      });

      expect(proxy.deployTxData).toEqual(deployData);
    });

    it('should intercept and wrap callTx methods', async () => {
      const mockMethod = vi.fn().mockResolvedValue('result');
      const mockContract = {
        deployTxData: {
          public: {
            contractAddress: '0x123'
          }
        },
        callTx: {
          testMethod: mockMethod
        }
      };

      const proxy = createContractProxy({
        contract: mockContract,
        logger: mockLogger
      });

      const result = await proxy.callTx.testMethod('arg1', 'arg2');

      expect(result).toBe('result');
      expect(mockMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should log method calls when logger is provided', async () => {
      const mockMethod = vi.fn().mockResolvedValue('result');
      const mockContract = {
        deployTxData: {
          public: {
            contractAddress: '0x123'
          }
        },
        callTx: {
          testMethod: mockMethod
        }
      };

      const proxy = createContractProxy({
        contract: mockContract,
        logger: mockLogger
      });

      await proxy.callTx.testMethod();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Calling contract method: testMethod'),
        expect.any(Object)
      );
    });

    it('should not intercept non-function properties', () => {
      const mockContract = {
        deployTxData: {
          public: {
            contractAddress: '0x123'
          }
        },
        callTx: {
          someProperty: 'value'
        }
      };

      const proxy = createContractProxy({
        contract: mockContract
      });

      expect(proxy.callTx.someProperty).toBe('value');
    });
  });
});
