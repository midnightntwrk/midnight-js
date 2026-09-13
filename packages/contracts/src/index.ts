/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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
// The one member of `./internal/breadcrumbs` that is CONSUMER-FACING: an aggregator has to import
// the fixed message rather than retype it. The breadcrumb TYPES stay internal -- publishing the
// shapes would pin them as API before a second consumer has asked for them.
export { DISPATCH_BREADCRUMB_MESSAGE } from './internal/breadcrumbs';
// The era errors that serve BOTH eras. The retained era's own classes are published under the
// `Ledger8` namespace below, together with the rest of the surface that goes when the fork window
// closes -- `Ledger8.CallTxFailedError` still extends `AnyEraTxFailedError` here, so a handler
// written against the base keeps catching it.
//
// The fork-window refusals are the other group. `StaleHeadError` is raised when a submission was
// rejected and a fresh head read confirms the network crossed the fork under the operation, and it
// carries the two-step remediation for that operation kind. `SubmitRejectionUndiagnosedError` is
// the other half of that diagnosis, for a head that could not be re-read or that reported an
// EARLIER era: reported as undiagnosable rather than as a fork, because neither case establishes
// one, and carrying a registered code of its own so a retry handler branching on `hasErrorCode`
// behaves the same whichever failure came first. `ScopedTxEraUnsupportedError` and
// `MixedEraScopeError` are the scoped-transaction era rules -- a scope is refused outright on a
// head era that composes only one call per transaction, and a retained-toolchain call cannot join
// a scope at all.
//
// Deliberately no test-file names here: which suite exercises what is the kind of claim that rots
// the first time a test moves.
export {
  AnyEraTxFailedError,
  BlankVerifierKeySlotError,
  CallTxFailedError,
  ContractTypeError,
  ContractTypeMismatch,
  DeployTxFailedError,
  EraArtifactMismatchError,
  type EraArtifactMismatchOptions,
  type EraArtifactMismatchReason,
  EraInvariantViolationError,
  type EraSeam,
  HeadStateEraMismatchError,
  IncompleteCallTxPrivateStateConfig,
  IncompleteFindContractPrivateStateConfig,
  IndexerInconsistencyError,
  MixedEraScopeError,
  ScopedTransactionIdentityMismatchError,
  ScopedTxEraUnsupportedError,
  StaleHeadError,
  type StaleHeadOperationKind,
  type SubmitRejectionUndiagnosedCause,
  SubmitRejectionUndiagnosedError,
  type SubmittedOperation,
  TxFailedError,
  UnrecognisedResultEraError,
  VerifierKeyMismatchError} from './errors';
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
// The era vocabulary, which BOTH pipelines are named by, so a caller that tags or branches on an
// era never reaches for the retained-era namespace to do it.
export {
  CURRENT_PIPELINE_ERA,
  type CurrentPipelineEra,
  type PipelineEra,
  RETAINED_PIPELINE_ERA,
  type RetainedPipelineEra
} from './era';
// The receiving half of the era surface: the overloads hand a caller one era's
// result by inference, and these let a caller who RECEIVES either one declare a
// parameter for both and narrow it by name.
export { type AnyEraFinalizedCallTxData, type AnyEraSubmittedCallTx, isLedger8Result } from './era-results';
// The RETAINED era, whole, under one name. The entry-point overloads select these types by
// inference, and inference alone does not let a consumer NAME one -- `Ledger8.FinalizedCallTxData`
// is how a caller declares the result it was handed, and `Ledger8.Contract` how it constrains a
// helper of its own.
//
// One export rather than the thirty-seven it re-exports, because the retained era is transitional
// and a flat family is not: see `docs/retained-era-namespace.md` for what qualifies for membership,
// what is deliberately held back, and how the whole surface is withdrawn in one step.
export * as Ledger8 from './ledger8';
export { submitCallTx, submitCallTxAsync, type SubmitCallTxProviders } from './submit-call-tx';
export { DeployTxOptions,submitDeployTx } from './submit-deploy-tx';
export { submitTx, submitTxAsync, SubmitTxOptions, SubmitTxProviders } from './submit-tx';
export {
  isTransactionContext,
  ScopedTransactionOptions,
  TransactionContext,
  withContractScopedTransaction
} from './transaction';
export { CircuitCallTxInterface, createCallTxOptions, createCircuitCallTxInterface } from './tx-interfaces';
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
  type CrossContractConfig,
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
