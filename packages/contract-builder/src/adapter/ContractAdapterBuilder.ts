/**
 * Fluent builder API for creating Contract Adapters
 */

import type { ContractProviders, Logger, RetryConfig } from '../types/contract-types.js';
import type { AdapterConfig, ContractAdapter as IContractAdapter } from '../types/adapter-types.js';
import type { NetworkConfig, NetworkPreset, WalletConfig, ProviderPresetConfig } from '../providers/types.js';
import { ContractAdapter } from './ContractAdapter.js';
import { DeploymentError } from '../errors/AdapterError.js';
import { mergeRetryConfig } from '../config/RetryConfig.js';
import { createDefaultProviders } from '../providers/factory.js';

/**
 * Builder for creating ContractAdapter instances with a fluent API
 */
export class ContractAdapterBuilder<TContract> {
  private logger?: Logger;
  private retryConfig?: RetryConfig;
  private errorHandler?: (error: any) => void;
  private eventHandlers: Record<string, Function> = {};
  private providersConfig?: NetworkPreset | NetworkConfig | ProviderPresetConfig;
  private walletConfig?: WalletConfig;

  constructor(private readonly contractInstance: any) {}

  /**
   * Configure a logger for the adapter
   */
  withLogger(logger: Logger): this {
    this.logger = logger;
    return this;
  }

  /**
   * Configure retry logic for failed operations
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
   * Deploy the contract with explicitly provided providers
   */
  async deploy(providers: ContractProviders): Promise<IContractAdapter<TContract>>;

  /**
   * Deploy the contract using default providers (must call withDefaultProviders first)
   */
  async deploy(): Promise<IContractAdapter<TContract>>;

  /**
   * Deploy the contract and return an adapter
   */
  async deploy(providers?: ContractProviders): Promise<IContractAdapter<TContract>> {
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

      // Import deployContract dynamically to avoid circular dependencies
      // In a real implementation, this would be imported from @midnight-ntwrk/midnight-js-contracts
      const { deployContract } = await import('@midnight-ntwrk/midnight-js-contracts');

      const deployed = await deployContract(resolvedProviders, {
        contract: this.contractInstance
      });

      this.logger?.info('Contract deployed successfully', {
        address: deployed.address
      });

      // Create adapter config
      const config: AdapterConfig = {
        logger: this.logger,
        retry: this.retryConfig,
        errorHandler: this.errorHandler,
        eventHandlers: this.eventHandlers
      };

      // Create and return adapter
      return new ContractAdapter(deployed, config);
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
  ): Promise<IContractAdapter<TContract>> {
    this.logger?.info('Connecting to existing contract...', { contractAddress });

    try {
      // Import connectContract dynamically
      // In a real implementation, this would be imported from @midnight-ntwrk/midnight-js-contracts
      const { connectContract } = await import('@midnight-ntwrk/midnight-js-contracts');

      const connected = await connectContract(
        providers,
        contractAddress,
        this.contractInstance
      );

      this.logger?.info('Connected to contract successfully', {
        address: connected.address
      });

      // Create adapter config
      const config: AdapterConfig = {
        logger: this.logger,
        retry: this.retryConfig,
        errorHandler: this.errorHandler,
        eventHandlers: this.eventHandlers
      };

      // Create and return adapter
      return new ContractAdapter(connected, config);
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
 */
export function createContractAdapter<TContract>(
  contractInstance: any
): ContractAdapterBuilder<TContract> {
  return new ContractAdapterBuilder<TContract>(contractInstance);
}
