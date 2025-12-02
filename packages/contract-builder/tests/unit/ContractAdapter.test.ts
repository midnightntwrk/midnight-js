import { beforeEach,describe, expect, it, vi } from 'vitest';

import { ContractAdapter } from '../../src/adapter/ContractAdapter.js';
import type { AdapterConfig } from '../../src/types/adapter-types.js';
import type { DeployedContract, Logger } from '../../src/types/contract-types.js';

describe('ContractAdapter', () => {
  let mockDeployedContract: DeployedContract<any>;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    mockDeployedContract = {
      address: '0x123456789',
      deployTxData: { txHash: '0xabc' },
      callTx: {
        increment: vi.fn().mockResolvedValue({ success: true }),
        getValue: vi.fn().mockResolvedValue(42)
      }
    };
  });

  describe('constructor', () => {
    it('should create adapter with default config', () => {
      const adapter = new ContractAdapter(mockDeployedContract);

      expect(adapter.address).toBe('0x123456789');
      expect(adapter.deployTxData).toEqual({ txHash: '0xabc' });
    });

    it('should create adapter with custom config', () => {
      const config: AdapterConfig = {
        logger: mockLogger,
        retry: {
          maxRetries: 5,
          backoffMs: 2000
        }
      };

      const adapter = new ContractAdapter(mockDeployedContract, config);

      expect(adapter.address).toBe('0x123456789');
    });
  });

  describe('method proxying', () => {
    it('should proxy contract methods', async () => {
      const adapter = new ContractAdapter(mockDeployedContract);

      const result = await (adapter as any).increment();

      expect(result).toEqual({ success: true });
      expect(mockDeployedContract.callTx.increment).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to proxied methods', async () => {
      const adapter = new ContractAdapter(mockDeployedContract);

      await (adapter as any).getValue();

      expect(mockDeployedContract.callTx.getValue).toHaveBeenCalledTimes(1);
    });
  });

  describe('event handlers', () => {
    it('should register and trigger call event handlers', async () => {
      const callHandler = vi.fn();
      const adapter = new ContractAdapter(mockDeployedContract);

      (adapter as any).on('call', callHandler);
      await (adapter as any).increment();

      expect(callHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          methodName: 'increment',
          args: []
        })
      );
    });

    it('should register and trigger success event handlers', async () => {
      const successHandler = vi.fn();
      const adapter = new ContractAdapter(mockDeployedContract);

      (adapter as any).on('success', successHandler);
      await (adapter as any).increment();

      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          methodName: 'increment',
          result: { success: true }
        })
      );
    });

    it('should register and trigger error event handlers', async () => {
      const errorHandler = vi.fn();
      mockDeployedContract.callTx.increment = vi.fn().mockRejectedValue(
        new Error('Test error')
      );

      const adapter = new ContractAdapter(mockDeployedContract);

      (adapter as any).on('error', errorHandler);

      await expect((adapter as any).increment()).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          methodName: 'increment',
          error: expect.any(Error)
        })
      );
    });

    it('should support multiple event handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const adapter = new ContractAdapter(mockDeployedContract);

      (adapter as any).on('call', handler1);
      (adapter as any).on('call', handler2);

      await (adapter as any).increment();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('should log method calls when logger is provided', async () => {
      const config: AdapterConfig = { logger: mockLogger };
      const adapter = new ContractAdapter(mockDeployedContract, config);

      await (adapter as any).increment();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Calling contract method: increment'),
        expect.any(Object)
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('succeeded'),
        expect.any(Object)
      );
    });

    it('should log errors when method fails', async () => {
      const config: AdapterConfig = { logger: mockLogger };
      mockDeployedContract.callTx.increment = vi.fn().mockRejectedValue(
        new Error('Test error')
      );

      const adapter = new ContractAdapter(mockDeployedContract, config);

      await expect((adapter as any).increment()).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should call custom error handler on failure', async () => {
      const errorHandler = vi.fn();
      const config: AdapterConfig = { errorHandler };

      mockDeployedContract.callTx.increment = vi.fn().mockRejectedValue(
        new Error('Test error')
      );

      const adapter = new ContractAdapter(mockDeployedContract, config);

      await expect((adapter as any).increment()).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should wrap errors with method context', async () => {
      mockDeployedContract.callTx.increment = vi.fn().mockRejectedValue(
        new Error('Original error')
      );

      const adapter = new ContractAdapter(mockDeployedContract);

      try {
        await (adapter as any).increment();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.methodName).toBe('increment');
        expect(error.message).toContain('increment');
        expect(error.message).toContain('failed');
      }
    });
  });

  describe('retry logic', () => {
    it('should retry failed operations when configured', async () => {
      let attemptCount = 0;
      mockDeployedContract.callTx.increment = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Transient error'));
        }
        return Promise.resolve({ success: true });
      });

      const config: AdapterConfig = {
        retry: {
          maxRetries: 3,
          backoffMs: 10,
          exponentialBackoff: false
        }
      };

      const adapter = new ContractAdapter(mockDeployedContract, config);

      const result = await (adapter as any).increment();

      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(3);
    });
  });
});
