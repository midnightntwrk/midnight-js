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

import { type Ledger8CallOptionsWithInitialStates, type Ledger8UnsubmittedCallTxData } from '../../index';
import { createLedger8UnprovenCallTxFromInitialStates } from '../../index';
import type { CoinReceiver016Coin, CoinReceiver016Contract, Counter016Contract } from '../ledger8-fixture-types';

declare const zkConfigProvider: Parameters<typeof createLedger8UnprovenCallTxFromInitialStates>[0];
declare const encryptionPublicKey: Parameters<typeof createLedger8UnprovenCallTxFromInitialStates>[2];
declare const coinReceiver: CoinReceiver016Contract;
declare const counter: Counter016Contract;
declare const coin: CoinReceiver016Coin;
declare const serializable: { serialize(): Uint8Array };

const states = {
  contractAddress: '00'.repeat(32),
  head: 'v9',
  initialContractState: { era: 'v8', state: serializable },
  ledgerParameters: { era: 'v9', parameters: serializable },
  coinPublicKey: '00'.repeat(32),
  config: { networkId: 'undeployed', ttlSeconds: 60 }
} as const;

describe('createLedger8UnprovenCallTxFromInitialStates', () => {
  it('answers with the ledger 8 unsubmitted call data of the contract and circuit', () => {
    expectTypeOf(
      createLedger8UnprovenCallTxFromInitialStates(
        zkConfigProvider,
        { ...states, compiledContract: coinReceiver, circuitId: 'receive_coin', args: [coin] },
        encryptionPublicKey
      )
    ).resolves.toEqualTypeOf<Ledger8UnsubmittedCallTxData<CoinReceiver016Contract, 'receive_coin'>>();
  });

  it('requires the circuit arguments of a circuit that takes some', () => {
    createLedger8UnprovenCallTxFromInitialStates(
      zkConfigProvider,
      // @ts-expect-error - `receive_coin` takes a coin
      { ...states, compiledContract: coinReceiver, circuitId: 'receive_coin' },
      encryptionPublicKey
    );
  });

  it('refuses circuit arguments of the wrong type', () => {
    createLedger8UnprovenCallTxFromInitialStates(
      zkConfigProvider,
      // @ts-expect-error - a string is not a coin
      { ...states, compiledContract: coinReceiver, circuitId: 'receive_coin', args: ['not a coin'] },
      encryptionPublicKey
    );
  });

  it('takes no arguments for a circuit that has none', () => {
    createLedger8UnprovenCallTxFromInitialStates(
      zkConfigProvider,
      { ...states, compiledContract: counter, circuitId: 'increment' },
      encryptionPublicKey
    );
  });

  it('requires the head era the transaction is built for', () => {
    expectTypeOf<Ledger8CallOptionsWithInitialStates<Counter016Contract, 'increment'>>().toHaveProperty('head');
    expectTypeOf<Ledger8CallOptionsWithInitialStates<Counter016Contract, 'increment'>['head']>().toEqualTypeOf<
      'v8' | 'v9'
    >();
  });

  it('refuses an era that is not a ledger era', () => {
    createLedger8UnprovenCallTxFromInitialStates(
      zkConfigProvider,
      {
        ...states,
        compiledContract: counter,
        circuitId: 'increment',
        // @ts-expect-error - 'v10' is not a ledger era
        initialContractState: { era: 'v10', state: serializable }
      },
      encryptionPublicKey
    );
  });
});
