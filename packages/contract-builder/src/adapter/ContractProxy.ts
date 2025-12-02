/**
 * Dynamic proxy for contract methods with interceptors
 */

import type { Logger, RetryConfig, MethodCallEvent, MethodSuccessEvent, MethodErrorEvent } from '../types/contract-types.js';
import { MethodCallError } from '../errors/AdapterError.js';
import { withRetry } from '../utils/retry-logic.js';
import { isFunction } from '../utils/type-helpers.js';

/**
 * Options for creating a contract proxy
 */
export interface ContractProxyOptions {
  /** Deployed contract instance */
  contract: any;

  /** Optional logger */
  logger?: Logger;

  /** Optional retry configuration */
  retryConfig?: RetryConfig;

  /** Optional custom error handler */
  errorHandler?: (error: any) => void;

  /** Event emitter for method lifecycle events */
  eventEmitter: EventEmitter;
}

/**
 * Simple event emitter for contract events
 */
export class EventEmitter {
  private handlers: Map<string, Function[]> = new Map();

  on(event: string, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: string, data: any): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}

/**
 * Creates a dynamic proxy that intercepts all method calls on the deployed contract
 */
export function createContractProxy<TContract>(
  options: ContractProxyOptions
): TContract & { address: string; deployTxData: any } {
  const { contract, logger, retryConfig, errorHandler, eventEmitter } = options;

  // Create a proxy that intercepts method calls
  const proxy = new Proxy(contract, {
    get(target: any, prop: string | symbol) {
      // Handle special properties
      if (prop === 'address') {
        return target.address;
      }

      if (prop === 'deployTxData') {
        return target.deployTxData;
      }

      // Handle callTx methods
      if (prop === 'callTx') {
        return createCallTxProxy(target.callTx, {
          logger,
          retryConfig,
          errorHandler,
          eventEmitter
        });
      }

      // Forward other property access
      return target[prop];
    }
  });

  return proxy as TContract & { address: string; deployTxData: any };
}

/**
 * Creates a proxy for the callTx object that intercepts method calls
 */
function createCallTxProxy(
  callTx: any,
  options: {
    logger?: Logger;
    retryConfig?: RetryConfig;
    errorHandler?: (error: any) => void;
    eventEmitter: EventEmitter;
  }
): any {
  const { logger, retryConfig, errorHandler, eventEmitter } = options;

  return new Proxy(callTx, {
    get(target: any, methodName: string | symbol) {
      const originalMethod = target[methodName];

      // If not a function, just return the property
      if (!isFunction(originalMethod)) {
        return originalMethod;
      }

      // Return wrapped method
      return async function (...args: any[]) {
        const startTime = Date.now();
        const methodNameStr = String(methodName);

        // Emit 'call' event
        const callEvent: MethodCallEvent = {
          methodName: methodNameStr,
          args,
          timestamp: startTime
        };
        eventEmitter.emit('call', callEvent);

        logger?.info(`Calling contract method: ${methodNameStr}`, { args });

        try {
          // Execute with retry if configured
          const result = retryConfig
            ? await withRetry(
                () => originalMethod.apply(target, args),
                retryConfig,
                logger,
                `${methodNameStr}`
              )
            : await originalMethod.apply(target, args);

          const duration = Date.now() - startTime;

          // Emit 'success' event
          const successEvent: MethodSuccessEvent = {
            methodName: methodNameStr,
            args,
            result,
            duration,
            timestamp: Date.now()
          };
          eventEmitter.emit('success', successEvent);

          logger?.info(`Contract method ${methodNameStr} succeeded`, {
            duration: `${duration}ms`
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          // Create structured error
          const methodError = new MethodCallError(
            `Contract method ${methodNameStr} failed: ${error instanceof Error ? error.message : String(error)}`,
            methodNameStr,
            args,
            error instanceof Error ? error : undefined
          );

          // Emit 'error' event
          const errorEvent: MethodErrorEvent = {
            methodName: methodNameStr,
            args,
            error: methodError,
            duration,
            timestamp: Date.now()
          };
          eventEmitter.emit('error', errorEvent);

          logger?.error(`Contract method ${methodNameStr} failed`, {
            error: methodError,
            duration: `${duration}ms`
          });

          // Call custom error handler if provided
          if (errorHandler) {
            try {
              errorHandler(methodError);
            } catch (handlerError) {
              logger?.error('Error handler threw an error', { error: handlerError });
            }
          }

          throw methodError;
        }
      };
    }
  });
}
