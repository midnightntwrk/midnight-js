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
  ExtractLedgerFromWitness,
  ExtractPrivateStateFromWitness,
  FunctionProperties,
  FunctionPropertyNames,
  InferCircuits,
  InferContractInterface,
  InferImpureCircuits,
  InferLedger,
  InferLedgerFromContract,
  InferPrivateState,
  InferPrivateStateFromContract,
  NonNullish,
  PartialKeys,
  Prettify,
  RemoveContextParameter,
  RequireKeys,
  TransformCircuitMethods,
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
  ContractProviders,
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
