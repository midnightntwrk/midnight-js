/**
 * @midnight-ntwrk/contract-builder
 *
 * Simplified API for deploying and interacting with Midnight smart contracts
 */

// Main adapter exports
export { ContractAdapter } from './adapter/ContractAdapter.js';
export { ContractAdapterBuilder, createContractAdapter } from './adapter/ContractAdapterBuilder.js';
export { WitnessInterceptor } from './adapter/WitnessInterceptor.js';
export { WitnessManager } from './adapter/WitnessManager.js';

// Private state exports
export { PrivateStateManager } from './private-state/PrivateStateManager.js';

// Type exports
export type {
  AdapterConfig,
  ContractAdapter as IContractAdapter
} from './types/adapter-types.js';
export type {
  ContractProviders,
  DeployedContract,
  Logger,
  MethodCallEvent,
  MethodErrorEvent,
  MethodSuccessEvent,
  RetryConfig} from './types/contract-types.js';
export type {
  WitnessCallEvent,
  WitnessContext,
  Witnesses,
  WitnessFunction} from './types/witness-types.js';

// Utility types for advanced TypeScript usage
export type {
  FunctionProperties,
  FunctionPropertyNames,
  NonNullish,
  PartialKeys,
  Prettify,
  RequireKeys,
  UnwrapPromise} from './types/type-utils.js';

// Config exports
export { defaultAdapterConfig, mergeAdapterConfig } from './config/AdapterConfig.js';
export type {
  ConnectWithPrivateStateOptions,
  PrivateStateConfig} from './config/PrivateStateConfig.js';
export { DEFAULT_PRIVATE_STATE_CONFIG } from './config/PrivateStateConfig.js';
export { calculateRetryDelay,defaultRetryConfig, mergeRetryConfig } from './config/RetryConfig.js';

// Error exports
export {
  AdapterError,
  ConfigurationError,
  DeploymentError,
  MethodCallError,
  RetryExhaustedError} from './errors/AdapterError.js';
export {
  PrivateStateError,
  PrivateStateNotConfiguredError,
  PrivateStateValidationError} from './errors/PrivateStateError.js';
export {
  WitnessAttachmentError,
  WitnessError,
  WitnessExecutionError,
  WitnessValidationError} from './errors/WitnessError.js';

// Utility exports
export { consoleLogger, createPrefixedLogger,noopLogger } from './utils/logger-wrapper.js';
export { withRetry } from './utils/retry-logic.js';
export { isFunction, isObject, isPromise, safeStringify } from './utils/type-helpers.js';

// Provider exports
export type {
  ContractProvidersConfig,
  NetworkConfig,
  NetworkPreset,
  ProviderEnvironment,
  ProviderPresetConfig,
  WalletConfig} from './providers/index.js';
export {
  createDefaultProviders,
  createDevnetProviders,
  createLocalProviders,
  createTestnetProviders,
  detectEnvironment,
  isBrowser,
  isNodeJS,
  NETWORK_PRESETS,
  resolveEnvironment} from './providers/index.js';

// Re-export core contract utilities from @midnight-ntwrk/midnight-js-contracts
export {
  call,
  callContractConstructor,
  deployContract,
  findDeployedContract,
  submitCallTx,
  submitDeployTx,
  submitTx,
  submitTxAsync
} from '@midnight-ntwrk/midnight-js-contracts';

// Re-export types from @midnight-ntwrk/midnight-js-types
export type {
  Contract,
  FinalizedTxData,
  ImpureCircuitId,
  MidnightProvider,
  PrivateStateProvider,
  ProofProvider,
  PublicDataProvider,
  WalletProvider,
  ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';

// Re-export common utilities from @midnight-ntwrk/midnight-js-utils
export {
  assertIsContractAddress,
  parseCoinPublicKeyToHex,
  ttlOneHour
} from '@midnight-ntwrk/midnight-js-utils';
