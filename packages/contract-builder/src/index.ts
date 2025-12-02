/**
 * @midnight-ntwrk/contract-builder
 *
 * Simplified API for deploying and interacting with Midnight smart contracts
 */

// Main adapter exports
export { ContractAdapter } from './adapter/ContractAdapter.js';
export { ContractAdapterBuilder, createContractAdapter } from './adapter/ContractAdapterBuilder.js';

// Type exports
export type {
  ContractAdapter as IContractAdapter,
  AdapterConfig,
  CallEventHandler,
  SuccessEventHandler,
  ErrorEventHandler
} from './types/adapter-types.js';

export type {
  DeployedContract,
  ContractProviders,
  Logger,
  RetryConfig,
  MethodCallEvent,
  MethodSuccessEvent,
  MethodErrorEvent
} from './types/contract-types.js';

// Config exports
export { defaultAdapterConfig, mergeAdapterConfig } from './config/AdapterConfig.js';
export { defaultRetryConfig, mergeRetryConfig, calculateRetryDelay } from './config/RetryConfig.js';

// Error exports
export {
  AdapterError,
  DeploymentError,
  MethodCallError,
  RetryExhaustedError,
  ConfigurationError
} from './errors/AdapterError.js';

// Utility exports
export { withRetry } from './utils/retry-logic.js';
export { noopLogger, consoleLogger, createPrefixedLogger } from './utils/logger-wrapper.js';
export { isFunction, isObject, isPromise, safeStringify } from './utils/type-helpers.js';

// Provider exports
export {
  createDefaultProviders,
  createTestnetProviders,
  createDevnetProviders,
  createLocalProviders,
  detectEnvironment,
  resolveEnvironment,
  isNodeJS,
  isBrowser,
  NETWORK_PRESETS
} from './providers/index.js';

export type {
  ProviderEnvironment,
  NetworkConfig,
  WalletConfig,
  ProviderPresetConfig,
  ContractProvidersConfig,
  NetworkPreset
} from './providers/index.js';
