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
 * Fluent builder API for creating Contract Adapters
 *
 * @packageDocumentation
 * Provides a fluent, type-safe builder interface for creating contract adapters
 * with optional witnesses, private state, and logging.
 *
 * @example
 * ```typescript
 * // Simple contract without witnesses
 * const contract = await createContractAdapter(contractInstance)
 *   .withLogger(logger)
 *   .deploy(providers);
 *
 * // Contract with witnesses and private state
 * const contract = await createContractAdapter<MyContract, Ledger, PrivateState>(contractInstance)
 *   .withWitnesses(witnesses)
 *   .withPrivateState({ initialState: { counter: 0 } })
 *   .withLogger(logger)
 *   .deploy(providers);
 * ```
 */

import type { PrivateStateConfig } from '../config/PrivateStateConfig.js';
import { DeploymentError } from '../errors/AdapterError.js';
import { PrivateStateManager } from '../private-state/PrivateStateManager.js';
import { createDefaultProviders } from '../providers/factory.js';
import type { NetworkConfig, NetworkPreset, ProviderPresetConfig, WalletConfig } from '../providers/types.js';
import type { AdapterConfig, ContractAdapter as IContractAdapter } from '../types/adapter-types.js';
import type { ContractProviders, DeployedContract, Logger } from '../types/contract-types.js';
import type { ContractInstance, DeployOptions, FindContractOptions } from '../types/external-contract-types.js';
import type { ExtractLedgerFromWitness, ExtractPrivateStateFromWitness, InferContractInterface, InferLedgerFromContract, InferPrivateStateFromContract } from '../types/type-utils.js';
import type { Witnesses } from '../types/witness-types.js';
import { ContractAdapter } from './ContractAdapter.js';
import { WitnessInterceptor } from './WitnessInterceptor.js';
import { WitnessManager } from './WitnessManager.js';

/**
 * Builder for creating ContractAdapter instances with a fluent API
 *
 * @typeParam TContract - The contract interface type
 * @typeParam TLedger - The ledger type for witness context (defaults to any)
 * @typeParam TPrivateState - The private state type (undefined if no private state)
 *
 * @remarks
 * This builder provides a fluent interface for configuring and deploying contract adapters.
 * All configuration methods return `this` for method chaining.
 *
 * @example
 * ```typescript
 * const builder = new ContractAdapterBuilder(contractInstance)
 *   .withLogger(consoleLogger);
 *
 * const adapter = await builder.deploy(providers);
 * ```
 */
export class ContractAdapterBuilder<TContract, TLedger = unknown, TPrivateState = undefined> {
  private logger?: Logger;
  private providersConfig?: NetworkPreset | NetworkConfig | ProviderPresetConfig;
  private walletConfig?: WalletConfig;
  private witnesses?: Witnesses<TLedger, TPrivateState>;
  private privateStateConfig?: PrivateStateConfig<TPrivateState>;
  private witnessInterceptor?: WitnessInterceptor<TLedger, TPrivateState>;

  constructor(private readonly contractInstance: ContractInstance) {}

  /**
   * Configure a logger for the adapter
   *
   * @param logger - Logger instance implementing the Logger interface
   * @returns The builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.withLogger(consoleLogger);
   * ```
   */
  withLogger(logger: Logger): this {
    this.logger = logger;
    return this;
  }

  /**
   * Configure default providers using network preset or custom config
   *
   * @example
   * ```typescript
   * // Using network preset
   * builder.withDefaultProviders('testnet', { seed: 'my-seed' });
   *
   * // Using custom network config
   * builder.withDefaultProviders({
   *   networkId: 'custom',
   *   indexerUrl: 'https://...',
   *   nodeUrl: 'https://...'
   * });
   * ```
   */
  withDefaultProviders(
    config: NetworkPreset | NetworkConfig | ProviderPresetConfig,
    wallet?: WalletConfig
  ): this {
    this.providersConfig = config;
    if (wallet) {
      this.walletConfig = wallet;
    }
    return this;
  }

  /**
   * Configure wallet for default providers
   */
  withWallet(wallet: WalletConfig): this {
    this.walletConfig = wallet;
    return this;
  }

  /**
   * Configure witnesses for contracts with private state
   *
   * @param witnesses - Object mapping witness names to witness functions
   * @returns The builder instance for method chaining
   *
   * @remarks
   * Witnesses are functions that compute private state transitions and outputs.
   * They are automatically intercepted for monitoring and error handling.
   *
   * @example
   * ```typescript
   * builder.withWitnesses({
   *   privateIncrement: ({ privateState }) => [
   *     { counter: privateState.counter + 1 },
   *     []
   *   ]
   * });
   * ```
   */
  withWitnesses(witnesses: Witnesses<TLedger, TPrivateState>): this {
    this.witnesses = witnesses;
    this.witnessInterceptor = new WitnessInterceptor(witnesses, this.logger);
    return this;
  }

  /**
   * Configure private state for the contract
   *
   * @param config - Private state configuration including initial state and options
   * @returns The builder instance for method chaining
   *
   * @remarks
   * Private state is managed locally and synchronized with the contract.
   * If no `stateId` is provided, one will be auto-generated.
   *
   * @example
   * ```typescript
   * builder.withPrivateState({
   *   stateId: 'my-counter', // Optional
   *   initialState: { counter: 0 },
   *   debug: true // Enable debug logging
   * });
   * ```
   */
  withPrivateState(config: PrivateStateConfig<TPrivateState>): this {
    this.privateStateConfig = config;
    return this;
  }

  /**
   * Enable private state debugging (shorthand for withPrivateState with debug: true)
   *
   * @param enabled - Whether to enable debug mode (defaults to true)
   * @returns The builder instance for method chaining
   *
   * @remarks
   * Debug mode logs all private state changes showing before/after values.
   * Must be called after `withPrivateState()`.
   *
   * @example
   * ```typescript
   * builder
   *   .withPrivateState({ initialState: { counter: 0 } })
   *   .withPrivateStateDebug(true);
   * ```
   */
  withPrivateStateDebug(enabled = true): this {
    if (this.privateStateConfig) {
      this.privateStateConfig.debug = enabled;
    }
    return this;
  }

  /**
   * Deploy the contract with explicitly provided providers
   */
  async deploy(providers: ContractProviders): Promise<IContractAdapter<TContract, TPrivateState>>;

  /**
   * Deploy the contract using default providers (must call withDefaultProviders first)
   */
  async deploy(): Promise<IContractAdapter<TContract, TPrivateState>>;

  /**
   * Deploy the contract and return an adapter
   */
  async deploy(providers?: ContractProviders): Promise<IContractAdapter<TContract, TPrivateState>> {
    this.logger?.info('Deploying contract...');

    try {
      // Resolve providers - either use provided or create default
      let resolvedProviders: ContractProviders;

      if (providers) {
        // Use explicitly provided providers
        resolvedProviders = providers;
        this.logger?.debug('Using explicitly provided providers');
      } else if (this.providersConfig) {
        // Create default providers from config
        this.logger?.info('Creating default providers...', {
          config: typeof this.providersConfig === 'string'
            ? this.providersConfig
            : 'networkId' in this.providersConfig
              ? this.providersConfig.networkId
              : 'custom'
        });

        // Normalize config with wallet if provided
        let fullConfig = this.providersConfig;
        if (typeof fullConfig === 'string' || 'networkId' in fullConfig) {
          // Convert to ProviderPresetConfig
          fullConfig = {
            network: fullConfig,
            wallet: this.walletConfig
          } as ProviderPresetConfig;
        } else if (this.walletConfig && !fullConfig.wallet) {
          fullConfig = {
            ...fullConfig,
            wallet: this.walletConfig
          };
        }

        resolvedProviders = await createDefaultProviders(fullConfig, this.logger) as ContractProviders;
        this.logger?.info('Default providers created successfully');
      } else {
        throw new DeploymentError(
          'No providers configured. Either pass providers to deploy() or use withDefaultProviders()'
        );
      }

      let contractInstance = this.contractInstance;

      if (this.witnesses && this.witnessInterceptor) {
        this.logger?.info('Attaching witnesses to contract...');

        const interceptedWitnesses = this.witnessInterceptor.createInterceptedWitnesses();

        const witnessManager = new WitnessManager<TLedger, TPrivateState>(
          interceptedWitnesses,
          (this.contractInstance as { constructor: new (witnesses: Witnesses<unknown, unknown>) => ContractInstance }).constructor
        );
        witnessManager.validate();
        contractInstance = witnessManager.attachToContract();
        this.logger?.info('Witnesses attached successfully', {
          witnesses: witnessManager.getWitnessNames()
        });
      }

      const deployOptions: DeployOptions = {
        contract: contractInstance
      };

      let privateStateManager: PrivateStateManager<TPrivateState> | undefined;

      if (this.privateStateConfig) {
        this.logger?.info('Configuring private state...');
        privateStateManager = new PrivateStateManager(
          this.privateStateConfig,
          resolvedProviders,
          this.logger
        );

        deployOptions.privateStateId = privateStateManager.getStateId();
        deployOptions.initialPrivateState = privateStateManager.getInitialState();

        this.logger?.info('Private state configured', {
          stateId: deployOptions.privateStateId
        });
      }

      const { deployContract } = await import('@midnight-ntwrk/midnight-js-contracts');

      // Type assertion needed due to external library's complex overloads
      const deployed = await (deployContract as unknown as (providers: ContractProviders, options: DeployOptions) => Promise<unknown>)(resolvedProviders, deployOptions);

      this.logger?.info('Contract deployed successfully', {
        address: (deployed as { address: string }).address
      });

      const config: AdapterConfig = {
        logger: this.logger
      };

      const adapter = new ContractAdapter<TContract, TPrivateState>(deployed as DeployedContract<TContract>, config, {
        privateStateManager
      }) as unknown as IContractAdapter<TContract, TPrivateState>;

      return adapter;
    } catch (error) {
      const deployError = new DeploymentError(
        `Failed to deploy contract: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );

      this.logger?.error('Contract deployment failed', { error: deployError });

      throw deployError;
    }
  }

  /**
   * Connect to an already deployed contract and return an adapter
   */
  async connect(
    contractAddress: string,
    providers: ContractProviders
  ): Promise<IContractAdapter<TContract, TPrivateState>> {
    this.logger?.info('Connecting to existing contract...', { contractAddress });

    try {
      let contractInstance = this.contractInstance;

      if (this.witnesses && this.witnessInterceptor) {
        this.logger?.info('Attaching witnesses to contract...');

        const interceptedWitnesses = this.witnessInterceptor.createInterceptedWitnesses();

        const witnessManager = new WitnessManager<TLedger, TPrivateState>(
          interceptedWitnesses,
          (this.contractInstance as { constructor: new (witnesses: Witnesses<unknown, unknown>) => ContractInstance }).constructor
        );
        witnessManager.validate();
        contractInstance = witnessManager.attachToContract();
        this.logger?.info('Witnesses attached successfully');
      }

      const { findDeployedContract } = await import('@midnight-ntwrk/midnight-js-contracts');

      const findOptions: FindContractOptions = {
        contract: contractInstance,
        contractAddress
      };

      let privateStateManager: PrivateStateManager<TPrivateState> | undefined;

      if (this.privateStateConfig) {
        this.logger?.info('Configuring private state for connected contract...');
        privateStateManager = new PrivateStateManager(
          this.privateStateConfig,
          providers,
          this.logger
        );

        findOptions.privateStateId = privateStateManager.getStateId();

        this.logger?.info('Private state configured', {
          stateId: privateStateManager.getStateId()
        });
      }

      // Type assertion needed due to external library's complex overloads
      const connected = await (findDeployedContract as unknown as (providers: ContractProviders, options: FindContractOptions) => Promise<unknown>)(providers, findOptions);

      this.logger?.info('Connected to contract successfully', {
        address: (connected as { address: string }).address
      });

      const config: AdapterConfig = {
        logger: this.logger
      };

      const adapter = new ContractAdapter<TContract, TPrivateState>(connected as DeployedContract<TContract>, config, {
        privateStateManager
      }) as unknown as IContractAdapter<TContract, TPrivateState>;

      return adapter;
    } catch (error) {
      const connectError = new DeploymentError(
        `Failed to connect to contract: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );

      this.logger?.error('Contract connection failed', { error: connectError });

      throw connectError;
    }
  }
}

/**
 * Factory function with automatic type inference from contract instance
 *
 * @typeParam TContractInstance - The contract instance type (inferred automatically)
 *
 * @param contractInstance - The compiled contract instance
 * @returns A new ContractAdapterBuilder with fully inferred types
 *
 * @remarks
 * This overload automatically infers:
 * - Contract interface (circuit methods) from the contract's circuits property
 * - Ledger type from the circuit context
 * - Private state type from the circuit context
 *
 * @example
 * ```typescript
 * import { CompiledCounter } from './managed/counter/contract';
 * import { witnesses } from './witnesses';
 *
 * // Full automatic type inference - no manual type definitions needed!
 * const contractInstance = new CompiledCounter.Contract(witnesses);
 * const adapter = await createContractAdapter(contractInstance)
 *   .withWitnesses(witnesses)
 *   .withPrivateState({
 *     initialState: { privateCounter: 0 }
 *   })
 *   .deploy(providers);
 *
 * // All methods are fully typed automatically!
 * await adapter.increment(); // ✓ Type-safe
 * await adapter.decrement(5n); // ✓ Type-safe
 * const state = await adapter.getPrivateState(); // ✓ Returns correct type
 * ```
 */
export function createContractAdapter<TContractInstance extends ContractInstance>(
  contractInstance: TContractInstance
): ContractAdapterBuilder<
  InferContractInterface<TContractInstance>,
  InferLedgerFromContract<TContractInstance>,
  InferPrivateStateFromContract<TContractInstance>
>;

/**
 * Factory function to create a ContractAdapterBuilder with explicit type parameters
 *
 * @typeParam TContract - The contract interface type
 * @typeParam TLedger - The ledger type for witness context (defaults to unknown)
 * @typeParam TPrivateState - The private state type (defaults to undefined)
 *
 * @param contractInstance - The contract instance to wrap
 * @returns A new ContractAdapterBuilder instance
 *
 * @remarks
 * Use this overload when you need explicit control over types or when automatic
 * inference doesn't work for your use case.
 *
 * @example
 * ```typescript
 * // With explicit type parameters (manual control)
 * const adapter = await createContractAdapter<MyContract, Ledger, MyState>(contractInstance)
 *   .withWitnesses(witnesses)
 *   .withPrivateState({ initialState: { counter: 0 } })
 *   .deploy(providers);
 * ```
 */
export function createContractAdapter<TContract, TLedger = unknown, TPrivateState = undefined>(
  contractInstance: ContractInstance
): ContractAdapterBuilder<TContract, TLedger, TPrivateState>;

/**
 * Factory function to create a ContractAdapterBuilder with automatic type inference from witnesses
 *
 * @typeParam TContractInstance - The contract instance type (inferred automatically)
 * @typeParam W - The witnesses type (inferred automatically)
 *
 * @param contractInstance - The contract instance to wrap
 * @param witnesses - Witness functions for type inference
 * @returns A new ContractAdapterBuilder instance with fully inferred types
 *
 * @remarks
 * This overload automatically infers all types from the contract instance and witnesses:
 * - Contract interface from the contract's circuits property
 * - Ledger type from witness context
 * - Private state type from witness context
 *
 * **This is the recommended approach - no manual type definitions needed!**
 *
 * @example
 * ```typescript
 * import { CompiledCounter } from './managed/counter/contract';
 * import { witnesses } from './witnesses';
 *
 * // Full automatic type inference - no type files needed!
 * const contractInstance = new CompiledCounter.Contract(witnesses);
 * const adapter = await createContractAdapter(contractInstance, witnesses)
 *   .withPrivateState({
 *     stateId: 'my-counter',
 *     initialState: { privateCounter: 0 }
 *   })
 *   .deploy(providers);
 *
 * // All methods fully typed automatically!
 * await adapter.increment(); // ✓ Type-safe
 * await adapter.decrement(5n); // ✓ Type-safe
 * const state = await adapter.getPrivateState(); // ✓ Returns CounterPrivateState | null
 * ```
 */
export function createContractAdapter<
  TContractInstance extends ContractInstance,
  W extends Witnesses<any, any>
>(
  contractInstance: TContractInstance,
  witnesses: W
): ContractAdapterBuilder<
  InferContractInterface<TContractInstance>,
  ExtractLedgerFromWitness<W>,
  ExtractPrivateStateFromWitness<W>
>;

/**
 * Implementation of createContractAdapter factory function
 */
export function createContractAdapter<TContract, TLedger = unknown, TPrivateState = undefined>(
  contractInstance: ContractInstance,
  witnesses?: Witnesses<TLedger, TPrivateState>
): ContractAdapterBuilder<TContract, TLedger, TPrivateState> {
  const builder = new ContractAdapterBuilder<TContract, TLedger, TPrivateState>(contractInstance);

  if (witnesses) {
    builder.withWitnesses(witnesses);
  }

  return builder;
}
