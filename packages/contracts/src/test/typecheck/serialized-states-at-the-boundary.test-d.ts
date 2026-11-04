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
import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import type {
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState
} from '@midnight-ntwrk/midnight-js-types';
import { describe, expectTypeOf, it } from 'vitest';

import type {
  ContractTypeError,
  Ledger8CallOptionsWithInitialStates,
  Ledger8FinalizedDeployTxData,
  Ledger8FoundDeployTxPublicData,
  Ledger8UnsubmittedDeployTxData,
  Ledger9CallOptionsProviderDataDependencies,
  Ledger9TransactionContext,
  Ledger9UnsubmittedDeployTxPublicData,
  verifyContractState
} from '../../index';
import type { CacheStates, GetCurrentStatesForIdentity } from '../../internal/transaction';
import type { Counter016Contract } from '../ledger8-fixture-types';

type Ledger8Options = Ledger8CallOptionsWithInitialStates<Counter016Contract, 'increment'>;

declare const finalizedLedger8Deploy: Ledger8FinalizedDeployTxData<Counter016Contract>;
declare const ledger9ContractStateDecoder: typeof ContractState;

describe('every full ledger state crossing the contracts API is a serialized state', () => {
  it('takes serialized states as call inputs in both eras', () => {
    expectTypeOf<Ledger9CallOptionsProviderDataDependencies['initialContractState']>().toEqualTypeOf<SerializedContractState>();
    expectTypeOf<Ledger9CallOptionsProviderDataDependencies['initialZswapChainState']>().toEqualTypeOf<SerializedZswapChainState>();
    expectTypeOf<Ledger9CallOptionsProviderDataDependencies['ledgerParameters']>().toEqualTypeOf<SerializedLedgerParameters>();
    expectTypeOf<Ledger8Options['initialContractState']>().toEqualTypeOf<SerializedContractState>();
    expectTypeOf<Ledger8Options['ledgerParameters']>().toEqualTypeOf<SerializedLedgerParameters>();
  });

  it('hands out the deploy-time state as a serialized state on deploy and found handles', () => {
    expectTypeOf<Ledger9UnsubmittedDeployTxPublicData['initialContractState']>().toEqualTypeOf<SerializedContractState<'v9'>>();
    expectTypeOf<Ledger8UnsubmittedDeployTxData<Counter016Contract>['public']['initialContractState']>().toEqualTypeOf<
      SerializedContractState<'v8'>
    >();
    expectTypeOf<Ledger8FoundDeployTxPublicData['initialContractState']>().toEqualTypeOf<SerializedContractState>();
    expectTypeOf<Ledger8FinalizedDeployTxData<Counter016Contract>['public']['initialContractState']>().toEqualTypeOf<
      SerializedContractState<'v8'>
    >();
    expectTypeOf<Ledger8FinalizedDeployTxData<Counter016Contract>['public']>().not.toHaveProperty('initialContractStateBytes');
    expectTypeOf<Ledger8UnsubmittedDeployTxData<Counter016Contract>['public']>().not.toHaveProperty('initialContractStateBytes');
  });

  it('does not let a ledger 8 deploy state be decoded with a ledger 9 decoder only', () => {
    // @ts-expect-error a v8 state needs a v8 decoder
    finalizedLedger8Deploy.public.initialContractState.deserialize({ v9: ledger9ContractStateDecoder });
  });

  it('verifies and reports a serialized state', () => {
    expectTypeOf<Parameters<typeof verifyContractState>[1]>().toEqualTypeOf<SerializedContractState>();
    expectTypeOf<ReturnType<typeof verifyContractState>>().toEqualTypeOf<Promise<void>>();
    expectTypeOf<ContractTypeError['contractState']>().toEqualTypeOf<SerializedContractState>();
  });

  it('keeps the decoded scope cache off the public transaction context', () => {
    type ContextKeys = keyof Ledger9TransactionContext<Contract.Any>;
    expectTypeOf<Extract<ContextKeys, typeof CacheStates | typeof GetCurrentStatesForIdentity>>().toEqualTypeOf<never>();
  });
});
