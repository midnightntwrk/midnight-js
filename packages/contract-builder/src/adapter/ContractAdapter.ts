/**
 * Main Contract Adapter class that wraps a deployed contract
 */

import type { DeployedContract } from '../types/contract-types.js';
import type { AdapterConfig, ContractAdapter as IContractAdapter, CallEventHandler, SuccessEventHandler, ErrorEventHandler } from '../types/adapter-types.js';
import { createContractProxy, EventEmitter } from './ContractProxy.js';
import { mergeAdapterConfig } from '../config/AdapterConfig.js';

/**
 * ContractAdapter wraps a deployed contract and provides:
 * - Automatic method proxying with interceptors
 * - Built-in error handling
 * - Retry logic for transient failures
 * - Event emission for monitoring
 * - Logging integration
 */
export class ContractAdapter<TContract> {
  private readonly eventEmitter: EventEmitter;
  private readonly proxy: TContract & { address: string; deployTxData: any };

  constructor(
    private readonly deployedContract: DeployedContract<TContract>,
    private readonly config: AdapterConfig = {}
  ) {
    // Merge with default config
    const mergedConfig = mergeAdapterConfig(config);

    // Create event emitter
    this.eventEmitter = new EventEmitter();

    // Register any pre-configured event handlers
    if (mergedConfig.eventHandlers) {
      Object.entries(mergedConfig.eventHandlers).forEach(([event, handler]) => {
        this.eventEmitter.on(event, handler);
      });
    }

    // Create the proxy
    this.proxy = createContractProxy({
      contract: deployedContract,
      logger: mergedConfig.logger,
      retryConfig: mergedConfig.retry,
      errorHandler: mergedConfig.errorHandler,
      eventEmitter: this.eventEmitter
    });

    // Return proxy to make this object behave like the contract
    return this.createAdapterProxy();
  }

  /**
   * Register an event handler
   */
  private registerEventHandler(event: string, handler: Function): this {
    this.eventEmitter.on(event, handler);
    return this;
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
  get deployTxData(): any {
    return this.deployedContract.deployTxData;
  }

  /**
   * Creates a proxy that combines contract methods with adapter methods
   */
  private createAdapterProxy(): IContractAdapter<TContract> {
    const self = this;

    const adapterProxy = new Proxy(this.proxy, {
      get(target: any, prop: string | symbol) {
        // Handle 'on' method for event registration
        if (prop === 'on') {
          return (event: string, handler: Function) => {
            self.registerEventHandler(event, handler);
            return adapterProxy;
          };
        }

        // Handle address
        if (prop === 'address') {
          return self.address;
        }

        // Handle deployTxData
        if (prop === 'deployTxData') {
          return self.deployTxData;
        }

        // Forward to the proxied contract's callTx methods
        const callTx = target.callTx;
        if (callTx && prop in callTx) {
          return callTx[prop];
        }

        // Forward to target
        return target[prop];
      }
    });

    return adapterProxy as unknown as IContractAdapter<TContract>;
  }
}
