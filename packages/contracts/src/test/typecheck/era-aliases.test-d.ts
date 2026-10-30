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
  Ledger8FinalizedCallTxData,
  Ledger8FinalizedDeployTxData,
  Ledger8FinalizedMaintenanceTxData,
  Ledger8FindDeployedContractOptions,
  Ledger8FoundContract,
  Ledger8FoundDeployTxData,
  Ledger8SubmittedCallTx,
  Ledger8UnsubmittedCallTxData,
  Ledger9CallResultPrivate,
  Ledger9CallTxOptions,
  Ledger9CallTxOptionsBase,
  Ledger9CallTxOptionsWithPrivateStateId,
  Ledger9CircuitCallTxInterface,
  Ledger9CircuitId,
  Ledger9CircuitMaintenanceTxInterfaces,
  Ledger9Contract,
  Ledger9ContractProviders,
  Ledger9DeployContractOptions,
  Ledger9DeployContractOptionsBase,
  Ledger9DeployContractOptionsWithPrivateState,
  Ledger9DeployedContract,
  Ledger9FinalizedCallTxData,
  Ledger9FinalizedDeployTxData,
  Ledger9FinalizedMaintenanceTxData,
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
    expectTypeOf<FoundContract<V8>>().toEqualTypeOf<Ledger8FoundContract<V8>>();
    expectTypeOf<DeployedContract<V8>>().toEqualTypeOf<Ledger8DeployedContract<V8>>();
    expectTypeOf<FinalizedCallTxData<V8, K>>().toEqualTypeOf<Ledger8FinalizedCallTxData<V8, K>>();
    expectTypeOf<SubmittedCallTx<V8, K>>().toEqualTypeOf<Ledger8SubmittedCallTx<V8, K>>();
    expectTypeOf<UnsubmittedCallTxData<V8, K>>().toEqualTypeOf<Ledger8UnsubmittedCallTxData<V8, K>>();
    expectTypeOf<FoundDeployTxData<V8>>().toEqualTypeOf<Ledger8FoundDeployTxData<V8>>();
    expectTypeOf<FinalizedDeployTxData<V8>>().toEqualTypeOf<Ledger8FinalizedDeployTxData<V8>>();
    expectTypeOf<CallResultPrivate<V8, K>>().toEqualTypeOf<Ledger8CallResultPrivate<V8, K>>();
    expectTypeOf<CallTxOptions<V8, K>>().toEqualTypeOf<Ledger8CallTxOptions<V8, K>>();
    expectTypeOf<CallTxOptionsBase<V8, K>>().toEqualTypeOf<Ledger8CallTxOptionsBase<V8, K>>();
    expectTypeOf<CallTxOptionsWithPrivateStateId<V8, K>>().toEqualTypeOf<Ledger8CallTxOptionsWithPrivateStateId<V8, K>>();
    expectTypeOf<DeployContractOptions<V8>>().toEqualTypeOf<Ledger8DeployContractOptions<V8>>();
    expectTypeOf<DeployContractOptionsBase<V8>>().toEqualTypeOf<Ledger8DeployContractOptionsBase<V8>>();
    expectTypeOf<DeployContractOptionsWithPrivateState<V8>>().toEqualTypeOf<
      Ledger8DeployContractOptionsWithPrivateState<V8>
    >();
    expectTypeOf<FindDeployedContractOptions<V8>>().toEqualTypeOf<Ledger8FindDeployedContractOptions<V8>>();
    expectTypeOf<CircuitCallTxInterface<V8>>().toEqualTypeOf<Ledger8CircuitCallTxInterface<V8>>();
    expectTypeOf<CircuitMaintenanceTxInterfaces<V8>>().toEqualTypeOf<Ledger8CircuitMaintenanceTxInterfaces<V8>>();
    expectTypeOf<ContractProviders<V8, K>>().toEqualTypeOf<Ledger8ContractProviders<V8, K>>();
  });

  it('requires a contract to name a provider set', () => {
    // @ts-expect-error a provider set serves one contract, so the contract has to be named
    type _NoContract = ContractProviders;
  });

  it('refuses a circuit id the contract does not declare', () => {
    // @ts-expect-error 'decrement' is not a circuit of the ledger 9 twin
    type _V9FinalizedCallTxData = FinalizedCallTxData<V9, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 8 counter
    type _V8FinalizedCallTxData = FinalizedCallTxData<V8, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 9 twin
    type _V9SubmittedCallTx = SubmittedCallTx<V9, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 8 counter
    type _V8SubmittedCallTx = SubmittedCallTx<V8, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 9 twin
    type _V9UnsubmittedCallTxData = UnsubmittedCallTxData<V9, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 8 counter
    type _V8UnsubmittedCallTxData = UnsubmittedCallTxData<V8, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 9 twin
    type _V9CallResultPrivate = CallResultPrivate<V9, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 8 counter
    type _V8CallResultPrivate = CallResultPrivate<V8, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 9 twin
    type _V9CallTxOptions = CallTxOptions<V9, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 8 counter
    type _V8CallTxOptions = CallTxOptions<V8, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 9 twin
    type _V9CallTxOptionsBase = CallTxOptionsBase<V9, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 8 counter
    type _V8CallTxOptionsBase = CallTxOptionsBase<V8, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 9 twin
    type _V9CallTxOptionsWithPrivateStateId = CallTxOptionsWithPrivateStateId<V9, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 8 counter
    type _V8CallTxOptionsWithPrivateStateId = CallTxOptionsWithPrivateStateId<V8, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 9 twin
    type _V9ContractProviders = ContractProviders<V9, 'decrement'>;
    // @ts-expect-error 'decrement' is not a circuit of the ledger 8 counter
    type _V8ContractProviders = ContractProviders<V8, 'decrement'>;
  });

  it('refuses a type that is not a contract', () => {
    // @ts-expect-error a string is not a contract of any era
    type _NotAContract = FoundContract<string>;
  });

  it('picks the era of each member of a union of contracts', () => {
    expectTypeOf<FoundContract<V8 | V9>>().toEqualTypeOf<Ledger8FoundContract<V8> | Ledger9FoundContract<V9>>();
    expectTypeOf<DeployedContract<V8 | V9>>().toEqualTypeOf<Ledger8DeployedContract<V8> | Ledger9DeployedContract<V9>>();
  });
});

describe('a flat name without a contract is the union of every era', () => {
  it('names a contract of either era', () => {
    expectTypeOf<AnyContract>().toEqualTypeOf<Ledger8Contract | Ledger9Contract>();
  });

  it('names a maintenance result of either era', () => {
    expectTypeOf<FinalizedMaintenanceTxData>().toEqualTypeOf<
      Ledger8FinalizedMaintenanceTxData | Ledger9FinalizedMaintenanceTxData
    >();
  });

  it('names a finalized call of either era', () => {
    expectTypeOf<Extract<AnyFinalizedCallTxData, { era: 'v8' }>>().toEqualTypeOf<
      Ledger8FinalizedCallTxData<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>
    >();
    expectTypeOf<Exclude<AnyFinalizedCallTxData, { era: 'v8' }>['era']>().toEqualTypeOf<'v9'>();
    expectTypeOf<FinalizedCallTxData<V9, K>>().toExtend<AnyFinalizedCallTxData>();
    expectTypeOf<FinalizedCallTxData<V8, K>>().toExtend<AnyFinalizedCallTxData>();
  });

  it('names a submitted call of either era', () => {
    expectTypeOf<Extract<AnySubmittedCallTx, { era: 'v8' }>>().toEqualTypeOf<
      Ledger8SubmittedCallTx<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>
    >();
    expectTypeOf<Exclude<AnySubmittedCallTx, { era: 'v8' }>['era']>().toEqualTypeOf<'v9'>();
    expectTypeOf<SubmittedCallTx<V9, K>>().toExtend<AnySubmittedCallTx>();
    expectTypeOf<SubmittedCallTx<V8, K>>().toExtend<AnySubmittedCallTx>();
  });

  it('refuses a call result type without a contract and a circuit', () => {
    // @ts-expect-error a call result of either era is AnyFinalizedCallTxData
    type _NoContract = FinalizedCallTxData;
    // @ts-expect-error the circuit has to be named
    type _NoCircuit = FinalizedCallTxData<V9>;
    // @ts-expect-error a submitted call of either era is AnySubmittedCallTx
    type _NoContractSubmitted = SubmittedCallTx;
    // @ts-expect-error the circuit has to be named
    type _NoCircuitSubmitted = SubmittedCallTx<V9>;
  });

  it('types the circuit values as any when instantiated with AnyContract itself', () => {
    // Known limit: AnyContract is a constraint. The widest ledger 9 contract is `Contract<any>`,
    // so a value of any contract is `AnyFinalizedCallTxData`, not `FinalizedCallTxData<AnyContract, …>`.
    expectTypeOf<FinalizedCallTxData<AnyContract, CircuitIdOf<AnyContract>>['private']['result']>().toBeAny();
  });

  it('reads the circuit values of a call of either era as unknown, never any', () => {
    expectTypeOf<AnyFinalizedCallTxData['private']['result']>().toEqualTypeOf<unknown>();
    expectTypeOf<AnyFinalizedCallTxData['private']['nextPrivateState']>().toEqualTypeOf<unknown>();
    expectTypeOf<AnySubmittedCallTx['callTxData']['private']['result']>().toEqualTypeOf<unknown>();
    expectTypeOf<AnySubmittedCallTx['callTxData']['private']['nextPrivateState']>().toEqualTypeOf<unknown>();
  });
});

describe('the circuit ids of a contract', () => {
  it('are the circuits the ledger 9 artifact declares', () => {
    expectTypeOf<CircuitIdOf<V9>>().toEqualTypeOf<K>();
  });

  it('are the circuits the ledger 8 artifact declares', () => {
    expectTypeOf<CircuitIdOf<V8>>().toEqualTypeOf<K>();
  });

  it('are named per era by Ledger9CircuitId and Ledger8CircuitId', () => {
    expectTypeOf<Ledger9CircuitId<V9>>().toEqualTypeOf<CircuitIdOf<V9>>();
    expectTypeOf<Ledger8CircuitId<V8>>().toEqualTypeOf<CircuitIdOf<V8>>();
  });
});

describe('a concrete contract with a generic circuit id', () => {
  it('converts both ways between the flat name and the ledger 9 name', () => {
    const finalizedCallTxData = <PCK extends CircuitIdOf<V9>>(value: Ledger9FinalizedCallTxData<V9, PCK>): Ledger9FinalizedCallTxData<V9, PCK> => {
      const flat: FinalizedCallTxData<V9, PCK> = value;
      return flat;
    };
    const submittedCallTx = <PCK extends CircuitIdOf<V9>>(value: Ledger9SubmittedCallTx<V9, PCK>): Ledger9SubmittedCallTx<V9, PCK> => {
      const flat: SubmittedCallTx<V9, PCK> = value;
      return flat;
    };
    const unsubmittedCallTxData = <PCK extends CircuitIdOf<V9>>(value: Ledger9UnsubmittedCallTxData<V9, PCK>): Ledger9UnsubmittedCallTxData<V9, PCK> => {
      const flat: UnsubmittedCallTxData<V9, PCK> = value;
      return flat;
    };
    const callResultPrivate = <PCK extends CircuitIdOf<V9>>(value: Ledger9CallResultPrivate<V9, PCK>): Ledger9CallResultPrivate<V9, PCK> => {
      const flat: CallResultPrivate<V9, PCK> = value;
      return flat;
    };
    const callTxOptions = <PCK extends CircuitIdOf<V9>>(value: Ledger9CallTxOptions<V9, PCK>): Ledger9CallTxOptions<V9, PCK> => {
      const flat: CallTxOptions<V9, PCK> = value;
      return flat;
    };
    const callTxOptionsBase = <PCK extends CircuitIdOf<V9>>(value: Ledger9CallTxOptionsBase<V9, PCK>): Ledger9CallTxOptionsBase<V9, PCK> => {
      const flat: CallTxOptionsBase<V9, PCK> = value;
      return flat;
    };
    const callTxOptionsWithPrivateStateId = <PCK extends CircuitIdOf<V9>>(value: Ledger9CallTxOptionsWithPrivateStateId<V9, PCK>): Ledger9CallTxOptionsWithPrivateStateId<V9, PCK> => {
      const flat: CallTxOptionsWithPrivateStateId<V9, PCK> = value;
      return flat;
    };
    const contractProviders = <PCK extends CircuitIdOf<V9>>(value: Ledger9ContractProviders<V9, PCK>): Ledger9ContractProviders<V9, PCK> => {
      const flat: ContractProviders<V9, PCK> = value;
      return flat;
    };

    expectTypeOf(finalizedCallTxData<K>).returns.toEqualTypeOf<FinalizedCallTxData<V9, K>>();
    expectTypeOf(submittedCallTx<K>).returns.toEqualTypeOf<SubmittedCallTx<V9, K>>();
    expectTypeOf(unsubmittedCallTxData<K>).returns.toEqualTypeOf<UnsubmittedCallTxData<V9, K>>();
    expectTypeOf(callResultPrivate<K>).returns.toEqualTypeOf<CallResultPrivate<V9, K>>();
    expectTypeOf(callTxOptions<K>).returns.toEqualTypeOf<CallTxOptions<V9, K>>();
    expectTypeOf(callTxOptionsBase<K>).returns.toEqualTypeOf<CallTxOptionsBase<V9, K>>();
    expectTypeOf(callTxOptionsWithPrivateStateId<K>).returns.toEqualTypeOf<CallTxOptionsWithPrivateStateId<V9, K>>();
    expectTypeOf(contractProviders<K>).returns.toEqualTypeOf<ContractProviders<V9, K>>();
  });

  it('converts both ways between the flat name and the ledger 8 name', () => {
    const finalizedCallTxData = <PCK extends CircuitIdOf<V8>>(value: Ledger8FinalizedCallTxData<V8, PCK>): Ledger8FinalizedCallTxData<V8, PCK> => {
      const flat: FinalizedCallTxData<V8, PCK> = value;
      return flat;
    };
    const submittedCallTx = <PCK extends CircuitIdOf<V8>>(value: Ledger8SubmittedCallTx<V8, PCK>): Ledger8SubmittedCallTx<V8, PCK> => {
      const flat: SubmittedCallTx<V8, PCK> = value;
      return flat;
    };
    const unsubmittedCallTxData = <PCK extends CircuitIdOf<V8>>(value: Ledger8UnsubmittedCallTxData<V8, PCK>): Ledger8UnsubmittedCallTxData<V8, PCK> => {
      const flat: UnsubmittedCallTxData<V8, PCK> = value;
      return flat;
    };
    const callResultPrivate = <PCK extends CircuitIdOf<V8>>(value: Ledger8CallResultPrivate<V8, PCK>): Ledger8CallResultPrivate<V8, PCK> => {
      const flat: CallResultPrivate<V8, PCK> = value;
      return flat;
    };
    const callTxOptions = <PCK extends CircuitIdOf<V8>>(value: Ledger8CallTxOptions<V8, PCK>): Ledger8CallTxOptions<V8, PCK> => {
      const flat: CallTxOptions<V8, PCK> = value;
      return flat;
    };
    const callTxOptionsBase = <PCK extends CircuitIdOf<V8>>(value: Ledger8CallTxOptionsBase<V8, PCK>): Ledger8CallTxOptionsBase<V8, PCK> => {
      const flat: CallTxOptionsBase<V8, PCK> = value;
      return flat;
    };
    const callTxOptionsWithPrivateStateId = <PCK extends CircuitIdOf<V8>>(value: Ledger8CallTxOptionsWithPrivateStateId<V8, PCK>): Ledger8CallTxOptionsWithPrivateStateId<V8, PCK> => {
      const flat: CallTxOptionsWithPrivateStateId<V8, PCK> = value;
      return flat;
    };
    const contractProviders = <PCK extends CircuitIdOf<V8>>(value: Ledger8ContractProviders<V8, PCK>): Ledger8ContractProviders<V8, PCK> => {
      const flat: ContractProviders<V8, PCK> = value;
      return flat;
    };

    expectTypeOf(finalizedCallTxData<K>).returns.toEqualTypeOf<FinalizedCallTxData<V8, K>>();
    expectTypeOf(submittedCallTx<K>).returns.toEqualTypeOf<SubmittedCallTx<V8, K>>();
    expectTypeOf(unsubmittedCallTxData<K>).returns.toEqualTypeOf<UnsubmittedCallTxData<V8, K>>();
    expectTypeOf(callResultPrivate<K>).returns.toEqualTypeOf<CallResultPrivate<V8, K>>();
    expectTypeOf(callTxOptions<K>).returns.toEqualTypeOf<CallTxOptions<V8, K>>();
    expectTypeOf(callTxOptionsBase<K>).returns.toEqualTypeOf<CallTxOptionsBase<V8, K>>();
    expectTypeOf(callTxOptionsWithPrivateStateId<K>).returns.toEqualTypeOf<CallTxOptionsWithPrivateStateId<V8, K>>();
    expectTypeOf(contractProviders<K>).returns.toEqualTypeOf<ContractProviders<V8, K>>();
  });
});

describe('generic code names an era', () => {
  it('cannot pass a ledger 9 circuit id of a generic contract to a flat name', () => {
    const publicOf = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
      // @ts-expect-error the circuit ids of a generic C stay unresolved until C is known
      data: FinalizedCallTxData<C, PCK>
    ) => data.public;

    void publicOf;
  });

  it('passes it to the era-named type', () => {
    const publicOf = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
      data: Ledger9FinalizedCallTxData<C, PCK>
    ) => data.public;

    expectTypeOf(publicOf<V9, K>).returns.toEqualTypeOf<FinalizedCallTxData<V9, K>['public']>();
  });
});
