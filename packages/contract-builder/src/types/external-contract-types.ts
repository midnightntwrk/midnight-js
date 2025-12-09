/**
 * Type definitions for external midnight-js contract types
 *
 * These types help us avoid using 'any' while working with the external
 * @midnight-ntwrk/midnight-js-contracts package.
 */

import type { Contract, FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

/**
 * Represents the deployed transaction data from midnight-js
 */
export type DeployTxData = FinalizedTxData | null | undefined;

/**
 * Represents a deployed contract instance from midnight-js-contracts
 * This is a stricter version than our internal DeployedContract type
 */
export interface ExternalDeployedContract<TContract = unknown> {
  /** The callTx object containing contract method proxies */
  callTx: TContract;
  /** The contract address on the blockchain */
  address: string;
  /** Deployment transaction data */
  deployTxData: DeployTxData;
}

/**
 * Generic contract instance that can be passed to deploy/connect functions
 */
export type ContractInstance = Contract<any> | unknown;

/**
 * Error type from contract operations
 */
export type ContractError = Error | unknown;

/**
 * Generic function type for event handlers and callbacks
 */
export type GenericFunction = (...args: unknown[]) => unknown;

/**
 * Generic handler function that takes an error
 */
export type ErrorHandler = (error: ContractError) => void;

/**
 * Generic event data type - intentionally broad to accept all event types
 */
export type EventData = unknown;

/**
 * Options for deploy operations (intentionally loose for external API compatibility)
 */
export interface DeployOptions {
  contract: ContractInstance;
  privateStateId?: string;
  initialPrivateState?: unknown;
  [key: string]: unknown;
}

/**
 * Options for find/connect operations
 */
export interface FindContractOptions {
  contract: ContractInstance;
  contractAddress: string;
  privateStateId?: string;
  [key: string]: unknown;
}
