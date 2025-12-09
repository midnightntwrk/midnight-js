/**
 * Adapter-specific types for the Contract Builder
 *
 * @packageDocumentation
 * Provides type-safe interfaces for contract adapters with full TypeScript inference
 */

import type { DeployedContract, DeployTxData, Logger, MethodCallEvent, MethodErrorEvent, MethodSuccessEvent, RetryConfig } from './contract-types.js';
import type { Prettify } from './type-utils.js';
import type { WitnessCallEvent } from './witness-types.js';

/**
 * Configuration options for the Contract Adapter
 *
 * @remarks
 * This interface allows you to customize the behavior of the contract adapter including
 * logging, retry logic, error handling, and event monitoring.
 *
 * @example
 * ```typescript
 * const config: AdapterConfig = {
 *   logger: consoleLogger,
 *   retry: {
 *     maxRetries: 3,
 *     backoffMs: 1000,
 *     exponentialBackoff: true
 *   },
 *   errorHandler: (error) => {
 *     console.error('Contract error:', error);
 *   }
 * };
 * ```
 */
export interface AdapterConfig {
  /**
   * Optional logger for contract operations
   * @remarks Use this to integrate with your application's logging system
   */
  logger?: Logger;

  /**
   * Optional retry configuration for failed operations
   * @remarks Configure automatic retries for transient failures
   */
  retry?: RetryConfig;

  /**
   * Optional custom error handler
   * @param error - The error that occurred
   * @remarks This handler is called for all errors, even if retries are configured
   */
  errorHandler?: (error: unknown) => void;

  /**
   * Optional event handlers for monitoring
   * @remarks Pre-register event handlers that will be attached to the adapter
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  eventHandlers?: Record<string, Function>;
}

/**
 * Event handler function types
 */
export type CallEventHandler = (event: MethodCallEvent) => void;
export type SuccessEventHandler = (event: MethodSuccessEvent) => void;
export type ErrorEventHandler = (event: MethodErrorEvent) => void;
export type WitnessCallEventHandler<TPrivateState = any> = (event: WitnessCallEvent<TPrivateState>) => void;

/**
 * Helper type to extract contract methods with better type inference
 */
type ContractMethods<TContract> = {
  [K in keyof DeployedContract<TContract>['callTx']]: DeployedContract<TContract>['callTx'][K];
};

/**
 * Conditional type for private state methods - only included when TPrivateState is defined
 */
type PrivateStateMethods<TPrivateState> = TPrivateState extends undefined
  ? {
      /** Get the current private state (not configured) */
      getPrivateState(): Promise<null>;
      /** Set the private state (not configured) */
      setPrivateState(state: never): Promise<void>;
      /** Get the private state ID (not configured) */
      getPrivateStateId(): undefined;
    }
  : {
      /**
       * Get the current private state
       * @returns The current private state or null if not yet initialized
       */
      getPrivateState(): Promise<TPrivateState | null>;

      /**
       * Set the private state
       * @param state - The new private state to set
       */
      setPrivateState(state: TPrivateState): Promise<void>;

      /**
       * Get the private state ID
       * @returns The unique identifier for this contract's private state
       */
      getPrivateStateId(): string | undefined;
    };

/**
 * Contract Adapter interface with type-safe method proxying and conditional private state support
 *
 * @typeParam TContract - The contract interface type
 * @typeParam TPrivateState - The private state type (undefined if no private state)
 *
 * @remarks
 * This type provides:
 * - Full type safety for all contract methods
 * - Conditional private state methods based on whether private state is configured
 * - Event handler registration with proper typing
 * - Fluent interface for chaining operations
 *
 * @example
 * ```typescript
 * // Contract without private state
 * const adapter: ContractAdapter<MyContract> = ...;
 * await adapter.myMethod(); // Fully typed
 *
 * // Contract with private state
 * const adapter: ContractAdapter<MyContract, MyState> = ...;
 * const state = await adapter.getPrivateState(); // Returns MyState | null
 * ```
 */
export type ContractAdapter<TContract, TPrivateState = undefined> = Prettify<
  ContractMethods<TContract> &
    PrivateStateMethods<TPrivateState> & {
      /** Contract address on the blockchain */
      readonly address: string;

      /** Deployment transaction data */
      readonly deployTxData: DeployTxData;

      /**
       * Register an event handler for method calls
       * @param event - The event type ('call')
       * @param handler - The event handler function
       * @returns The adapter instance for chaining
       */
      on(event: 'call', handler: CallEventHandler): ContractAdapter<TContract, TPrivateState>;

      /**
       * Register an event handler for successful method execution
       * @param event - The event type ('success')
       * @param handler - The event handler function
       * @returns The adapter instance for chaining
       */
      on(event: 'success', handler: SuccessEventHandler): ContractAdapter<TContract, TPrivateState>;

      /**
       * Register an event handler for method errors
       * @param event - The event type ('error')
       * @param handler - The event handler function
       * @returns The adapter instance for chaining
       */
      on(event: 'error', handler: ErrorEventHandler): ContractAdapter<TContract, TPrivateState>;

      /**
       * Register an event handler for witness calls (only relevant for contracts with witnesses)
       * @param event - The event type ('witnessCall')
       * @param handler - The event handler function
       * @returns The adapter instance for chaining
       */
      on(
        event: 'witnessCall',
        handler: WitnessCallEventHandler<TPrivateState>
      ): ContractAdapter<TContract, TPrivateState>;
    }
>;
