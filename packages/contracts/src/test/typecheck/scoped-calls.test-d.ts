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

import type { ContractAddress } from '@midnightntwrk/midnight-js-protocol/v9';
import type { PrivateStateId } from '@midnightntwrk/midnight-js-types';
import { describe, expectTypeOf, it } from 'vitest';

import type { Ledger9CallResult } from '../../call';
import type { Ledger9ContractProviders } from '../../contract-providers';
import { submitCallTx } from '../../submit-call-tx';
import { type Ledger9TransactionContext, withContractScopedTransaction } from '../../transaction';
import type { Ledger9FinalizedCallTxData } from '../../tx-model';
import {
  callee,
  type CalleeContract,
  countingShieldedMap,
  type CountingShieldedMapContract,
  shieldedMap,
  type ShieldedMapContract} from '../scoped-transaction-fixtures';

declare const mapProviders: Ledger9ContractProviders<ShieldedMapContract>;
declare const calleeProviders: Ledger9ContractProviders<CalleeContract>;
declare const countingProviders: Ledger9ContractProviders<CountingShieldedMapContract>;
declare const contractAddress: ContractAddress;
declare const privateStateId: PrivateStateId;
declare const coin: { nonce: Uint8Array; color: Uint8Array; value: bigint };
declare const txCtx: Ledger9TransactionContext<ShieldedMapContract>;

const mintAndSendArgs = (): [Uint8Array, bigint, Uint8Array, { bytes: Uint8Array }, bigint] => [
  new Uint8Array(32),
  1n,
  new Uint8Array(32),
  { bytes: new Uint8Array(32) },
  1n
];

describe('calls of several contracts and circuits in one scope', () => {
  it('types each call in a scope by its own contract and circuit', () => {
    const deposit = submitCallTx(mapProviders, { compiledContract: shieldedMap, contractAddress, circuitId: 'deposit', args: [coin] }, txCtx);
    const mint = submitCallTx(
      calleeProviders,
      { compiledContract: callee, contractAddress, circuitId: 'mintAndSend', args: mintAndSendArgs() },
      txCtx
    );
    const counted = submitCallTx(
      countingProviders,
      { compiledContract: countingShieldedMap, contractAddress, circuitId: 'deposit', args: [coin], privateStateId },
      txCtx
    );

    expectTypeOf(deposit).toEqualTypeOf<Promise<Ledger9CallResult<ShieldedMapContract, 'deposit'>>>();
    expectTypeOf(mint).toEqualTypeOf<Promise<Ledger9CallResult<CalleeContract, 'mintAndSend'>>>();
    expectTypeOf(counted).toEqualTypeOf<Promise<Ledger9CallResult<CountingShieldedMapContract, 'deposit'>>>();
  });

  it("types the scope's result by the contract the scope is typed by", () => {
    const finalized = withContractScopedTransaction(mapProviders, async (scope) => {
      await submitCallTx(mapProviders, { compiledContract: shieldedMap, contractAddress, circuitId: 'deposit', args: [coin] }, scope);
      await submitCallTx(calleeProviders, { compiledContract: callee, contractAddress, circuitId: 'deposit', args: [coin] }, scope);
    });

    expectTypeOf(finalized).toEqualTypeOf<Promise<Ledger9FinalizedCallTxData<ShieldedMapContract, 'deposit'>>>();
  });

  it('refuses a circuit the contract does not declare', () => {
    // @ts-expect-error - `withdraw` is not a circuit of the callee
    void submitCallTx(calleeProviders, { compiledContract: callee, contractAddress, circuitId: 'withdraw', args: [coin] }, txCtx);
  });

  it("refuses another circuit's arguments", () => {
    // @ts-expect-error - the callee's `deposit` takes a coin, not the arguments of `mintAndSend`
    void submitCallTx(calleeProviders, { compiledContract: callee, contractAddress, circuitId: 'deposit', args: mintAndSendArgs() }, txCtx);
  });

  it('asks a contract with a private state for the id it is stored under', () => {
    // @ts-expect-error - a contract with a private state is called with the id of the state it runs on
    void submitCallTx(countingProviders, { compiledContract: countingShieldedMap, contractAddress, circuitId: 'deposit', args: [coin] }, txCtx);
  });
});

