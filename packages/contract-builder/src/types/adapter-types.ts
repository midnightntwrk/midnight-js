/**
 * Adapter-specific types for the Contract Builder
 */

import type { Logger, RetryConfig, MethodCallEvent, MethodSuccessEvent, MethodErrorEvent, DeployedContract } from './contract-types.js';

/**
 * Configuration options for the Contract Adapter
 */
export interface AdapterConfig {
  /** Optional logger for contract operations */
  logger?: Logger;

  /** Optional retry configuration for failed operations */
  retry?: RetryConfig;

  /** Optional custom error handler */
  errorHandler?: (error: any) => void;

  /** Optional event handlers */
  eventHandlers?: Record<string, Function>;
}

/**
 * Event handler function types
 */
export type CallEventHandler = (event: MethodCallEvent) => void;
export type SuccessEventHandler = (event: MethodSuccessEvent) => void;
export type ErrorEventHandler = (event: MethodErrorEvent) => void;

/**
 * Contract Adapter interface with type-safe method proxying
 *
 * This type maps all methods from the deployed contract's callTx object
 * and adds additional adapter-specific methods for state management and events.
 */
export type ContractAdapter<TContract> = {
  /** All contract methods from callTx are proxied here */
  [K in keyof DeployedContract<TContract>['callTx']]: (
    ...args: Parameters<DeployedContract<TContract>['callTx'][K]>
  ) => ReturnType<DeployedContract<TContract>['callTx'][K]>;
} & {
  /** Contract address on the blockchain */
  address: string;

  /** Deployment transaction data */
  deployTxData: any;

  /** Register an event handler for method calls */
  on(event: 'call', handler: CallEventHandler): ContractAdapter<TContract>;

  /** Register an event handler for successful method execution */
  on(event: 'success', handler: SuccessEventHandler): ContractAdapter<TContract>;

  /** Register an event handler for method errors */
  on(event: 'error', handler: ErrorEventHandler): ContractAdapter<TContract>;
};
