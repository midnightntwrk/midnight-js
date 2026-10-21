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

/**
 * Everything the RETAINED era publishes, under one name.
 *
 * The barrel re-exports this module as `Ledger8`, so a caller writes
 * `Ledger8.FoundContract<C>` and `Ledger8.CallTxFailedError`. The era prefix is
 * dropped inside, because the namespace already carries it -- so a declaration
 * this reference calls `Ledger8X` is the member published as `Ledger8.X`.
 *
 * Membership is the retained era's own family: its contract and result types,
 * and the refusals its pipeline raises. Names that serve
 * BOTH eras stay on the flat surface, so a consumer that only receives results
 * never imports the transitional half.
 *
 * @see {@link RetainedEraNamespace} for what qualifies, what stays flat, and
 *      how the surface is withdrawn.
 */

export {
  Ledger8AmbiguousEntryPointError as AmbiguousEntryPointError,
  Ledger8ArtifactOnLedger9StateError as ArtifactOnLedger9StateError,
  Ledger8CallTxFailedError as CallTxFailedError,
  Ledger8ContractStateUnsupportedError as ContractStateUnsupportedError,
  Ledger8DeployNotStoredError as DeployNotStoredError,
  Ledger8DeployOnLedger9Error as DeployOnLedger9Error,
  Ledger8DeployTxFailedError as DeployTxFailedError,
  Ledger8DeployUnconfirmedError as DeployUnconfirmedError,
  Ledger8MaintenanceOnLedger9Error as MaintenanceOnLedger9Error,
  Ledger8RecipientUnmappableError as RecipientUnmappableError,
  Ledger8ReplaceAuthorityUnconfirmedError as ReplaceAuthorityUnconfirmedError,
  Ledger8ShieldedSpendUnsupportedError as ShieldedSpendUnsupportedError,
  Ledger8SigningKeyNotStoredError as SigningKeyNotStoredError,
  Ledger8SigningKeyUnavailableError as SigningKeyUnavailableError,
  Ledger8SigningKeyUnusableError as SigningKeyUnusableError
} from './errors';
export {
  Ledger8InsertVerifierKeyTxFailedError as InsertVerifierKeyTxFailedError,
  Ledger8RemoveVerifierKeyTxFailedError as RemoveVerifierKeyTxFailedError,
  Ledger8ReplaceMaintenanceAuthorityTxFailedError as ReplaceMaintenanceAuthorityTxFailedError
} from './governance/errors';
export type {
  Ledger8CallResultPrivate as CallResultPrivate,
  Ledger8CallResultPublic as CallResultPublic,
  Ledger8CallTxOptions as CallTxOptions,
  Ledger8CallTxOptionsBase as CallTxOptionsBase,
  Ledger8CallTxOptionsWithPrivateStateId as CallTxOptionsWithPrivateStateId,
  Ledger8CallTxTarget as CallTxTarget,
  Ledger8Circuit as Circuit,
  Ledger8CircuitCallTxInterface as CircuitCallTxInterface,
  Ledger8CircuitContext as CircuitContext,
  Ledger8CircuitId as CircuitId,
  Ledger8CircuitMaintenanceTxInterface as CircuitMaintenanceTxInterface,
  Ledger8CircuitMaintenanceTxInterfaces as CircuitMaintenanceTxInterfaces,
  Ledger8CircuitParameters as CircuitParameters,
  Ledger8CircuitResult as CircuitResult,
  Ledger8CircuitReturnType as CircuitReturnType,
  Ledger8ConstructorParameters as ConstructorParameters,
  Ledger8Contract as Contract,
  Ledger8ContractCall as ContractCall,
  Ledger8ContractCallPublic as ContractCallPublic,
  Ledger8ContractMaintenanceTxInterface as ContractMaintenanceTxInterface,
  Ledger8ContractProviders as ContractProviders,
  Ledger8DeployContractOptions as DeployContractOptions,
  Ledger8DeployContractOptionsBase as DeployContractOptionsBase,
  Ledger8DeployContractOptionsWithPrivateState as DeployContractOptionsWithPrivateState,
  Ledger8DeployedContract as DeployedContract,
  Ledger8DeployTxData as DeployTxData,
  Ledger8FinalizedCallTxData as FinalizedCallTxData,
  Ledger8FinalizedCallTxPublicData as FinalizedCallTxPublicData,
  Ledger8FinalizedMaintenanceTxData as FinalizedMaintenanceTxData,
  Ledger8FindDeployedContractOptions as FindDeployedContractOptions,
  Ledger8FoundContract as FoundContract,
  Ledger8FoundDeployTxData as FoundDeployTxData,
  Ledger8InitialStateResult as InitialStateResult,
  Ledger8PrivateState as PrivateState,
  Ledger8SubmittedCallTx as SubmittedCallTx,
  Ledger8UnsubmittedCallTxData as UnsubmittedCallTxData,
  Ledger8Witness as Witness
} from './ledger8-contract';
