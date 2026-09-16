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

import { describe, expectTypeOf, it } from 'vitest';

// Through the BARREL, and through the namespace alone. `typecheck/overloads.test-d.ts` asserts the
// same resolutions against the source modules, which a consumer cannot import: it would keep
// passing with the retained-era types unreachable from the published surface entirely.
import { type Ledger8, submitCallTx, submitCallTxAsync } from '../../index';
// The left-hand side of the renaming table, imported from the module that DECLARES it. The
// namespace is a table of `Ledger8X as X` renames written by hand, and a transposed pair type-checks
// and passes every name-based gate: `contracts-type-acl.test.ts` compares the member NAME list, and
// both names are in it either way. These assertions are what compares the two sides.
import type {
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
  Ledger8CircuitParameters,
  Ledger8CircuitResult,
  Ledger8CircuitReturnType,
  Ledger8ConstructorParameters,
  Ledger8Contract,
  Ledger8ContractCall,
  Ledger8ContractCallPublic,
  Ledger8ContractProviders,
  Ledger8DeployContractOptions,
  Ledger8DeployContractOptionsBase,
  Ledger8FinalizedCallTxData,
  Ledger8FinalizedCallTxPublicData,
  Ledger8FindDeployedContractOptions,
  Ledger8FoundContract,
  Ledger8InitialStateResult,
  Ledger8PrivateState,
  Ledger8SubmittedCallTx,
  Ledger8UnsubmittedCallTxData,
  Ledger8Witness
} from '../../ledger8-contract';
import type { Counter016Contract, Counter016PrivateState } from '../ledger8-fixture-types';

type C = Counter016Contract;
type K = 'increment';
type PS = Counter016PrivateState;

declare const providers: Ledger8.ContractProviders<C, K>;
declare const options: Ledger8.CallTxOptionsBase<C, K>;

describe('a consumer can name the retained era through the namespace alone', () => {
  it('declares the result the retained arm resolves to', () => {
    expectTypeOf(submitCallTx(providers, options)).toEqualTypeOf<Promise<Ledger8.FinalizedCallTxData<C, K>>>();
  });

  it('declares the result the non-finalizing entry point resolves to', () => {
    expectTypeOf(submitCallTxAsync(providers, options)).toEqualTypeOf<Promise<Ledger8.SubmittedCallTx<C, K>>>();
  });

  it('constrains a helper of its own by the retained contract type', () => {
    // What the family is published FOR: a caller writing `<C extends Ledger8.Contract>` of its own.
    // Asserted through the family's own machinery rather than `Counter016Contract extends
    // Ledger8.Contract`, which is true by the fixture's DECLARATION and so cannot fail -- the rule
    // `typecheck/overloads.test-d.ts` states for the same fixture.
    expectTypeOf<Ledger8.CircuitId<C>>().toEqualTypeOf<K>();
    expectTypeOf<Ledger8.CircuitParameters<C, K>>().toEqualTypeOf<[]>();
  });
});

describe('every namespace member is the declaration it renames', () => {
  // One assertion per member, all 29 types, comparing `Ledger8.X` against the `Ledger8X` the source
  // module declares. A swapped pair -- `Ledger8CallResultPrivate as CallResultPublic` and its
  // converse -- compiles, keeps both names on the surface, and is caught only here.
  it('renames the contract and circuit declarations', () => {
    expectTypeOf<Ledger8.Contract<PS>>().toEqualTypeOf<Ledger8Contract<PS>>();
    expectTypeOf<Ledger8.Circuit>().toEqualTypeOf<Ledger8Circuit>();
    expectTypeOf<Ledger8.CircuitContext<PS>>().toEqualTypeOf<Ledger8CircuitContext<PS>>();
    expectTypeOf<Ledger8.CircuitResult>().toEqualTypeOf<Ledger8CircuitResult>();
    expectTypeOf<Ledger8.Witness<PS>>().toEqualTypeOf<Ledger8Witness<PS>>();
    expectTypeOf<Ledger8.InitialStateResult<PS>>().toEqualTypeOf<Ledger8InitialStateResult<PS>>();
    expectTypeOf<Ledger8.PrivateState<C>>().toEqualTypeOf<Ledger8PrivateState<C>>();
    expectTypeOf<Ledger8.CircuitId<C>>().toEqualTypeOf<Ledger8CircuitId<C>>();
    expectTypeOf<Ledger8.CircuitParameters<C, K>>().toEqualTypeOf<Ledger8CircuitParameters<C, K>>();
    expectTypeOf<Ledger8.CircuitReturnType<C, K>>().toEqualTypeOf<Ledger8CircuitReturnType<C, K>>();
    expectTypeOf<Ledger8.ConstructorParameters<C>>().toEqualTypeOf<Ledger8ConstructorParameters<C>>();
  });

  it('renames the call declarations', () => {
    expectTypeOf<Ledger8.ContractProviders<C, K>>().toEqualTypeOf<Ledger8ContractProviders<C, K>>();
    expectTypeOf<Ledger8.CallTxTarget<C, K>>().toEqualTypeOf<Ledger8CallTxTarget<C, K>>();
    expectTypeOf<Ledger8.CallTxOptions<C, K>>().toEqualTypeOf<Ledger8CallTxOptions<C, K>>();
    expectTypeOf<Ledger8.CallTxOptionsBase<C, K>>().toEqualTypeOf<Ledger8CallTxOptionsBase<C, K>>();
    expectTypeOf<Ledger8.CallTxOptionsWithPrivateStateId<C, K>>().toEqualTypeOf<
      Ledger8CallTxOptionsWithPrivateStateId<C, K>
    >();
    expectTypeOf<Ledger8.CircuitCallTxInterface<C>>().toEqualTypeOf<Ledger8CircuitCallTxInterface<C>>();
  });

  it('renames the result declarations', () => {
    expectTypeOf<Ledger8.CallResultPublic>().toEqualTypeOf<Ledger8CallResultPublic>();
    expectTypeOf<Ledger8.CallResultPrivate<C, K>>().toEqualTypeOf<Ledger8CallResultPrivate<C, K>>();
    expectTypeOf<Ledger8.ContractCall>().toEqualTypeOf<Ledger8ContractCall>();
    expectTypeOf<Ledger8.ContractCallPublic>().toEqualTypeOf<Ledger8ContractCallPublic>();
    expectTypeOf<Ledger8.FinalizedCallTxData<C, K>>().toEqualTypeOf<Ledger8FinalizedCallTxData<C, K>>();
    expectTypeOf<Ledger8.FinalizedCallTxPublicData>().toEqualTypeOf<Ledger8FinalizedCallTxPublicData>();
    expectTypeOf<Ledger8.UnsubmittedCallTxData<C, K>>().toEqualTypeOf<Ledger8UnsubmittedCallTxData<C, K>>();
    expectTypeOf<Ledger8.SubmittedCallTx<C, K>>().toEqualTypeOf<Ledger8SubmittedCallTx<C, K>>();
  });

  it('renames the deploy and lookup declarations', () => {
    expectTypeOf<Ledger8.DeployContractOptions<C>>().toEqualTypeOf<Ledger8DeployContractOptions<C>>();
    expectTypeOf<Ledger8.DeployContractOptionsBase<C>>().toEqualTypeOf<Ledger8DeployContractOptionsBase<C>>();
    expectTypeOf<Ledger8.FindDeployedContractOptions<C>>().toEqualTypeOf<Ledger8FindDeployedContractOptions<C>>();
    expectTypeOf<Ledger8.FoundContract<C>>().toEqualTypeOf<Ledger8FoundContract<C>>();
  });
});
