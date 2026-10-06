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

import type { ContractAddress, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as Rx from 'rxjs';
import { describe, expect, test, vi } from 'vitest';

import { toUnshieldedBalances } from '../codec';
import {
  type Block,
  blockOffsetToBlock$,
  blockOffsetToState$,
  blockOffsetToUnshieldedBalances$,
  blockToPositionedState$,
  transactionToState$
} from '../observables';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const TX_ID = 'test-tx-id' as TransactionId;
const identity = (hexState: string): string => hexState;

const clientServing = (payloads: readonly unknown[]) =>
  stubApolloHandle({
    subscribe: vi.fn<(request: ApolloRequest) => unknown>().mockReturnValue(Rx.from(payloads))
  }).client;

const toArray = <T>(source: Rx.Observable<T>): Promise<T[]> => Rx.lastValueFrom(source.pipe(Rx.toArray()));

describe('stream pipelines carry the block that served each value', () => {
  test('the per-action state feed reads the block off the action’s transaction', async () => {
    const client = clientServing([
      { data: { contractActions: { state: 'aa', transaction: { protocolVersion: 1, block: { height: 7, hash: '0x07' } } } } }
    ]);

    const seen = await toArray(blockOffsetToState$(identity)(client)(ADDRESS)(null));

    expect(seen).toEqual([{ value: 'aa', blockHeight: 7, blockHash: '0x07' }]);
  });

  test('the balance feed reads the block off the action’s transaction', async () => {
    const balances = [{ tokenType: 'ab'.repeat(32), amount: '5' }];
    const client = clientServing([
      { data: { contractActions: { unshieldedBalances: balances, transaction: { block: { height: 8, hash: '0x08' } } } } }
    ]);

    const seen = await toArray(blockOffsetToUnshieldedBalances$(client)(ADDRESS)(null));

    expect(seen).toEqual([{ value: toUnshieldedBalances(balances), blockHeight: 8, blockHash: '0x08' }]);
  });

  test('a transaction flattened out of a block keeps that block', async () => {
    const client = clientServing([
      {
        data: {
          blocks: {
            hash: '0x09',
            height: 9,
            protocolVersion: 1,
            transactions: [{ hash: '0xtx', identifiers: [TX_ID], contractActions: [{ state: 'cc', address: ADDRESS }] }]
          }
        }
      }
    ]);

    const seen = await toArray(
      blockOffsetToBlock$(client)(null).pipe(
        Rx.concatMap(({ transactions }) => Rx.from(transactions)),
        Rx.concatMap(transactionToState$(identity)(TX_ID))
      )
    );

    expect(seen).toEqual([{ value: 'cc', blockHeight: 9, blockHash: '0x09' }]);
  });

  test('two states for one address in one block share the block and keep distinct ordinals', async () => {
    const block: Block = {
      hash: '0x0a',
      height: 10,
      protocolVersion: 1,
      transactions: [
        {
          hash: '0xtx',
          identifiers: [TX_ID],
          protocolVersion: 1,
          blockHeight: 10,
          blockHash: '0x0a',
          contractActions: [
            { state: 'd1', address: ADDRESS },
            { state: 'd2', address: ADDRESS }
          ]
        }
      ]
    };

    const seen = await toArray(blockToPositionedState$(identity)(ADDRESS)(block));

    expect(seen).toEqual([
      { height: 10, hash: '0x0a', ordinal: 0, state: 'd1' },
      { height: 10, hash: '0x0a', ordinal: 1, state: 'd2' }
    ]);
  });
});
