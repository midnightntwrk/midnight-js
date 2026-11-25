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

import { InvalidArgumentError } from '@midnightntwrk/midnight-js-protocol/errors';
import { type PrivateStateProvider } from '@midnightntwrk/midnight-js-types';
import { describe, expect, it, vi } from 'vitest';

import { ProviderFailedError } from '../errors';
import { scoped } from '../internal/transaction';
import { submitCallTx } from '../submit-call-tx';
import {
  type Ledger9PendingPrivateState,
  withContractScopedTransaction,
  withLedger8ContractScopedTransaction
} from '../transaction';
import { chainRecordingOrder, step } from './scoped-transaction-fixtures';

/** Records, as `<contract address>:<private state id>`, every store made through `provider`, keeping its stores. */
const recordStores = (provider: PrivateStateProvider): string[] => {
  const storedIds: string[] = [];
  const forContract = vi.mocked(provider.forContract).getMockImplementation();
  vi.mocked(provider.forContract).mockImplementation((address) => {
    const states = forContract!(address);
    return {
      ...states,
      set: (id, state) => {
        storedIds.push(`${address}:${id}`);
        return states.set(id, state);
      }
    };
  });
  return storedIds;
};

describe('beforeSubmit of a ledger 9 scoped transaction', () => {
  it('is awaited once, after the wallet balanced the transaction and before it is submitted, with every identifier of the transaction and every private state left', async () => {
    // Arrange
    const { address, providers, stored, events, identifiers } = await chainRecordingOrder();
    const handed: { txIds: readonly string[]; pending: readonly Ledger9PendingPrivateState[]; stored: unknown }[] = [];
    const beforeSubmit = async (
      txIds: readonly string[],
      pending: readonly Ledger9PendingPrivateState[]
    ): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      events.push('beforeSubmit settled');
      handed.push({ txIds, pending, stored: stored.get(`${address}:id`) });
    };

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, step(address, 'id'), txCtx);
        await submitCallTx(providers, step(address, 'id'), txCtx);
      },
      { beforeSubmit }
    );

    // Assert: RED WHEN beforeSubmit runs after submitTx, or is not awaited, or not at all, or is handed
    // only some of the transaction's identifiers, or the states as read.
    expect(events).toEqual(['beforeSubmit settled', 'submitted', 'waited']);
    expect(identifiers).toHaveLength(2);
    expect(handed).toEqual([
      {
        txIds: identifiers,
        pending: [{ contractAddress: address, privateStateId: 'id', privateState: { stamp: 2 } }],
        stored: { stamp: 0 }
      }
    ]);
    expect(stored.get(`${address}:id`)).toEqual({ stamp: 2 });
  });

  it.each([
    [
      'throws',
      (): void => {
        throw new Error('journal unavailable');
      }
    ],
    ['rejects', (): Promise<void> => Promise.reject(new Error('journal unavailable'))]
  ])('that %s is thrown as itself, and nothing is submitted or stored', async (_how, beforeSubmit) => {
    // Arrange
    const { address, providers, stored, events } = await chainRecordingOrder();

    // Act
    const error = await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, step(address, 'id'), txCtx);
      },
      { scopeName: 'stamping', beforeSubmit }
    ).catch((e: unknown) => e);

    // Assert: RED WHEN a failing beforeSubmit is swallowed, or wrapped, or the transaction is submitted anyway.
    expect(error).toEqual(new Error('journal unavailable'));
    expect(error).not.toBeInstanceOf(ProviderFailedError);
    expect(events).toEqual([]);
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
    expect(stored.get(`${address}:id`)).toEqual({ stamp: 0 });
  });

  it('has already been handed the states and the identifiers when submitTx rejects, whose error carries them too', async () => {
    // Arrange
    const { address, providers, stored, identifiers } = await chainRecordingOrder();
    vi.mocked(providers.midnightProvider.submitTx).mockRejectedValue(new Error('connection reset'));
    const beforeSubmit = vi.fn();

    // Act
    const error = await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, step(address, 'id'), txCtx);
      },
      { beforeSubmit }
    ).catch((e: unknown) => e);

    // Assert: RED WHEN beforeSubmit is called only once submitTx has returned.
    const pending = [{ contractAddress: address, privateStateId: 'id', privateState: { stamp: 1 } }];
    expect(beforeSubmit).toHaveBeenCalledExactlyOnceWith(identifiers, pending);
    expect(error).toBeInstanceOf(ProviderFailedError);
    expect((error as ProviderFailedError).pendingPrivateStates).toEqual(pending);
    expect((error as ProviderFailedError).txIds).toEqual(identifiers);
    expect(stored.get(`${address}:id`)).toEqual({ stamp: 0 });
  });
});

describe('beforeSubmit where no scope that submits would call it', () => {
  it('is refused for a nested scope, before any of its calls runs', async () => {
    // Arrange
    const { address, providers } = await chainRecordingOrder();
    const nestedBody = vi.fn(async () => undefined);

    // Act
    const error = await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, step(address, 'id'), txCtx);
      await scoped(providers, nestedBody, txCtx, { beforeSubmit: vi.fn() });
    }).catch((e: unknown) => e);

    // Assert: RED WHEN a nested scope takes beforeSubmit, which only the scope that submits calls.
    expect(error).toBeInstanceOf(InvalidArgumentError);
    expect((error as Error).message).toMatch(/'beforeSubmit' given to a scoped transaction nested/);
    expect(nestedBody).not.toHaveBeenCalled();
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('is refused for a scope on a ledger 8 network, before its function runs', async () => {
    // Arrange
    const { providers } = await chainRecordingOrder();
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(1_000_000);
    const body = vi.fn(async () => undefined);

    // Act
    const error = await withContractScopedTransaction(providers, body, { beforeSubmit: vi.fn() }).catch(
      (e: unknown) => e
    );

    // Assert: RED WHEN the ledger 8 scope runs with a beforeSubmit it never calls.
    expect(error).toBeInstanceOf(InvalidArgumentError);
    expect((error as Error).message).toMatch(/'beforeSubmit' given to a scoped transaction on a ledger 8 network/);
    expect(body).not.toHaveBeenCalled();
  });

  it('is refused by withLedger8ContractScopedTransaction, before its function runs', async () => {
    // Arrange
    const { providers } = await chainRecordingOrder();
    const body = vi.fn(async () => undefined);

    // Act
    const error = await withLedger8ContractScopedTransaction(providers, body, { beforeSubmit: vi.fn() }).catch(
      (e: unknown) => e
    );

    // Assert: RED WHEN the ledger 8 scope function takes a beforeSubmit it never calls.
    expect(error).toBeInstanceOf(InvalidArgumentError);
    expect((error as Error).message).toMatch(/'beforeSubmit'/);
    expect(body).not.toHaveBeenCalled();
  });
});

describe('beforeSubmit, what it is handed', () => {
  it('is handed, and stores, only the private states a call left, not one a call only read', async () => {
    // Arrange: the call to 'b' reads its private state and fails, so it leaves nothing.
    const { address, providers, stored } = await chainRecordingOrder();
    const read = { stamp: 5 };
    stored.set(`${address}:b`, read);
    const storedIds = recordStores(providers.privateStateProvider);
    const handed: Ledger9PendingPrivateState[] = [];

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await expect(submitCallTx(providers, step(address, 'b'), txCtx)).rejects.toThrow(/stamp out of order/);
        await submitCallTx(providers, step(address, 'id'), txCtx);
      },
      { beforeSubmit: (_txIds, pending) => void handed.push(...pending) }
    );

    // Assert: RED WHEN a state the scope only read is handed as one it will store, or is written back.
    expect(handed).toEqual([{ contractAddress: address, privateStateId: 'id', privateState: { stamp: 1 } }]);
    expect(storedIds).toEqual([`${address}:id`]);
    expect(stored.get(`${address}:b`)).toBe(read);
  });

  it('is handed every private state left, one per private state id, in the order the scope first reached each', async () => {
    // Arrange: each call takes the stamp after the contract's last, whichever private state id it is.
    const { address, providers, stored } = await chainRecordingOrder();
    stored.set(`${address}:z`, { stamp: 0 });
    stored.set(`${address}:id`, { stamp: 1 });
    const handed: (readonly Ledger9PendingPrivateState[])[] = [];

    // Act: 'z' is reached first.
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, step(address, 'z'), txCtx);
        await submitCallTx(providers, step(address, 'id'), txCtx);
      },
      { beforeSubmit: (_txIds, pending) => void handed.push(pending) }
    );

    // Assert: RED WHEN the handed list drops a state, repeats one, or is in another order.
    expect(handed).toEqual([
      [
        { contractAddress: address, privateStateId: 'z', privateState: { stamp: 1 } },
        { contractAddress: address, privateStateId: 'id', privateState: { stamp: 2 } }
      ]
    ]);
    expect(stored.get(`${address}:z`)).toEqual({ stamp: 1 });
    expect(stored.get(`${address}:id`)).toEqual({ stamp: 2 });
  });
});
