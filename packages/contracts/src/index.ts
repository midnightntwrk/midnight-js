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
// The era errors below become reachable with this release: the retained-era entry points now run
// real pipelines, so a consumer can catch them. Each class documents its own condition and
// remediation, and each is exercised through an entry point in `src/test/keep-state.test.ts`,
// `src/test/v8-native.test.ts`, `src/test/stale-head.test.ts` or `src/test/scoped-era.test.ts`.
//
// `Ledger8DeployOnV9Error` is the ONE exception: it is exported as the published name for a
// refusal that is currently DORMANT rather than one a consumer can provoke, because
// `deployContract`'s retained arm refuses unconditionally before any head is read. Its negative is
// therefore against an internal function, not an entry point. It becomes consumer-reachable on the
// day the era seam carries a maintenance authority.
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
  Ledger8DeployOnV9Error,
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
// The retained-era type family. Exported for the same reason the current era's
// equivalents are: the entry-point OVERLOADS select these types by inference,
// but inference alone does not let a consumer NAME one. Without these a caller
// can make a retained-era call and still not write
// `function handle(r: Ledger8FinalizedCallTxData<C, K>)`, declare a variable of
// the result type, or constrain a helper of their own by `Ledger8Contract`.
//
// A name appearing in the emitted `.d.ts` because an overload signature
// mentions it is NOT the same as that name being exported, and this package
// publishes only a `"."` entry, so there is no subpath to reach them through
// either. `Awaited<ReturnType<typeof submitCallTx>>` is no substitute: it
// resolves from the LAST overload by design, so it hands back the current-era
// shape -- the wrong type for a retained-era call.
//
// The whole family goes out together rather than just the four result types: a
// consumer who cannot also name `Ledger8Circuit` and `Ledger8Witness` cannot
// declare a contract type that satisfies `Ledger8Contract` in the first place.
// The `AnyLedger8*` aliases stay internal -- they exist to widen the
// era-dispatching IMPLEMENTATION signatures and are never a signature a caller
// sees.
export type {
  Ledger8CallTxOptions,
  Ledger8CallTxOptionsBase,
  Ledger8CallTxOptionsWithPrivateStateId,
  Ledger8CallTxTarget,
  Ledger8Circuit,
  Ledger8CircuitContext,
  Ledger8CircuitId,
  Ledger8CircuitParameters,
  Ledger8CircuitResult,
  Ledger8ConstructorResult,
  Ledger8Contract,
  Ledger8ContractProviders,
  Ledger8DeployContractOptions,
  Ledger8DeployedContract,
  Ledger8FinalizedCallTxData,
  Ledger8FindDeployedContractOptions,
  Ledger8FoundContract,
  Ledger8PrivateState,
  Ledger8SubmittedCallTx,
  Ledger8Witness
} from './ledger8-contract';
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
