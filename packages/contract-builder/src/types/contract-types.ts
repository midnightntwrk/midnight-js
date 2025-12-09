/**
 * Core contract types for the Contract Builder adapter
 */

/**
 * Deployment transaction data type
 */
export type DeployTxData = Record<string, unknown> | null | undefined;

/**
 * Represents a deployed contract instance from midnight-js
 */
export interface DeployedContract<TContract> {
  callTx: TContract;
  address: string;
  deployTxData: DeployTxData;
}

/**
 * Provider interfaces required for contract operations
 */
export interface ContractProviders {
  walletProvider: unknown;
  indexerProvider: unknown;
  privateStateProvider?: unknown;
  [key: string]: unknown;
}

/**
 * Logger data type - can be any JSON-serializable value
 */
export type LoggerData = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

/**
 * Logger interface for contract operations
 */
export interface Logger {
  info(message: string, data?: LoggerData): void;
  warn(message: string, data?: LoggerData): void;
  error(message: string, data?: LoggerData): void;
  debug(message: string, data?: LoggerData): void;
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
  args: unknown[];
  timestamp: number;
}

/**
 * Method success event emitted when a contract method completes successfully
 */
export interface MethodSuccessEvent {
  methodName: string;
  args: unknown[];
  result: unknown;
  duration: number;
  timestamp: number;
}

/**
 * Method error event emitted when a contract method fails
 */
export interface MethodErrorEvent {
  methodName: string;
  args: unknown[];
  error: unknown;
  duration: number;
  timestamp: number;
}
