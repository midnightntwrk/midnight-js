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
// The retained-era entry points run real pipelines with this release, so the era errors below are
// reachable from a call a consumer makes rather than only from an internal helper. Two are NOT
// reachable through an entry point yet and are exported for completeness:
// `Ledger8DeployUnmaintainableError` is the only refusal `deployContract`'s retained arm makes, and
// `Ledger8DeployOnV9Error` sits behind it in the era pairing table, so the pairing refusal cannot
// be observed until the deploy arm is wired.
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
  BlankVerifierKeySlotError,
  CallTxFailedError,
  ContractTypeError,
  DeployTxFailedError,
  EraArtifactMismatchError,
  type EraArtifactMismatchReason,
  EraInvariantViolationError,
  type EraSeam,
  HeadStateEraMismatchError,
  IncompleteCallTxPrivateStateConfig,
  IncompleteFindContractPrivateStateConfig,
  IndexerInconsistencyError,
  Ledger8AmbiguousEntryPointError,
  Ledger8CallTxFailedError,
  Ledger8DeployOnV9Error,
  Ledger8DeployUnmaintainableError,
  Ledger8RecipientUnmappableError,
  Ledger8SeamFailedError,
  Ledger8ShieldedSpendUnsupportedError,
  MixedEraScopeError,
  ScopedTxEraUnsupportedError,
  StaleHeadError,
  type StaleHeadOperationKind,
  type SubmitRejectionUndiagnosedCause,
  SubmitRejectionUndiagnosedError,
  type SubmittedOperation,
  TxFailedError,
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
