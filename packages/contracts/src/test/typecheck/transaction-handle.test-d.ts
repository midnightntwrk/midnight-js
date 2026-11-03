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
import type { AnyProvableCircuitId, FinalizedTx, LedgerTransaction, UnprovenTx } from '@midnight-ntwrk/midnight-js-types';
import { describe, expectTypeOf, it } from 'vitest';

import type {
  FinalizedCallTxData,
  FinalizedDeployTxData,
  Ledger8CallResultPrivate,
  Ledger8CircuitId,
  Ledger8Contract,
  Ledger8FinalizedCallTxData,
  Ledger9UnsubmittedDeployTxData,
  Ledger9UnsubmittedTxData,
  SubmitTxOptions,
  UnsubmittedCallTxData} from '../../index';

type AnyLedger8CircuitId = Ledger8CircuitId<Ledger8Contract>;

describe('every transaction the contracts barrel publishes is a handle', () => {
  it('carries the unproven transaction as an UnprovenTx', () => {
    expectTypeOf<Ledger9UnsubmittedTxData['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
    expectTypeOf<UnsubmittedCallTxData<Contract.Any, AnyProvableCircuitId>['private']['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
    expectTypeOf<Ledger9UnsubmittedDeployTxData<Contract.Any>['private']['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
    expectTypeOf<SubmitTxOptions<AnyProvableCircuitId>['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
  });

  it('carries the retained-era call result as an UnprovenTx and no transaction bytes', () => {
    expectTypeOf<Ledger8CallResultPrivate<Ledger8Contract, AnyLedger8CircuitId>['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
    expectTypeOf<Ledger8CallResultPrivate<Ledger8Contract, AnyLedger8CircuitId>>().not.toHaveProperty('txBytes');
  });

  it('carries the finalized record as a FinalizedTx of the record era', () => {
    expectTypeOf<FinalizedCallTxData<Contract.Any, AnyProvableCircuitId>['public']['tx']>().toEqualTypeOf<
      LedgerTransaction<'Finalized', 'v9'>
    >();
    expectTypeOf<FinalizedDeployTxData<Contract.Any>['public']['tx']>().toExtend<FinalizedTx>();
    expectTypeOf<Ledger8FinalizedCallTxData<Ledger8Contract, AnyLedger8CircuitId>['public']['tx']>().toEqualTypeOf<
      LedgerTransaction<'Finalized', 'v8'> | LedgerTransaction<'Finalized', 'v9'>
    >();
  });
});
