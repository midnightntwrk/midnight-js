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
 * `Ledger8.FoundContract<C>` and `Ledger8.CallTxFailedError` -- the retained
 * twin of the flat current-era name it mirrors. The era prefix is dropped
 * inside, because the namespace already carries it.
 *
 * Membership is exactly the surface that disappears when the fork window
 * closes. Names that serve BOTH eras stay on the flat surface, so a consumer
 * that only receives results never imports the transitional half. See
 * `docs/retained-era-namespace.md`.
 */

export {
  Ledger8AmbiguousEntryPointError as AmbiguousEntryPointError,
  Ledger8CallTxFailedError as CallTxFailedError,
  Ledger8DeployOnV9Error as DeployOnV9Error,
  Ledger8DeployUnmaintainableError as DeployUnmaintainableError,
  Ledger8RecipientUnmappableError as RecipientUnmappableError,
  Ledger8SeamFailedError as SeamFailedError,
  Ledger8ShieldedSpendUnsupportedError as ShieldedSpendUnsupportedError
} from './errors';
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
  Ledger8CircuitParameters as CircuitParameters,
  Ledger8CircuitResult as CircuitResult,
  Ledger8CircuitReturnType as CircuitReturnType,
  Ledger8ConstructorParameters as ConstructorParameters,
  Ledger8Contract as Contract,
  Ledger8ContractCall as ContractCall,
  Ledger8ContractCallPublic as ContractCallPublic,
  Ledger8ContractProviders as ContractProviders,
  Ledger8DeployContractOptions as DeployContractOptions,
  Ledger8DeployContractOptionsBase as DeployContractOptionsBase,
  Ledger8FinalizedCallTxData as FinalizedCallTxData,
  Ledger8FinalizedCallTxPublicData as FinalizedCallTxPublicData,
  Ledger8FindDeployedContractOptions as FindDeployedContractOptions,
  Ledger8FoundContract as FoundContract,
  Ledger8InitialStateResult as InitialStateResult,
  Ledger8PrivateState as PrivateState,
  Ledger8SubmittedCallTx as SubmittedCallTx,
  Ledger8UnsubmittedCallTxData as UnsubmittedCallTxData,
  Ledger8Witness as Witness
} from './ledger8-contract';
export { createLedger8CircuitCallTxInterface as createCircuitCallTxInterface } from './tx-interfaces';
