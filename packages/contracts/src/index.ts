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
  Ledger9CallOptions,
  Ledger9CallOptionsBase,
  Ledger9CallOptionsProviderDataDependencies,
  Ledger9CallOptionsWithArguments,
  Ledger9CallOptionsWithPrivateState,
  Ledger9CallOptionsWithProviderDataDependencies,
  Ledger9CallResult
} from './call';
export {
  ContractConstructorOptionsProviderDataDependencies,
  Ledger9ContractConstructorOptions,
  Ledger9ContractConstructorOptionsBase,
  Ledger9ContractConstructorOptionsWithArguments,
  Ledger9ContractConstructorOptionsWithPrivateState,
  Ledger9ContractConstructorOptionsWithProviderDataDependencies,
  Ledger9ContractConstructorResult} from './call-constructor';
export {
  deployContract,
  Ledger9DeployContractOptionsShared
} from './deploy-contract';
// The one member of `./internal/breadcrumbs` that is CONSUMER-FACING: an aggregator has to import
// the fixed message rather than retype it. The breadcrumb TYPES stay internal -- publishing the
// shapes would pin them as API before a second consumer has asked for them.
export { DISPATCH_BREADCRUMB_MESSAGE } from './internal/breadcrumbs';
// The era errors that serve BOTH eras. `TxFailedError` is the one failed-transaction error of both
// eras.
//
// The fork-window refusals are the other group. `ForkCrossedDuringOperationError` is raised when a submission was
// rejected and a fresh head read confirms the network crossed the fork under the operation, and it
// carries the two-step remediation for that operation kind. `SubmitRejectionUndiagnosedError` is
// the other half of that diagnosis, for a head that could not be re-read or that reported an
// EARLIER era: reported as undiagnosable rather than as a fork, because neither case establishes
// one, and carrying a registered code of its own so a retry handler branching on `hasErrorCode`
// behaves the same whichever failure came first. The scoped-transaction era rules are reasons of
// `EraMismatchError` -- a scope is refused outright on a head era that composes only one call per
// transaction, and a retained-toolchain call cannot join a scope at all.
//
// The three `Incomplete*PrivateStateConfig` refusals are one family stating one client-side rule
// per entry point -- call, deploy, find -- and they stay together on the flat surface; the deploy
// one is raised by `deployContract` on both eras and by `submitDeployTx`. Client-side private-state
// storage is era-independent, which is why the find rule is already one rule serving both eras; splitting
// the family would make three related refusals importable from two places.
//
// Deliberately no test-file names here: which suite exercises what is the kind of claim that rots
// the first time a test moves.
export {
  BlankVerifierKeySlotError,
  ContractNotFoundError,
  ContractTypeError,
  ContractTypeMismatch,
  EraInvariantViolationError,
  EraMismatchError,
  type EraMismatchOptions,
  type EraMismatchReason,
  ForkCrossedDuringOperationError,
  IncompleteCallTxPrivateStateConfig,
  IncompleteDeployContractPrivateStateConfig,
  IncompleteFindContractPrivateStateConfig,
  IndexerInconsistencyError,
  LedgerParametersUnservedError,
  NetworkVersionReadFailedError,
  NetworkVersionStateMismatchError,
  PrivateStateNotFoundError,
  ProviderFailedError,
  PublicStatesEraMismatchError,
  ScopedTransactionIdentityMismatchError,
  type SubmitRejectionUndiagnosedCause,
  SubmitRejectionUndiagnosedError,
  type SubmittedOperation,
  type SubmittedOperationKind,
  type TxFailedDetails,
  TxFailedError,
  type TxFailedOperation,
  VerifierKeyMismatchError,
  ZswapOutputResolutionError} from './errors';
export {
  findDeployedContract,
  Ledger9FindDeployedContractOptionsBase,
  Ledger9FindDeployedContractOptionsExistingPrivateState,
  Ledger9FindDeployedContractOptionsStorePrivateState,
  verifierKeysEqual,
  verifyContractState} from './find-deployed-contract';
export {
  ContractStates,
  getPublicStates,
  getStates} from './get-states';
export { getUnshieldedBalances } from './get-unshielded-balances';
export {
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface,
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from './governance';
// The receiving half of the era surface: a caller who RECEIVES a result of either era declares
// it with a flat name and narrows it with this guard.
export { isLedger8Result } from './era-results';
// The RETAINED era's refusals and the types on their public fields, flat.
export {
  Ledger8AmbiguousEntryPointError,
  Ledger8CallUnsupportedError,
  type Ledger8CallUnsupportedReason,
  type Ledger8KeyedOperation,
  Ledger8NotStoredError,
  type Ledger8NotStoredStage,
  Ledger8SigningKeyError,
  type Ledger8SigningKeyReason,
  Ledger8UnconfirmedError
} from './errors';
// The retained era's types, flat. The entry-point overloads return them by these names, and a
// dApp's declaration emit can name only what the package exports flat (TS4023).
export type {
  Ledger8CallResultPrivate,
  Ledger8CallResultPublic,
  Ledger8CallTxOptions,
  Ledger8CallTxOptionsBase,
  Ledger8CallTxOptionsWithPrivateStateId,
  Ledger8CallTxTarget,
  Ledger8Circuit,
  Ledger8CircuitCallTxInterface,
  Ledger8CircuitContext,
  Ledger8CircuitId,
  Ledger8CircuitMaintenanceTxInterface,
  Ledger8CircuitMaintenanceTxInterfaces,
  Ledger8CircuitParameters,
  Ledger8CircuitResult,
  Ledger8CircuitReturnType,
  Ledger8ConstructorParameters,
  Ledger8Contract,
  Ledger8ContractCall,
  Ledger8ContractCallPublic,
  Ledger8ContractMaintenanceTxInterface,
  Ledger8ContractProviders,
  Ledger8DeployContractOptions,
  Ledger8DeployContractOptionsBase,
  Ledger8DeployContractOptionsWithPrivateState,
  Ledger8DeployedContract,
  Ledger8FinalizedCallTxData,
  Ledger8FinalizedCallTxPublicData,
  Ledger8FinalizedDeployTxData,
  Ledger8FinalizedMaintenanceTxData,
  Ledger8FindDeployedContractOptions,
  Ledger8FoundContract,
  Ledger8FoundDeployTxData,
  Ledger8InitialStateResult,
  Ledger8PrivateState,
  Ledger8SubmittedCallTx,
  Ledger8UnsubmittedCallTxData,
  Ledger8Witness
} from './ledger8-contract';
// The flat names pick between the eras by contract type. The ledger 9 variants are flat `Ledger9*`
// names, like the ledger 8 ones above.
export type { Ledger9CallResultPrivate, Ledger9CallResultPublic } from './call';
export type { Ledger9ContractProviders } from './contract-providers';
export type {
  Ledger9DeployContractOptions,
  Ledger9DeployContractOptionsBase,
  Ledger9DeployContractOptionsWithPrivateState,
  Ledger9DeployedContract
} from './deploy-contract';
export type {
  AnyContract,
  AnyFinalizedCallTxData,
  AnySubmittedCallTx,
  CallResultPrivate,
  CallTxOptions,
  CallTxOptionsBase,
  CallTxOptionsWithPrivateStateId,
  CircuitCallTxInterface,
  CircuitIdOf,
  CircuitMaintenanceTxInterfaces,
  ContractProviders,
  DeployContractOptions,
  DeployContractOptionsBase,
  DeployContractOptionsWithPrivateState,
  DeployedContract,
  FinalizedCallTxData,
  FinalizedDeployTxData,
  FinalizedMaintenanceTxData,
  FindDeployedContractOptions,
  FoundContract,
  FoundDeployTxData,
  Ledger9CircuitId,
  Ledger9Contract,
  SubmittedCallTx,
  SubmitTxProviders,
  UnsubmittedCallTxData
} from './era-aliases';
export type { Ledger9FindDeployedContractOptions, Ledger9FoundContract } from './find-deployed-contract';
export type {
  Ledger9CircuitMaintenanceTxInterface,
  Ledger9CircuitMaintenanceTxInterfaces,
  Ledger9ContractMaintenanceTxInterface
} from './governance';
export { type Ledger9SubmitCallTxProviders,submitCallTx, submitCallTxAsync } from './submit-call-tx';
export { Ledger9DeployTxOptions, submitDeployTx, submitLedger9DeployTx } from './submit-deploy-tx';
export { Ledger9SubmitTxProviders, submitTx, submitTxAsync, SubmitTxOptions } from './submit-tx';
export {
  isLedger9TransactionContext,
  Ledger9TransactionContext,
  ScopedTransactionOptions,
  withContractScopedTransaction,
  withLedger9ContractScopedTransaction
} from './transaction';
export type { Ledger9CircuitCallTxInterface } from './tx-interfaces';
export { createCallTxOptions, createCircuitCallTxInterface } from './tx-interfaces';
export type {
  Ledger9FinalizedCallTxData,
  Ledger9FinalizedCallTxPublicData,
  Ledger9FinalizedDeployTxData,
  Ledger9FinalizedDeployTxPublicData,
  Ledger9FinalizedMaintenanceTxData,
  Ledger9FoundDeployTxData,
  Ledger9SubmittedCallTx,
  Ledger9UnsubmittedCallTxData
} from './tx-model';
export {
  FoundDeployTxPublicData,
  type Ledger8FoundDeployTxPublicData,
  Ledger9FinalizedDeployTxDataBase,
  Ledger9UnsubmittedCallTxPrivateData,
  Ledger9UnsubmittedDeployTxData,
  Ledger9UnsubmittedDeployTxDataBase,
  Ledger9UnsubmittedDeployTxPrivateData,
  Ledger9UnsubmittedDeployTxPrivateDataFull,
  Ledger9UnsubmittedTxData,  UnsubmittedDeployTxPublicData} from './tx-model';
export type {
  Ledger9CallTxOptions,
  Ledger9CallTxOptionsBase,
  Ledger9CallTxOptionsWithPrivateStateId
} from './unproven-call-tx';
export {
  createLedger9UnprovenCallTx,
  createLedger9UnprovenCallTxFromInitialStates,
  createUnprovenCallTx,
  createUnprovenCallTxFromInitialStates,
  type Ledger9CrossContractConfig,
  Ledger9UnprovenCallTxProvidersWithPrivateState,
  UnprovenCallTxProvidersBase} from './unproven-call-tx';
export {
  createLedger9UnprovenDeployTx,
  createLedger9UnprovenDeployTxFromVerifierKeys,
  createUnprovenDeployTx,
  createUnprovenDeployTxFromVerifierKeys,
  Ledger9DeployTxOptionsBase,
  Ledger9DeployTxOptionsWithPrivateState,
  Ledger9DeployTxOptionsWithPrivateStateId,
  Ledger9UnprovenDeployTxOptions,
  Ledger9UnprovenDeployTxProviders} from './unproven-deploy-tx';
// Event type and decoder for `Ledger9CallResultPublic.logEvents` (MIP-0002), re-exported so consumers can name
// the events (`Ledger9LogEvent`) and decode them (`Ledger9ContractLog.decodeAll`) without depending on
// compact-js/compact-runtime directly. `ContractEvent` (the decoded shape) is reachable as
// `Ledger9ContractLog.ContractEvent`.
export { ContractLog as Ledger9ContractLog } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
export type { LogEvent as Ledger9LogEvent } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
