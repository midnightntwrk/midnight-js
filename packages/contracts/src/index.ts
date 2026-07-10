/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

export {
  CallOptions,
  CallOptionsBase,
  CallOptionsProviderDataDependencies,
  CallOptionsWithArguments,
  CallOptionsWithPrivateState,
  CallOptionsWithProviderDataDependencies,
  CallResult,
  CallResultPrivate,
  CallResultPublic
} from './call';
export {
  ContractConstructorOptions,
  ContractConstructorOptionsBase,
  ContractConstructorOptionsProviderDataDependencies,
  ContractConstructorOptionsWithArguments,
  ContractConstructorOptionsWithPrivateState,
  ContractConstructorOptionsWithProviderDataDependencies,
  ContractConstructorResult} from './call-constructor';
export { ContractProviders } from './contract-providers';
export {
  deployContract,
  DeployContractOptions,
  DeployContractOptionsBase,
  DeployContractOptionsWithPrivateState,
  DeployedContract
} from './deploy-contract';
export {
  CallTxFailedError,
  ContractTypeError,
  DeployTxFailedError,
  IncompleteCallTxPrivateStateConfig,
  IncompleteFindContractPrivateStateConfig,
  TxFailedError} from './errors';
export {
  findDeployedContract,
  FindDeployedContractOptions,
  FindDeployedContractOptionsBase,
  FindDeployedContractOptionsExistingPrivateState,
  FindDeployedContractOptionsStorePrivateState,
  FoundContract,
  verifierKeysEqual,
  verifyContractState} from './find-deployed-contract';
export { ContractStates,getPublicStates, getStates, PublicContractStates } from './get-states';
export { getUnshieldedBalances } from './get-unshielded-balances';
export {
  CircuitMaintenanceTxInterface,
  CircuitMaintenanceTxInterfaces,
  ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface,
  InsertVerifierKeyTxFailedError,
  RemoveVerifierKeyTxFailedError,
  ReplaceMaintenanceAuthorityTxFailedError,
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from './governance';
export { submitCallTx, submitCallTxAsync } from './submit-call-tx';
export { DeployTxOptions,submitDeployTx } from './submit-deploy-tx';
export { submitTx, submitTxAsync, SubmitTxOptions, SubmitTxProviders } from './submit-tx';
export { ScopedTransactionOptions, TransactionContext, withContractScopedTransaction } from './transaction';
export {
  CircuitCallTxInterface,
  createCallTxOptions,
  createCircuitCallTxInterface} from './tx-interfaces';
export {
  FinalizedCallTxData,
  FinalizedCallTxPublicData,
  FinalizedDeployTxData,
  FinalizedDeployTxDataBase,
  FinalizedDeployTxPublicData,
  SubmittedCallTx,
  UnsubmittedCallTxData,
  UnsubmittedCallTxPrivateData,
  UnsubmittedDeployTxData,
  UnsubmittedDeployTxDataBase,
  UnsubmittedDeployTxPrivateData,
  UnsubmittedDeployTxPrivateDataFull,
  UnsubmittedDeployTxPublicData,
  UnsubmittedTxData} from './tx-model';
export {
  CallTxOptions,
  CallTxOptionsBase,
  CallTxOptionsWithPrivateStateId,
  createUnprovenCallTx,
  createUnprovenCallTxFromInitialStates,
  UnprovenCallTxProvidersBase,
  UnprovenCallTxProvidersWithPrivateState
} from './unproven-call-tx';
export {
  createUnprovenDeployTx,
  createUnprovenDeployTxFromVerifierKeys,
  DeployTxOptionsBase,
  DeployTxOptionsWithPrivateState,
  DeployTxOptionsWithPrivateStateId,
  UnprovenDeployTxOptions,
  UnprovenDeployTxProviders} from './unproven-deploy-tx';
// Event type and decoder for `CallResultPublic.events` (MIP-0002), re-exported so consumers can name
// the events (`LogEvent`) and decode them (`ContractLog.decodeAll`) without depending on
// compact-js/compact-runtime directly. `ContractEvent` (the decoded shape) is reachable as
// `ContractLog.ContractEvent`.
export { ContractLog } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
export type { LogEvent } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
