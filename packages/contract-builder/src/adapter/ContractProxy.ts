/**
 * Dynamic proxy for contract methods with interceptors
 */

import { MethodCallError } from '../errors/AdapterError.js';
import type { DeployedContract,Logger, MethodCallEvent, MethodErrorEvent, MethodSuccessEvent, RetryConfig } from '../types/contract-types.js';
import type { ErrorHandler, EventData } from '../types/external-contract-types.js';
import { withRetry } from '../utils/retry-logic.js';
import { isFunction } from '../utils/type-helpers.js';

/**
 * Options for creating a contract proxy
 */
export interface ContractProxyOptions<TContract = unknown> {
  /** Deployed contract instance */
  contract: DeployedContract<TContract>;

  /** Optional logger */
  logger?: Logger;

  /** Optional retry configuration */
  retryConfig?: RetryConfig;

  /** Optional custom error handler */
  errorHandler?: ErrorHandler;

  /** Event emitter for method lifecycle events */
  eventEmitter: EventEmitter;
}

/**
 * Event handler function type
 */
export type EventHandler = (data: EventData) => void;

/**
 * Simple event emitter for contract events
 */
export class EventEmitter {
  private handlers = new Map<string, EventHandler[]>();

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: string, data: EventData): void {
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
 * CallTx proxy options
 */
interface CallTxProxyOptions {
  logger?: Logger;
  retryConfig?: RetryConfig;
  errorHandler?: ErrorHandler;
  eventEmitter: EventEmitter;
}

/**
 * Creates a proxy for the callTx object that intercepts method calls
 */
function createCallTxProxy<TCallTx = unknown>(
  callTx: TCallTx,
  options: CallTxProxyOptions
): TCallTx {
  const { logger, retryConfig, errorHandler, eventEmitter } = options;

  return new Proxy(callTx as object, {
    get(target: object, methodName: string | symbol): unknown {
      const originalMethod = (target as Record<string | symbol, unknown>)[methodName];

      // If not a function, just return the property
      if (!isFunction(originalMethod)) {
        return originalMethod;
      }

      // Return wrapped method
      return async function (...args: unknown[]): Promise<unknown> {
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
          const methodFunc = originalMethod as (...args: unknown[]) => Promise<unknown>;
          const result = retryConfig
            ? await withRetry(
                () => methodFunc.apply(target, args),
                retryConfig,
                logger,
                `${methodNameStr}`
              )
            : await methodFunc.apply(target, args);

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
  }) as TCallTx;
}

/**
 * Creates a dynamic proxy that intercepts all method calls on the deployed contract
 */
export function createContractProxy<TContract>(
  options: ContractProxyOptions<TContract>
): DeployedContract<TContract> {
  const { contract, logger, retryConfig, errorHandler, eventEmitter } = options;

  // Create a proxy that intercepts method calls
  const proxy = new Proxy(contract, {
    get(target: DeployedContract<TContract>, prop: string | symbol): unknown {
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

      // Forward other property access - use unknown as intermediate type to satisfy TypeScript
      return (target as unknown as Record<string | symbol, unknown>)[prop];
    }
  });

  return proxy as DeployedContract<TContract>;
}
