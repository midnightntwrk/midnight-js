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
 * Main Contract Adapter class that wraps a deployed contract
 */

import { mergeAdapterConfig } from '../config/AdapterConfig.js';
import { PrivateStateNotConfiguredError } from '../errors/PrivateStateError.js';
import type { PrivateStateManager } from '../private-state/PrivateStateManager.js';
import type { AdapterConfig, ContractAdapter as IContractAdapter } from '../types/adapter-types.js';
import type { DeployedContract, DeployTxData } from '../types/contract-types.js';
import type { IndexableObject } from '../types/type-utils.js';
import { createContractProxy } from './ContractProxy.js';

/**
 * ContractAdapter wraps a deployed contract and provides:
 * - Automatic method proxying with interceptors
 * - Built-in error handling
 * - Logging integration
 * - Private state management (optional)
 */
export class ContractAdapter<TContract, TPrivateState = undefined> {
  private readonly proxy: DeployedContract<TContract>;
  private readonly privateStateManager?: PrivateStateManager<TPrivateState>;

  private constructor(
    private readonly deployedContract: DeployedContract<TContract>,
    private readonly config: AdapterConfig = {},
    options?: {
      privateStateManager?: PrivateStateManager<TPrivateState>;
    }
  ) {
    this.privateStateManager = options?.privateStateManager;
    // Merge with default config
    const mergedConfig = mergeAdapterConfig(config);

    // Create the proxy
    this.proxy = createContractProxy({
      contract: deployedContract,
      logger: mergedConfig.logger
    });
  }

  /**
   * Create a new ContractAdapter instance
   * @param deployedContract - The deployed contract to wrap
   * @param config - Adapter configuration
   * @param options - Additional options including private state manager
   * @returns A proxied contract adapter instance
   */
  static create<TContract, TPrivateState = undefined>(
    deployedContract: DeployedContract<TContract>,
    config: AdapterConfig = {},
    options?: {
      privateStateManager?: PrivateStateManager<TPrivateState>;
    }
  ): IContractAdapter<TContract, TPrivateState> {
    const instance = new ContractAdapter<TContract, TPrivateState>(
      deployedContract,
      config,
      options
    );
    return instance.createAdapterProxy();
  }

  /**
   * Get contract address
   * The address is extracted from deployTxData.public.contractAddress as per midnight-js structure
   */
  get address(): string {
    const deployTxData = this.deployedContract.deployTxData as {
      public?: { contractAddress?: string };
    };
    return deployTxData?.public?.contractAddress || '';
  }

  /**
   * Get deployment transaction data
   */
  get deployTxData(): DeployTxData {
    return this.deployedContract.deployTxData;
  }

  /**
   * Get the current private state
   */
  async getPrivateState(): Promise<TPrivateState | null> {
    if (!this.privateStateManager) {
      throw new PrivateStateNotConfiguredError();
    }

    return await this.privateStateManager.getState();
  }

  /**
   * Set the private state
   */
  async setPrivateState(state: TPrivateState): Promise<void> {
    if (!this.privateStateManager) {
      throw new PrivateStateNotConfiguredError();
    }

    return await this.privateStateManager.setState(state);
  }

  /**
   * Get the private state ID
   */
  getPrivateStateId(): string | undefined {
    return this.privateStateManager?.getStateId();
  }

  /**
   * Creates a proxy that combines contract methods with adapter methods
   *
   * Note: The Proxy requires a type assertion because TypeScript cannot statically verify
   * that the Proxy handler correctly implements all interface properties. The handler
   * intercepts: address, deployTxData, internal, getPrivateState, setPrivateState,
   * getPrivateStateId, and all contract methods from callTx/circuits/impureCircuits.
   */
  private createAdapterProxy(): IContractAdapter<TContract, TPrivateState> {
    // Capture references for use in proxy
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const adapter = this;
    const deployedContract = this.deployedContract;

    const handler: ProxyHandler<DeployedContract<TContract>> = {
      get(target: DeployedContract<TContract>, prop: string | symbol): unknown {
        // Handle address - extract from deployTxData.public.contractAddress
        if (prop === 'address') {
          return adapter.address;
        }

        // Handle deployTxData - access directly from deployedContract
        if (prop === 'deployTxData') {
          return deployedContract.deployTxData;
        }

        // Handle internal API access
        if (prop === 'internal') {
          return {
            callTx: target.callTx,
            deployTxData: deployedContract.deployTxData
          };
        }

        // Handle private state methods
        if (prop === 'getPrivateState') {
          return () => adapter.getPrivateState();
        }

        if (prop === 'setPrivateState') {
          return (state: TPrivateState) => adapter.setPrivateState(state);
        }

        if (prop === 'getPrivateStateId') {
          return () => adapter.getPrivateStateId();
        }

        // Forward to the proxied contract's callTx methods (direct access)
        const callTx = target.callTx;
        if (callTx && typeof callTx === 'object') {
          // First check if the property exists directly on callTx
          if (prop in callTx) {
            return (callTx as Record<string | symbol, unknown>)[prop];
          }

          // For compiled contracts, check if the property exists in the circuits object
          const circuits = (callTx as { circuits?: Record<string | symbol, unknown> }).circuits;
          if (circuits && typeof circuits === 'object' && prop in circuits) {
            return circuits[prop];
          }

          // Also check impureCircuits as a fallback
          const impureCircuits = (callTx as { impureCircuits?: Record<string | symbol, unknown> }).impureCircuits;
          if (impureCircuits && typeof impureCircuits === 'object' && prop in impureCircuits) {
            return impureCircuits[prop];
          }
        }

        // Forward to target
        return (target as IndexableObject<DeployedContract<TContract>>)[prop];
      }
    };

    // Create proxy with typed handler
    const adapterProxy = new Proxy(this.proxy, handler);

    /**
     * Type assertion required: The ProxyHandler above intercepts all required properties
     * (address, deployTxData, internal, private state methods, and contract methods),
     * but TypeScript's static analysis cannot verify Proxy completeness.
     * @ts-expect-error TS2352: Proxy types cannot be statically verified - this cast is safe
     */
    return adapterProxy as unknown as IContractAdapter<TContract, TPrivateState>;
  }
}
