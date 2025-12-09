import { beforeEach,describe, expect, it, vi } from 'vitest';

import { createContractProxy, EventEmitter } from '../../src/adapter/ContractProxy.js';
import type { Logger, RetryConfig } from '../../src/types/contract-types.js';

describe('ContractProxy', () => {
  let mockLogger: Logger;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    eventEmitter = new EventEmitter();
  });

  describe('EventEmitter', () => {
    it('should register and emit events', () => {
      const handler = vi.fn();
      eventEmitter.on('test', handler);
      eventEmitter.emit('test', { data: 'value' });

      expect(handler).toHaveBeenCalledWith({ data: 'value' });
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventEmitter.on('test', handler1);
      eventEmitter.on('test', handler2);
      eventEmitter.emit('test', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should handle errors in event handlers gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const throwingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      eventEmitter.on('test', throwingHandler);
      eventEmitter.emit('test', 'data');

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('createContractProxy', () => {
    it('should proxy address property', () => {
      const mockContract = {
        address: '0x123',
        deployTxData: {},
        callTx: {}
      };

      const proxy = createContractProxy({
        contract: mockContract,
        eventEmitter
      });

      expect(proxy.address).toBe('0x123');
    });

    it('should proxy deployTxData property', () => {
      const deployData = { txHash: '0xabc' };
      const mockContract = {
        address: '0x123',
        deployTxData: deployData,
        callTx: {}
      };

      const proxy = createContractProxy({
        contract: mockContract,
        eventEmitter
      });

      expect(proxy.deployTxData).toEqual(deployData);
    });

    it('should intercept and wrap callTx methods', async () => {
      const mockMethod = vi.fn().mockResolvedValue('result');
      const mockContract = {
        address: '0x123',
        deployTxData: {},
        callTx: {
          testMethod: mockMethod
        }
      };

      const proxy = createContractProxy({
        contract: mockContract,
        logger: mockLogger,
        eventEmitter
      });

      const result = await proxy.callTx.testMethod('arg1', 'arg2');

      expect(result).toBe('result');
      expect(mockMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should emit call event when method is invoked', async () => {
      const callHandler = vi.fn();
      eventEmitter.on('call', callHandler);

      const mockMethod = vi.fn().mockResolvedValue('result');
      const mockContract = {
        address: '0x123',
        deployTxData: {},
        callTx: {
          testMethod: mockMethod
        }
      };

      const proxy = createContractProxy({
        contract: mockContract,
        eventEmitter
      });

      await proxy.callTx.testMethod('arg1');

      expect(callHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          methodName: 'testMethod',
          args: ['arg1'],
          timestamp: expect.any(Number)
        })
      );
    });

    it('should emit success event when method succeeds', async () => {
      const successHandler = vi.fn();
      eventEmitter.on('success', successHandler);

      const mockMethod = vi.fn().mockResolvedValue('result');
      const mockContract = {
        address: '0x123',
        deployTxData: {},
        callTx: {
          testMethod: mockMethod
        }
      };

      const proxy = createContractProxy({
        contract: mockContract,
        eventEmitter
      });

      await proxy.callTx.testMethod();

      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          methodName: 'testMethod',
          result: 'result',
          duration: expect.any(Number)
        })
      );
    });

    it('should emit error event when method fails', async () => {
      const errorHandler = vi.fn();
      eventEmitter.on('error', errorHandler);

      const mockMethod = vi.fn().mockRejectedValue(new Error('Test error'));
      const mockContract = {
        address: '0x123',
        deployTxData: {},
        callTx: {
          testMethod: mockMethod
        }
      };

      const proxy = createContractProxy({
        contract: mockContract,
        eventEmitter
      });

      await expect(proxy.callTx.testMethod()).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          methodName: 'testMethod',
          error: expect.any(Error),
          duration: expect.any(Number)
        })
      );
    });

    it('should log method calls when logger is provided', async () => {
      const mockMethod = vi.fn().mockResolvedValue('result');
      const mockContract = {
        address: '0x123',
        deployTxData: {},
        callTx: {
          testMethod: mockMethod
        }
      };

      const proxy = createContractProxy({
        contract: mockContract,
        logger: mockLogger,
        eventEmitter
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
        address: '0x123',
        deployTxData: {},
        callTx: {
          testMethod: mockMethod
        }
      };

      const proxy = createContractProxy({
        contract: mockContract,
        errorHandler,
        eventEmitter
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
        address: '0x123',
        deployTxData: {},
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
        retryConfig,
        eventEmitter
      });

      const result = await proxy.callTx.testMethod();

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should not intercept non-function properties', () => {
      const mockContract = {
        address: '0x123',
        deployTxData: {},
        callTx: {
          someProperty: 'value'
        }
      };

      const proxy = createContractProxy({
        contract: mockContract,
        eventEmitter
      });

      expect(proxy.callTx.someProperty).toBe('value');
    });
  });
});
