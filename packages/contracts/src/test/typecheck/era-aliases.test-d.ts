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
import { describe, expectTypeOf, it } from 'vitest';

import type { Contract as Twin018Contract } from '../../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/contract/index.js';
import type {
  CallResultPrivate,
  CallTxOptions,
  CallTxOptionsBase,
  CallTxOptionsWithPrivateStateId,
  CircuitCallTxInterface,
  CircuitMaintenanceTxInterfaces,
  ContractProviders,
  DeployContractOptions,
  DeployContractOptionsBase,
  DeployContractOptionsWithPrivateState,
  DeployedContract,
  FinalizedCallTxData,
  FinalizedDeployTxData,
  FindDeployedContractOptions,
  FoundContract,
  FoundDeployTxData,
  Ledger8,
  Ledger9CallResultPrivate,
  Ledger9CallTxOptions,
  Ledger9CallTxOptionsBase,
  Ledger9CallTxOptionsWithPrivateStateId,
  Ledger9CircuitCallTxInterface,
  Ledger9CircuitMaintenanceTxInterfaces,
  Ledger9Contract,
  Ledger9ContractProviders,
  Ledger9DeployContractOptions,
  Ledger9DeployContractOptionsBase,
  Ledger9DeployContractOptionsWithPrivateState,
  Ledger9DeployedContract,
  Ledger9FinalizedCallTxData,
  Ledger9FinalizedDeployTxData,
  Ledger9FindDeployedContractOptions,
  Ledger9FoundContract,
  Ledger9FoundDeployTxData,
  Ledger9SubmittedCallTx,
  Ledger9UnsubmittedCallTxData,
  SubmittedCallTx,
  UnsubmittedCallTxData
} from '../../index';
import type { Counter016Contract } from '../ledger8-fixture-types';

type V9 = Twin018Contract<{ readonly round: bigint }>;
type V8 = Counter016Contract;
type K = 'increment';

describe('a flat name picks the variant of the era that compiled the contract', () => {
  it('resolves to the ledger 9 variant for a ledger 9 artifact', () => {
    expectTypeOf<FoundContract<V9>>().toEqualTypeOf<Ledger9FoundContract<V9>>();
    expectTypeOf<DeployedContract<V9>>().toEqualTypeOf<Ledger9DeployedContract<V9>>();
    expectTypeOf<FinalizedCallTxData<V9, K>>().toEqualTypeOf<Ledger9FinalizedCallTxData<V9, K>>();
    expectTypeOf<SubmittedCallTx<V9, K>>().toEqualTypeOf<Ledger9SubmittedCallTx<V9, K>>();
    expectTypeOf<UnsubmittedCallTxData<V9, K>>().toEqualTypeOf<Ledger9UnsubmittedCallTxData<V9, K>>();
    expectTypeOf<FoundDeployTxData<V9>>().toEqualTypeOf<Ledger9FoundDeployTxData<V9>>();
    expectTypeOf<FinalizedDeployTxData<V9>>().toEqualTypeOf<Ledger9FinalizedDeployTxData<V9>>();
    expectTypeOf<CallResultPrivate<V9, K>>().toEqualTypeOf<Ledger9CallResultPrivate<V9, K>>();
    expectTypeOf<CallTxOptions<V9, K>>().toEqualTypeOf<Ledger9CallTxOptions<V9, K>>();
    expectTypeOf<CallTxOptionsBase<V9, K>>().toEqualTypeOf<Ledger9CallTxOptionsBase<V9, K>>();
    expectTypeOf<CallTxOptionsWithPrivateStateId<V9, K>>().toEqualTypeOf<Ledger9CallTxOptionsWithPrivateStateId<V9, K>>();
    expectTypeOf<DeployContractOptions<V9>>().toEqualTypeOf<Ledger9DeployContractOptions<V9>>();
    expectTypeOf<DeployContractOptionsBase<V9>>().toEqualTypeOf<Ledger9DeployContractOptionsBase<V9>>();
    expectTypeOf<DeployContractOptionsWithPrivateState<V9>>().toEqualTypeOf<
      Ledger9DeployContractOptionsWithPrivateState<V9>
    >();
    expectTypeOf<FindDeployedContractOptions<V9>>().toEqualTypeOf<Ledger9FindDeployedContractOptions<V9>>();
    expectTypeOf<CircuitCallTxInterface<V9>>().toEqualTypeOf<Ledger9CircuitCallTxInterface<V9>>();
    expectTypeOf<CircuitMaintenanceTxInterfaces<V9>>().toEqualTypeOf<Ledger9CircuitMaintenanceTxInterfaces<V9>>();
    expectTypeOf<ContractProviders<V9, K>>().toEqualTypeOf<Ledger9ContractProviders<V9, K>>();
  });

  it('resolves to the ledger 8 variant for a ledger 8 artifact', () => {
    expectTypeOf<FoundContract<V8>>().toEqualTypeOf<Ledger8.FoundContract<V8>>();
    expectTypeOf<DeployedContract<V8>>().toEqualTypeOf<Ledger8.DeployedContract<V8>>();
    expectTypeOf<FinalizedCallTxData<V8, K>>().toEqualTypeOf<Ledger8.FinalizedCallTxData<V8, K>>();
    expectTypeOf<SubmittedCallTx<V8, K>>().toEqualTypeOf<Ledger8.SubmittedCallTx<V8, K>>();
    expectTypeOf<UnsubmittedCallTxData<V8, K>>().toEqualTypeOf<Ledger8.UnsubmittedCallTxData<V8, K>>();
    expectTypeOf<FoundDeployTxData<V8>>().toEqualTypeOf<Ledger8.FoundDeployTxData<V8>>();
    expectTypeOf<FinalizedDeployTxData<V8>>().toEqualTypeOf<Ledger8.DeployTxData<V8>>();
    expectTypeOf<CallResultPrivate<V8, K>>().toEqualTypeOf<Ledger8.CallResultPrivate<V8, K>>();
    expectTypeOf<CallTxOptions<V8, K>>().toEqualTypeOf<Ledger8.CallTxOptions<V8, K>>();
    expectTypeOf<CallTxOptionsBase<V8, K>>().toEqualTypeOf<Ledger8.CallTxOptionsBase<V8, K>>();
    expectTypeOf<CallTxOptionsWithPrivateStateId<V8, K>>().toEqualTypeOf<Ledger8.CallTxOptionsWithPrivateStateId<V8, K>>();
    expectTypeOf<DeployContractOptions<V8>>().toEqualTypeOf<Ledger8.DeployContractOptions<V8>>();
    expectTypeOf<DeployContractOptionsBase<V8>>().toEqualTypeOf<Ledger8.DeployContractOptionsBase<V8>>();
    expectTypeOf<DeployContractOptionsWithPrivateState<V8>>().toEqualTypeOf<
      Ledger8.DeployContractOptionsWithPrivateState<V8>
    >();
    expectTypeOf<FindDeployedContractOptions<V8>>().toEqualTypeOf<Ledger8.FindDeployedContractOptions<V8>>();
    expectTypeOf<CircuitCallTxInterface<V8>>().toEqualTypeOf<Ledger8.CircuitCallTxInterface<V8>>();
    expectTypeOf<CircuitMaintenanceTxInterfaces<V8>>().toEqualTypeOf<Ledger8.CircuitMaintenanceTxInterfaces<V8>>();
    expectTypeOf<ContractProviders<V8, K>>().toEqualTypeOf<Ledger8.ContractProviders<V8, K>>();
  });

  it('keeps the ledger 9 provider set when no contract is named', () => {
    expectTypeOf<ContractProviders>().toEqualTypeOf<Ledger9ContractProviders>();
  });

  it('refuses a circuit id the contract does not declare', () => {
    // @ts-expect-error 'decrement' is not a circuit of the ledger 9 twin
    expectTypeOf<FinalizedCallTxData<V9, 'decrement'>>().toBeObject();
    // @ts-expect-error 'decrement' is not a circuit of the ledger 8 counter
    expectTypeOf<FinalizedCallTxData<V8, 'decrement'>>().toBeObject();
  });
});

describe('generic code names an era', () => {
  it('cannot pass a ledger 9 circuit id of a generic contract to a flat name', () => {
    const publicOf = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
      // @ts-expect-error the circuit ids of a generic C stay unresolved until C is known
      data: FinalizedCallTxData<C, PCK>
    ) => data.public;

    expectTypeOf(publicOf).toBeFunction();
  });

  it('passes it to the era-named type', () => {
    const publicOf = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
      data: Ledger9FinalizedCallTxData<C, PCK>
    ) => data.public;

    expectTypeOf(publicOf).toBeFunction();
  });
});

describe('the ledger 9 contract', () => {
  it('is any contract the ledger 9 toolchain compiles', () => {
    expectTypeOf<Ledger9Contract>().toEqualTypeOf<Contract.Any>();
  });
});
