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

import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';

import type { Ledger9CallResultPrivate } from './call';
import type { Ledger9ContractProviders } from './contract-providers';
import type {
  Ledger9DeployContractOptions,
  Ledger9DeployContractOptionsBase,
  Ledger9DeployContractOptionsWithPrivateState,
  Ledger9DeployedContract
} from './deploy-contract';
import type { Ledger9FindDeployedContractOptions, Ledger9FoundContract } from './find-deployed-contract';
import type { Ledger9CircuitMaintenanceTxInterfaces } from './governance';
import type {
  Ledger8CallResultPrivate,
  Ledger8CallTxOptions,
  Ledger8CallTxOptionsBase,
  Ledger8CallTxOptionsWithPrivateStateId,
  Ledger8CircuitCallTxInterface,
  Ledger8CircuitId,
  Ledger8CircuitMaintenanceTxInterfaces,
  Ledger8Contract,
  Ledger8ContractProviders,
  Ledger8DeployContractOptions,
  Ledger8DeployContractOptionsBase,
  Ledger8DeployContractOptionsWithPrivateState,
  Ledger8DeployedContract,
  Ledger8DeployTxData,
  Ledger8FinalizedCallTxData,
  Ledger8FindDeployedContractOptions,
  Ledger8FoundContract,
  Ledger8FoundDeployTxData,
  Ledger8SubmittedCallTx,
  Ledger8UnsubmittedCallTxData
} from './ledger8-contract';
import type { Ledger9CircuitCallTxInterface } from './tx-interfaces';
import type {
  Ledger9FinalizedCallTxData,
  Ledger9FinalizedDeployTxData,
  Ledger9FoundDeployTxData,
  Ledger9SubmittedCallTx,
  Ledger9UnsubmittedCallTxData
} from './tx-model';
import type { Ledger9CallTxOptions, Ledger9CallTxOptionsBase, Ledger9CallTxOptionsWithPrivateStateId } from './unproven-call-tx';

/**
 * A contract compiled with the ledger 9 Compact toolchain.
 */
export type Ledger9Contract = Contract.Any;

/**
 * A contract compiled with the toolchain of any ledger era this release serves.
 */
export type AnyEraContract = Ledger8Contract | Ledger9Contract;

/**
 * The circuit ids of `C`, read the way the era that compiled `C` reads them.
 */
export type CircuitIdOf<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8CircuitId<C>
  : C extends Ledger9Contract
    ? Contract.ProvableCircuitId<C>
    : never;

// Every flat name below picks the variant of the era that compiled `C`.

/** The contract found at an address. Generic code names an era: `Ledger9FoundContract<C>`. */
export type FoundContract<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8FoundContract<C>
  : C extends Ledger9Contract
    ? Ledger9FoundContract<C>
    : never;

/** The contract a deploy created. Generic code names an era: `Ledger9DeployedContract<C>`. */
export type DeployedContract<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8DeployedContract<C>
  : C extends Ledger9Contract
    ? Ledger9DeployedContract<C>
    : never;

/** A finalized circuit call. Generic code names an era: `Ledger9FinalizedCallTxData<C, K>`. */
export type FinalizedCallTxData<C extends AnyEraContract, K extends CircuitIdOf<C>> = C extends Ledger8Contract
  ? Ledger8FinalizedCallTxData<C, K & Ledger8CircuitId<C>>
  : C extends Ledger9Contract
    ? Ledger9FinalizedCallTxData<C, K & Contract.ProvableCircuitId<C>>
    : never;

/** A submitted, not yet finalized circuit call. Generic code names an era: `Ledger9SubmittedCallTx<C, K>`. */
export type SubmittedCallTx<C extends AnyEraContract, K extends CircuitIdOf<C>> = C extends Ledger8Contract
  ? Ledger8SubmittedCallTx<C, K & Ledger8CircuitId<C>>
  : C extends Ledger9Contract
    ? Ledger9SubmittedCallTx<C, K & Contract.ProvableCircuitId<C>>
    : never;

/** A proven circuit call, not yet submitted. Generic code names an era: `Ledger9UnsubmittedCallTxData<C, K>`. */
export type UnsubmittedCallTxData<C extends AnyEraContract, K extends CircuitIdOf<C>> = C extends Ledger8Contract
  ? Ledger8UnsubmittedCallTxData<C, K & Ledger8CircuitId<C>>
  : C extends Ledger9Contract
    ? Ledger9UnsubmittedCallTxData<C, K & Contract.ProvableCircuitId<C>>
    : never;

/** The deploy transaction of a found contract. Generic code names an era: `Ledger9FoundDeployTxData<C>`. */
export type FoundDeployTxData<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8FoundDeployTxData<C>
  : C extends Ledger9Contract
    ? Ledger9FoundDeployTxData<C>
    : never;

/** A finalized deploy. Generic code names an era: `Ledger9FinalizedDeployTxData<C>` or `Ledger8.DeployTxData<C>`. */
export type FinalizedDeployTxData<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8DeployTxData<C>
  : C extends Ledger9Contract
    ? Ledger9FinalizedDeployTxData<C>
    : never;

/** The private result of a circuit call. Generic code names an era: `Ledger9CallResultPrivate<C, K>`. */
export type CallResultPrivate<C extends AnyEraContract, K extends CircuitIdOf<C>> = C extends Ledger8Contract
  ? Ledger8CallResultPrivate<C, K & Ledger8CircuitId<C>>
  : C extends Ledger9Contract
    ? Ledger9CallResultPrivate<C, K & Contract.ProvableCircuitId<C>>
    : never;

/** The options of a circuit call. Generic code names an era: `Ledger9CallTxOptions<C, K>`. */
export type CallTxOptions<C extends AnyEraContract, K extends CircuitIdOf<C>> = C extends Ledger8Contract
  ? Ledger8CallTxOptions<C, K & Ledger8CircuitId<C>>
  : C extends Ledger9Contract
    ? Ledger9CallTxOptions<C, K & Contract.ProvableCircuitId<C>>
    : never;

/** The options of a circuit call without private state. Generic code names an era: `Ledger9CallTxOptionsBase<C, K>`. */
export type CallTxOptionsBase<C extends AnyEraContract, K extends CircuitIdOf<C>> = C extends Ledger8Contract
  ? Ledger8CallTxOptionsBase<C, K & Ledger8CircuitId<C>>
  : C extends Ledger9Contract
    ? Ledger9CallTxOptionsBase<C, K & Contract.ProvableCircuitId<C>>
    : never;

/** The options of a circuit call with a private state id. Generic code names an era: `Ledger9CallTxOptionsWithPrivateStateId<C, K>`. */
export type CallTxOptionsWithPrivateStateId<C extends AnyEraContract, K extends CircuitIdOf<C>> = C extends Ledger8Contract
  ? Ledger8CallTxOptionsWithPrivateStateId<C, K & Ledger8CircuitId<C>>
  : C extends Ledger9Contract
    ? Ledger9CallTxOptionsWithPrivateStateId<C, K & Contract.ProvableCircuitId<C>>
    : never;

/** The options of `deployContract`. Generic code names an era: `Ledger9DeployContractOptions<C>`. */
export type DeployContractOptions<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8DeployContractOptions<C>
  : C extends Ledger9Contract
    ? Ledger9DeployContractOptions<C>
    : never;

/** The options of `deployContract` without private state. Generic code names an era: `Ledger9DeployContractOptionsBase<C>`. */
export type DeployContractOptionsBase<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8DeployContractOptionsBase<C>
  : C extends Ledger9Contract
    ? Ledger9DeployContractOptionsBase<C>
    : never;

/** The options of `deployContract` with private state. Generic code names an era: `Ledger9DeployContractOptionsWithPrivateState<C>`. */
export type DeployContractOptionsWithPrivateState<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8DeployContractOptionsWithPrivateState<C>
  : C extends Ledger9Contract
    ? Ledger9DeployContractOptionsWithPrivateState<C>
    : never;

/** The options of `findDeployedContract`. Generic code names an era: `Ledger9FindDeployedContractOptions<C>`. */
export type FindDeployedContractOptions<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8FindDeployedContractOptions<C>
  : C extends Ledger9Contract
    ? Ledger9FindDeployedContractOptions<C>
    : never;

/** One call function per circuit. Generic code names an era: `Ledger9CircuitCallTxInterface<C>`. */
export type CircuitCallTxInterface<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8CircuitCallTxInterface<C>
  : C extends Ledger9Contract
    ? Ledger9CircuitCallTxInterface<C>
    : never;

/** One maintenance interface per circuit. Generic code names an era: `Ledger9CircuitMaintenanceTxInterfaces<C>`. */
export type CircuitMaintenanceTxInterfaces<C extends AnyEraContract> = C extends Ledger8Contract
  ? Ledger8CircuitMaintenanceTxInterfaces<C>
  : C extends Ledger9Contract
    ? Ledger9CircuitMaintenanceTxInterfaces<C>
    : never;

/**
 * The providers a contract needs. With no contract named, the ledger 9 set.
 * Generic code names an era: `Ledger9ContractProviders<C, K>`.
 */
export type ContractProviders<
  C extends AnyEraContract = Ledger9Contract,
  K extends CircuitIdOf<C> = CircuitIdOf<C>
> = C extends Ledger8Contract
  ? Ledger8ContractProviders<C, K & Ledger8CircuitId<C>>
  : C extends Ledger9Contract
    ? Ledger9ContractProviders<C, K & Contract.ProvableCircuitId<C>>
    : never;
