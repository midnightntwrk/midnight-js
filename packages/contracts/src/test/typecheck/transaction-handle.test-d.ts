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

import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { AnyProvableCircuitId, FinalizedTx, UnprovenTx } from '@midnight-ntwrk/midnight-js-types';
import { describe, expectTypeOf, it } from 'vitest';

import type {
  FinalizedCallTxData,
  FinalizedDeployTxData,
  Ledger8,
  SubmitTxOptions,
  UnsubmittedCallTxData,
  UnsubmittedDeployTxData,
  UnsubmittedTxData
} from '../../index';
import type { Ledger8CallResultPrivate, Ledger8CircuitId, Ledger8Contract } from '../../ledger8-contract';

type AnyLedger8CircuitId = Ledger8CircuitId<Ledger8Contract>;

describe('every transaction the contracts barrel publishes is a handle', () => {
  it('carries the unproven transaction as an UnprovenTx', () => {
    expectTypeOf<UnsubmittedTxData['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
    expectTypeOf<UnsubmittedCallTxData<Contract.Any, AnyProvableCircuitId>['private']['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
    expectTypeOf<UnsubmittedDeployTxData<Contract.Any>['private']['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
    expectTypeOf<SubmitTxOptions<AnyProvableCircuitId>['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
  });

  it('carries the retained-era call result as an UnprovenTx and no transaction bytes', () => {
    expectTypeOf<Ledger8CallResultPrivate<Ledger8Contract, AnyLedger8CircuitId>['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
    expectTypeOf<Ledger8.CallResultPrivate<Ledger8.Contract, AnyLedger8CircuitId>['unprovenTx']>().toEqualTypeOf<UnprovenTx>();
    expectTypeOf<Ledger8.CallResultPrivate<Ledger8.Contract, AnyLedger8CircuitId>>().not.toHaveProperty('txBytes');
  });

  it('carries the finalized record as a FinalizedTx', () => {
    expectTypeOf<FinalizedCallTxData<Contract.Any, AnyProvableCircuitId>['public']['tx']>().toEqualTypeOf<FinalizedTx>();
    expectTypeOf<FinalizedDeployTxData<Contract.Any>['public']['tx']>().toEqualTypeOf<FinalizedTx>();
    expectTypeOf<Ledger8.FinalizedCallTxData<Ledger8.Contract, AnyLedger8CircuitId>['public']['tx']>().toEqualTypeOf<FinalizedTx>();
  });
});
