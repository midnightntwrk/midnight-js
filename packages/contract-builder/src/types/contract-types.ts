/**
 * Core contract types for the Contract Builder adapter
 */

/**
 * Represents a deployed contract instance from midnight-js
 */
export interface DeployedContract<TContract> {
  callTx: TContract;
  address: string;
  deployTxData: any;
}

/**
 * Provider interfaces required for contract operations
 */
export interface ContractProviders {
  walletProvider: any;
  indexerProvider: any;
  privateStateProvider?: any;
  [key: string]: any;
}

/**
 * Logger interface for contract operations
 */
export interface Logger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}

/**
 * Retry configuration for failed operations
 */
export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff?: boolean;
}

/**
 * Method call event emitted when a contract method is invoked
 */
export interface MethodCallEvent {
  methodName: string;
  args: any[];
  timestamp: number;
}

/**
 * Method success event emitted when a contract method completes successfully
 */
export interface MethodSuccessEvent {
  methodName: string;
  args: any[];
  result: any;
  duration: number;
  timestamp: number;
}

/**
 * Method error event emitted when a contract method fails
 */
export interface MethodErrorEvent {
  methodName: string;
  args: any[];
  error: any;
  duration: number;
  timestamp: number;
}
