/**
 * Fluent builder API for creating Contract Adapters
 *
 * @packageDocumentation
 * Provides a fluent, type-safe builder interface for creating contract adapters
 * with optional witnesses, private state, logging, and retry logic.
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
 *   .withRetry({ maxRetries: 3, backoffMs: 1000 })
 *   .deploy(providers);
 * ```
 */

import type { PrivateStateConfig } from '../config/PrivateStateConfig.js';
import { mergeRetryConfig } from '../config/RetryConfig.js';
import { DeploymentError } from '../errors/AdapterError.js';
import { PrivateStateManager } from '../private-state/PrivateStateManager.js';
import { createDefaultProviders } from '../providers/factory.js';
import type { NetworkConfig, NetworkPreset, ProviderPresetConfig,WalletConfig } from '../providers/types.js';
import type { AdapterConfig, ContractAdapter as IContractAdapter } from '../types/adapter-types.js';
import type { ContractProviders, Logger, RetryConfig } from '../types/contract-types.js';
import type { WitnessCallEvent,Witnesses } from '../types/witness-types.js';
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
 *   .withLogger(consoleLogger)
 *   .withRetry({ maxRetries: 3, backoffMs: 1000 });
 *
 * const adapter = await builder.deploy(providers);
 * ```
 */
export class ContractAdapterBuilder<TContract, TLedger = any, TPrivateState = undefined> {
  private logger?: Logger;
  private retryConfig?: RetryConfig;
  private errorHandler?: (error: any) => void;
  private eventHandlers: Record<string, Function> = {};
  private providersConfig?: NetworkPreset | NetworkConfig | ProviderPresetConfig;
  private walletConfig?: WalletConfig;
  private witnesses?: Witnesses<TLedger, TPrivateState>;
  private privateStateConfig?: PrivateStateConfig<TPrivateState>;
  private witnessInterceptor?: WitnessInterceptor<TLedger, TPrivateState>;

  constructor(private readonly contractInstance: any) {}

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
   * Configure retry logic for failed operations
   *
   * @param config - Retry configuration specifying max retries, backoff, etc.
   * @returns The builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.withRetry({
   *   maxRetries: 3,
   *   backoffMs: 1000,
   *   exponentialBackoff: true
   * });
   * ```
   */
  withRetry(config: RetryConfig): this {
    this.retryConfig = mergeRetryConfig(config);
    return this;
  }

  /**
   * Configure a custom error handler
   */
  withErrorHandler(handler: (error: any) => void): this {
    this.errorHandler = handler;
    return this;
  }

  /**
   * Register an event handler
   */
  on(event: string, handler: Function): this {
    this.eventHandlers[event] = handler;
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
  withPrivateStateDebug(enabled: boolean = true): this {
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

        resolvedProviders = await createDefaultProviders(fullConfig, this.logger) as any;
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
          this.contractInstance.constructor
        );
        witnessManager.validate();
        contractInstance = witnessManager.attachToContract();
        this.logger?.info('Witnesses attached successfully', {
          witnesses: witnessManager.getWitnessNames()
        });
      }

      const deployOptions: any = {
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

      const deployed = await deployContract(resolvedProviders, deployOptions);

      this.logger?.info('Contract deployed successfully', {
        address: deployed.address
      });

      const config: AdapterConfig = {
        logger: this.logger,
        retry: this.retryConfig,
        errorHandler: this.errorHandler,
        eventHandlers: this.eventHandlers
      };

      const adapter = new ContractAdapter(deployed, config, {
        privateStateManager
      });

      if (this.witnessInterceptor) {
        this.witnessInterceptor.onWitnessCall((event: WitnessCallEvent<TPrivateState>) => {
          (adapter as any).eventEmitter?.emit('witnessCall', event);
        });
      }

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
          this.contractInstance.constructor
        );
        witnessManager.validate();
        contractInstance = witnessManager.attachToContract();
        this.logger?.info('Witnesses attached successfully');
      }

      const { connectContract } = await import('@midnight-ntwrk/midnight-js-contracts');

      const connected = await connectContract(
        providers,
        contractAddress,
        contractInstance
      );

      this.logger?.info('Connected to contract successfully', {
        address: connected.address
      });

      let privateStateManager: PrivateStateManager<TPrivateState> | undefined;

      if (this.privateStateConfig) {
        this.logger?.info('Configuring private state for connected contract...');
        privateStateManager = new PrivateStateManager(
          this.privateStateConfig,
          providers,
          this.logger
        );
        this.logger?.info('Private state configured', {
          stateId: privateStateManager.getStateId()
        });
      }

      const config: AdapterConfig = {
        logger: this.logger,
        retry: this.retryConfig,
        errorHandler: this.errorHandler,
        eventHandlers: this.eventHandlers
      };

      const adapter = new ContractAdapter(connected, config, {
        privateStateManager
      });

      if (this.witnessInterceptor) {
        this.witnessInterceptor.onWitnessCall((event: WitnessCallEvent<TPrivateState>) => {
          (adapter as any).eventEmitter?.emit('witnessCall', event);
        });
      }

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
 * Factory function to create a ContractAdapterBuilder
 *
 * @typeParam TContract - The contract interface type
 * @typeParam TLedger - The ledger type for witness context (defaults to any)
 * @typeParam TPrivateState - The private state type (undefined if no private state)
 *
 * @param contractInstance - The contract instance to wrap
 * @returns A new ContractAdapterBuilder instance
 *
 * @remarks
 * This is the primary entry point for creating contract adapters.
 * Use type parameters to enable full type safety and autocomplete.
 *
 * @example
 * ```typescript
 * // Without type parameters (basic usage)
 * const adapter = await createContractAdapter(contractInstance)
 *   .deploy(providers);
 *
 * // With type parameters (full type safety)
 * const adapter = await createContractAdapter<MyContract, Ledger, MyState>(contractInstance)
 *   .withWitnesses(witnesses)
 *   .withPrivateState({ initialState: { counter: 0 } })
 *   .deploy(providers);
 *
 * // Type-safe method calls
 * await adapter.increment(); // Autocomplete works!
 * const state = await adapter.getPrivateState(); // Returns MyState | null
 * ```
 */
export function createContractAdapter<TContract, TLedger = any, TPrivateState = undefined>(
  contractInstance: any
): ContractAdapterBuilder<TContract, TLedger, TPrivateState> {
  return new ContractAdapterBuilder<TContract, TLedger, TPrivateState>(contractInstance);
}
