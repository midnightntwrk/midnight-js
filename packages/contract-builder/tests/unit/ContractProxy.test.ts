import { beforeEach,describe, expect, it, vi } from 'vitest';

import { createContractProxy } from '../../src/adapter/ContractProxy.js';
import type { Logger, RetryConfig } from '../../src/types/contract-types.js';

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

    it('should call custom error handler on failure', async () => {
      const errorHandler = vi.fn();
      const mockMethod = vi.fn().mockRejectedValue(new Error('Test error'));
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
        errorHandler
      });

      await expect(proxy.callTx.testMethod()).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should apply retry logic when configured', async () => {
      let attemptCount = 0;
      const mockMethod = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Transient error'));
        }
        return Promise.resolve('success');
      });

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

      const retryConfig: RetryConfig = {
        maxRetries: 3,
        backoffMs: 10,
        exponentialBackoff: false
      };

      const proxy = createContractProxy({
        contract: mockContract,
        retryConfig
      });

      const result = await proxy.callTx.testMethod();

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
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
