/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Adapter-specific types for the Contract Builder
 *
 * @packageDocumentation
 * Provides type-safe interfaces for contract adapters with full TypeScript inference
 */

import type { DeployedContract, DeployTxData, Logger, RetryConfig } from './contract-types.js';
import type { Prettify } from './type-utils.js';

/**
 * Configuration options for the Contract Adapter
 *
 * @remarks
 * This interface allows you to customize the behavior of the contract adapter including
 * logging, retry logic, and error handling.
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
}

/**
 * Helper type to extract the callTx interface from a deployed contract
 */
type CallTxInterface<TContract> = DeployedContract<TContract>['callTx'];

/**
 * Helper type to extract contract methods with better type inference
 * Wraps callTx methods to provide a cleaner API
 */
type ContractMethods<TContract> = CallTxInterface<TContract> & {
  /**
   * Access internal contract APIs for advanced use cases
   * @remarks Most users should not need this. Use the direct method calls instead.
   */
  readonly internal: {
    /** Direct access to callTx for advanced operations */
    readonly callTx: CallTxInterface<TContract>;
    /** Deployment transaction data */
    readonly deployTxData: DeployTxData;
  };
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
 * - Full type safety for all contract methods (directly accessible, e.g., adapter.increment())
 * - Conditional private state methods based on whether private state is configured
 * - Contract address access
 * - Internal API for power users (adapter.internal.callTx, adapter.internal.deployTxData)
 *
 * @example
 * ```typescript
 * // Contract without private state
 * const adapter: ContractAdapter<MyContract> = ...;
 * await adapter.myMethod(); // Fully typed - contract methods directly accessible
 * const addr = adapter.address; // Contract address
 *
 * // Contract with private state
 * const adapter: ContractAdapter<MyContract, MyState> = ...;
 * const state = await adapter.getPrivateState(); // Returns MyState | null
 *
 * // Power users can access internals
 * const callTx = adapter.internal.callTx;
 * const deployData = adapter.internal.deployTxData;
 * ```
 */
export type ContractAdapter<TContract, TPrivateState = undefined> = Prettify<
  {
    /** Contract address on the blockchain */
    readonly address: string;
  } & ContractMethods<TContract> &
    PrivateStateMethods<TPrivateState>
>;
