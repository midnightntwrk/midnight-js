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
import { FailEntirely, type PrivateStateProvider } from '@midnightntwrk/midnight-js-types';
import { describe, expect, it, vi } from 'vitest';

import { type Ledger9CallResult } from '../call';
import {
  IncompleteCallTxPrivateStateConfig,
  Ledger9PrivateStatesNotStoredError,
  Ledger9SubmittedTxUnconfirmedError,
  ProviderFailedError,
  TxFailedError
} from '../errors';
import { submitCallTx } from '../submit-call-tx';
import { withContractScopedTransaction } from '../transaction';
import * as Stamps from './resources/compiled/stamps/contract/index.js';
import {
  chainRecordingOrder,
  chainWithStamps,
  stamps,
  type StampsContract,
  stampsKeys,
  step
} from './scoped-transaction-fixtures';
import { createMockFinalizedTxData } from './test-mocks';

type StepResult = Ledger9CallResult<StampsContract, 'step'>;

const lastOf = (result: StepResult): bigint => Stamps.ledger(result.public.nextContractState).last;

/** Makes every store through `provider` reject with `refusal`, keeping its reads. */
const refuseStores = (provider: PrivateStateProvider, refusal: Error): void => {
  const forContract = vi.mocked(provider.forContract).getMockImplementation();
  vi.mocked(provider.forContract).mockImplementation((address) => ({
    ...forContract!(address),
    set: vi.fn(() => Promise.reject(refusal))
  }));
};

describe('the private states of a ledger 9 scoped transaction', () => {
  it('chains a private state from call to call and stores the last only once the transaction succeeds entirely', async () => {
    // Arrange
    const {
      withKeys,
      addresses: [address]
    } = await chainWithStamps();
    const wallet = withKeys(stampsKeys);
    wallet.stored.set(`${address}:id`, { stamp: 0 });
    const results: StepResult[] = [];
    const storedDuringScope: unknown[] = [];

    // Act
    await withContractScopedTransaction(wallet.providers, async (txCtx) => {
      results.push(await submitCallTx(wallet.providers, step(address, 'id'), txCtx));
      results.push(await submitCallTx(wallet.providers, step(address, 'id'), txCtx));
      storedDuringScope.push(wallet.stored.get(`${address}:id`));
    });

    // Assert: RED WHEN a call runs on the private state as read instead of the one the call before it
    // left (the circuit refuses a stamp out of order), or when the state is stored before the scope ends.
    expect(results.map((result) => result.private.nextPrivateState)).toEqual([{ stamp: 1 }, { stamp: 2 }]);
    expect(results.map(lastOf)).toEqual([1n, 2n]);
    expect(storedDuringScope).toEqual([{ stamp: 0 }]);
    expect(Object.fromEntries(wallet.stored)).toEqual({ [`${address}:id`]: { stamp: 2 } });
  });

  it('stores nothing when the transaction does not succeed entirely, and a new scope reads the stored state again', async () => {
    // Arrange
    const {
      withKeys,
      addresses: [address]
    } = await chainWithStamps();
    const wallet = withKeys(stampsKeys);
    wallet.stored.set(`${address}:id`, { stamp: 0 });
    vi.mocked(wallet.providers.publicDataProvider.watchForTxData).mockResolvedValueOnce(
      createMockFinalizedTxData(FailEntirely)
    );
    const failedScope = withContractScopedTransaction(wallet.providers, async (txCtx) => {
      await submitCallTx(wallet.providers, step(address, 'id'), txCtx);
    });
    await expect(failedScope).rejects.toThrow(TxFailedError);

    // Act
    const results: StepResult[] = [];
    await withContractScopedTransaction(wallet.providers, async (txCtx) => {
      results.push(await submitCallTx(wallet.providers, step(address, 'id'), txCtx));
    });

    // Assert: RED WHEN the failed transaction's private state is stored, or when a scope starts from
    // the private state an earlier scope held instead of reading it from its provider.
    expect(results.map((result) => result.private.nextPrivateState)).toEqual([{ stamp: 1 }]);
    expect(Object.fromEntries(wallet.stored)).toEqual({ [`${address}:id`]: { stamp: 1 } });
  });
});

describe('the refusals of a ledger 9 scoped transaction over its private states', () => {
  it('tries every private state, and throws one error carrying exactly the states a provider refused', async () => {
    // Arrange: the first state the scope reaches is the one its provider refuses.
    const {
      withKeys,
      addresses: [refusing, storing]
    } = await chainWithStamps(2);
    const refusingWallet = withKeys(stampsKeys);
    const storingWallet = withKeys(stampsKeys);
    refusingWallet.stored.set(`${refusing}:a`, { stamp: 0 });
    storingWallet.stored.set(`${storing}:b`, { stamp: 0 });
    const refusal = new Error('store unavailable');
    refuseStores(refusingWallet.providers.privateStateProvider, refusal);

    // Act
    const error = await withContractScopedTransaction(refusingWallet.providers, async (txCtx) => {
      await submitCallTx(refusingWallet.providers, step(refusing, 'a'), txCtx);
      await submitCallTx(storingWallet.providers, step(storing, 'b'), txCtx);
    }).catch((e: unknown) => e);

    // Assert: RED WHEN the first refused store stops the rest, or when the error names a state that
    // was stored, or puts a private state where a logger would write it, or its published code changes.
    expect(error).toBeInstanceOf(Ledger9PrivateStatesNotStoredError);
    expect(error).toMatchObject({ code: 'MIDNIGHT_JS_C_LEDGER9_PRIVATE_STATES_NOT_STORED' });
    const notStored = error as Ledger9PrivateStatesNotStoredError;
    expect(Object.fromEntries(storingWallet.stored)).toEqual({ [`${storing}:b`]: { stamp: 1 } });
    expect(notStored.notStored).toEqual([
      { contractAddress: refusing, privateStateId: 'a', privateState: { stamp: 1 }, cause: refusal }
    ]);
    expect(notStored.cause).toBe(refusal);
    expect(Object.keys(notStored)).not.toContain('notStored');
    expect(JSON.stringify(notStored)).not.toContain('stamp');
    expect(notStored.message).not.toContain('stamp');
  });

  it('refuses a call that names a private state id with no private state provider to store it through, before it runs', async () => {
    // Arrange
    const {
      withKeys,
      addresses: [address]
    } = await chainWithStamps();
    const wallet = withKeys(stampsKeys);
    const withoutStore = { ...wallet.providers };
    Reflect.set(withoutStore, 'privateStateProvider', undefined);

    // Act
    const error = await withContractScopedTransaction(withoutStore, async (txCtx) => {
      await submitCallTx(withoutStore, step(address, 'id'), txCtx);
    }).catch((e: unknown) => e);

    // Assert: RED WHEN the call runs, or is refused only after the transaction succeeds.
    expect(error).toBeInstanceOf(IncompleteCallTxPrivateStateConfig);
    expect(wallet.providers.publicDataProvider.queryZSwapAndContractState).not.toHaveBeenCalled();
    expect(wallet.providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });
});

/** Makes every read through `provider` wait until the returned `release` is called. */
const holdReads = (provider: PrivateStateProvider) => {
  const forContract = vi.mocked(provider.forContract).getMockImplementation();
  const held = { reading: false, release: (): void => undefined };
  const gate = new Promise<void>((resolve) => {
    held.release = resolve;
  });
  vi.mocked(provider.forContract).mockImplementation((address) => ({
    ...forContract!(address),
    get: async (id) => {
      held.reading = true;
      await gate;
      return forContract!(address).get(id);
    }
  }));
  return held;
};

describe('a ledger 9 scoped transaction once it begins to submit', () => {
  it('refuses a call made while it waits for its transaction, and stores the private state it submitted', async () => {
    // Arrange
    const { address, providers, stored } = await chainRecordingOrder();
    let lateCall: (() => Promise<unknown>) | undefined;
    let late: unknown;
    vi.mocked(providers.publicDataProvider.watchForTxData).mockImplementation(async () => {
      late = await lateCall!().then(
        () => 'recorded',
        (e: unknown) => e
      );
      return createMockFinalizedTxData();
    });
    const handed: unknown[] = [];

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, step(address, 'id'), txCtx);
        lateCall = () => submitCallTx(providers, step(address, 'id'), txCtx);
      },
      { beforeSubmit: (_txIds, pending) => void handed.push(...pending.map(({ privateState }) => privateState)) }
    );

    // Assert: RED WHEN a call made during the wait is recorded, or the scope stores the states it holds
    // after the wait instead of those it submitted.
    expect(late).toBeInstanceOf(InvalidArgumentError);
    expect(handed).toEqual([{ stamp: 1 }]);
    expect(stored.get(`${address}:id`)).toEqual({ stamp: 1 });
  });

  it('refuses, before anything is submitted, when a call is still running as its function returns', async () => {
    // Arrange
    const { address, providers } = await chainRecordingOrder();
    const reads = holdReads(providers.privateStateProvider);
    let leftRunning: Promise<unknown> | undefined;

    // Act
    const error = await withContractScopedTransaction(providers, async (txCtx) => {
      leftRunning = submitCallTx(providers, step(address, 'id'), txCtx).then(
        () => 'recorded',
        (e: unknown) => e
      );
      await vi.waitFor(() => expect(reads.reading).toBe(true));
    }).catch((e: unknown) => e);
    reads.release();

    // Assert: RED WHEN the scope submits without the call still running, or records it afterwards.
    expect(error).toBeInstanceOf(InvalidArgumentError);
    expect((error as Error).message).toMatch(/still running/);
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
    expect(await leftRunning).toBeInstanceOf(InvalidArgumentError);
  });
});

describe('a ledger 9 scoped transaction whose outcome leaves its private states unstored', () => {
  it('carries the transaction id and the private states when the wait fails after it was submitted', async () => {
    // Arrange
    const { address, providers, stored } = await chainRecordingOrder();
    const indexerDown = new Error('indexer down');
    vi.mocked(providers.publicDataProvider.watchForTxData).mockRejectedValue(indexerDown);

    // Act
    const error = await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, step(address, 'id'), txCtx);
    }).catch((e: unknown) => e);

    // Assert: RED WHEN the wait's own error escapes, or the states are enumerable or in the message.
    expect(error).toBeInstanceOf(Ledger9SubmittedTxUnconfirmedError);
    const unconfirmed = error as Ledger9SubmittedTxUnconfirmedError;
    expect(unconfirmed.txId).toBe('tx-id');
    expect(unconfirmed.cause).toBe(indexerDown);
    expect(unconfirmed.pendingPrivateStates).toEqual([
      { contractAddress: address, privateStateId: 'id', privateState: { stamp: 1 } }
    ]);
    expect(Object.keys(unconfirmed)).not.toContain('pendingPrivateStates');
    expect(JSON.stringify(unconfirmed)).not.toContain('stamp');
    expect(unconfirmed.message).not.toContain('stamp');
    expect(stored.get(`${address}:id`)).toEqual({ stamp: 0 });
  });

  it('carries the private states and the transaction identifiers on the rejection of the submission itself', async () => {
    // Arrange: the node's answer to the submission is lost, so whether it took the transaction is not known.
    const { address, providers, stored, identifiers } = await chainRecordingOrder();
    vi.mocked(providers.midnightProvider.submitTx).mockRejectedValue(new Error('connection reset'));

    // Act
    const error = await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, step(address, 'id'), txCtx);
      await submitCallTx(providers, step(address, 'id'), txCtx);
    }).catch((e: unknown) => e);

    // Assert: RED WHEN the rejection reaches the caller without the states or the identifiers, or with
    // them enumerable or in its message, or as another class.
    expect(error).toBeInstanceOf(ProviderFailedError);
    const rejected = error as ProviderFailedError;
    expect(rejected).toMatchObject({ method: 'submitTx', code: 'MIDNIGHT_JS_C_PROVIDER_FAILED' });
    expect(rejected.pendingPrivateStates).toEqual([
      { contractAddress: address, privateStateId: 'id', privateState: { stamp: 2 } }
    ]);
    expect(rejected.txIds).toEqual(identifiers);
    expect(Object.keys(rejected)).not.toContain('pendingPrivateStates');
    expect(Object.keys(rejected)).not.toContain('txIds');
    expect(JSON.stringify(rejected)).not.toContain('stamp');
    expect(rejected.message).not.toContain('stamp');
    expect(rejected.message).not.toContain(identifiers[0]);
    expect(stored.get(`${address}:id`)).toEqual({ stamp: 0 });
  });

  it('carries them on the rejection of the submission of a lone call too', async () => {
    // Arrange
    const { address, providers, stored, identifiers } = await chainRecordingOrder();
    vi.mocked(providers.midnightProvider.submitTx).mockRejectedValue(new Error('connection reset'));

    // Act
    const error = await submitCallTx(providers, step(address, 'id')).catch((e: unknown) => e);

    // Assert: RED WHEN a call made outside a scope is rejected without its private state or identifiers.
    expect(error).toBeInstanceOf(ProviderFailedError);
    expect((error as ProviderFailedError).pendingPrivateStates).toEqual([
      { contractAddress: address, privateStateId: 'id', privateState: { stamp: 1 } }
    ]);
    expect((error as ProviderFailedError).txIds).toEqual(identifiers);
    expect(stored.get(`${address}:id`)).toEqual({ stamp: 0 });
  });

  it.each([
    ['carries nothing', {}],
    ['is left as it is', { pendingPrivateStates: ['earlier'], txIds: ['earlier'] }]
  ])('passes on a coded rejection of the submission as itself, which %s', async (_what, held) => {
    // Arrange: the midnight provider's own refusal, raised before it sends anything.
    const { address, providers } = await chainRecordingOrder();
    const refusal = Object.assign(new InvalidArgumentError('Refusing to submit a transaction without an identifier.'), held);
    vi.mocked(providers.midnightProvider.submitTx).mockRejectedValue(refusal);

    // Act
    const error = await submitCallTx(providers, step(address, 'id')).catch((e: unknown) => e);

    // Assert: RED WHEN the scope writes the states or identifiers onto an error it did not build.
    expect(error).toBe(refusal);
    const carried = { pendingPrivateStates: Reflect.get(refusal, 'pendingPrivateStates'), txIds: Reflect.get(refusal, 'txIds') };
    expect(carried).toEqual({ pendingPrivateStates: undefined, txIds: undefined, ...held });
  });

  it('carries the private states on the TxFailedError of a transaction that did not succeed entirely', async () => {
    // Arrange
    const { address, providers } = await chainRecordingOrder();
    vi.mocked(providers.publicDataProvider.watchForTxData).mockResolvedValue(createMockFinalizedTxData(FailEntirely));

    // Act: two circuits, one of them called twice.
    const error = await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, step(address, 'id'), txCtx);
      await submitCallTx(providers, { compiledContract: stamps, contractAddress: address, circuitId: 'count', privateStateId: 'id' }, txCtx);
      await submitCallTx(providers, step(address, 'id'), txCtx);
    }).catch((e: unknown) => e);

    // Assert: RED WHEN the TxFailedError drops the states, or makes them enumerable, or names the
    // scope's circuits other than each once, in the order first called.
    expect(error).toBeInstanceOf(TxFailedError);
    const failed = error as TxFailedError;
    expect(failed.circuitId).toEqual(['step', 'count']);
    expect(failed.pendingPrivateStates).toEqual([
      { contractAddress: address, privateStateId: 'id', privateState: { stamp: 2 } }
    ]);
    expect(Object.keys(failed)).not.toContain('pendingPrivateStates');
    expect(JSON.stringify(failed)).not.toContain('"stamp"');
  });
});
