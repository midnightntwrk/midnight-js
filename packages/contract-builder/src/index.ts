/**
 * @midnight-ntwrk/contract-builder
 *
 * Simplified API for deploying and interacting with Midnight smart contracts
 */

// Main adapter exports
export { ContractAdapter } from './adapter/ContractAdapter.js';
export { ContractAdapterBuilder, createContractAdapter } from './adapter/ContractAdapterBuilder.js';
export { WitnessManager } from './adapter/WitnessManager.js';
export { WitnessInterceptor } from './adapter/WitnessInterceptor.js';

// Private state exports
export { PrivateStateManager } from './private-state/PrivateStateManager.js';

// Type exports
export type {
  ContractAdapter as IContractAdapter,
  AdapterConfig,
  CallEventHandler,
  SuccessEventHandler,
  ErrorEventHandler,
  WitnessCallEventHandler
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

export type {
  Witnesses,
  WitnessFunction,
  WitnessContext,
  WitnessCallEvent
} from './types/witness-types.js';

// Config exports
export { defaultAdapterConfig, mergeAdapterConfig } from './config/AdapterConfig.js';
export { defaultRetryConfig, mergeRetryConfig, calculateRetryDelay } from './config/RetryConfig.js';
export { DEFAULT_PRIVATE_STATE_CONFIG } from './config/PrivateStateConfig.js';

export type {
  PrivateStateConfig,
  ConnectWithPrivateStateOptions
} from './config/PrivateStateConfig.js';

// Error exports
export {
  AdapterError,
  DeploymentError,
  MethodCallError,
  RetryExhaustedError,
  ConfigurationError
} from './errors/AdapterError.js';

export {
  WitnessError,
  WitnessValidationError,
  WitnessAttachmentError,
  WitnessExecutionError
} from './errors/WitnessError.js';

export {
  PrivateStateError,
  PrivateStateValidationError,
  PrivateStateNotConfiguredError
} from './errors/PrivateStateError.js';

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
