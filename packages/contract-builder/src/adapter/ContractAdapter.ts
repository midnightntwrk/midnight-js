/**
 * Main Contract Adapter class that wraps a deployed contract
 */

import { mergeAdapterConfig } from '../config/AdapterConfig.js';
import { PrivateStateNotConfiguredError } from '../errors/PrivateStateError.js';
import type { PrivateStateManager } from '../private-state/PrivateStateManager.js';
import type { AdapterConfig, ContractAdapter as IContractAdapter } from '../types/adapter-types.js';
import type { DeployedContract, DeployTxData } from '../types/contract-types.js';
import { createContractProxy } from './ContractProxy.js';

/**
 * ContractAdapter wraps a deployed contract and provides:
 * - Automatic method proxying with interceptors
 * - Built-in error handling
 * - Retry logic for transient failures
 * - Logging integration
 * - Private state management (optional)
 */
export class ContractAdapter<TContract, TPrivateState = undefined> {
  private readonly proxy: DeployedContract<TContract>;
  private readonly privateStateManager?: PrivateStateManager<TPrivateState>;

  constructor(
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
      logger: mergedConfig.logger,
      retryConfig: mergedConfig.retry,
      errorHandler: mergedConfig.errorHandler
    });

    // Return proxy to make this object behave like the contract
    return this.createAdapterProxy() as unknown as ContractAdapter<TContract, TPrivateState>;
  }

  /**
   * Get contract address
   */
  get address(): string {
    return this.deployedContract.address;
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
   */
  private createAdapterProxy(): IContractAdapter<TContract, TPrivateState> {
    // Capture reference to this for use in proxy
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const adapter = this;

    const adapterProxy = new Proxy(this.proxy, {
      get(target: DeployedContract<TContract>, prop: string | symbol): unknown {
        // Handle address
        if (prop === 'address') {
          return adapter.address;
        }

        // Handle internal API access
        if (prop === 'internal') {
          return {
            callTx: target.callTx,
            deployTxData: adapter.deployTxData
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
        if (callTx && typeof callTx === 'object' && prop in callTx) {
          return (callTx as Record<string | symbol, unknown>)[prop];
        }

        // Forward to target
        return (target as unknown as Record<string | symbol, unknown>)[prop];
      }
    });

    return adapterProxy as unknown as IContractAdapter<TContract, TPrivateState>;
  }
}
