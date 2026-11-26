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
  TxFailedError
} from '../errors';
import { submitCallTx } from '../submit-call-tx';
import { withContractScopedTransaction } from '../transaction';
import * as Stamps from './resources/compiled/stamps/contract/index.js';
import {
  chainRecordingOrder,
  chainWithStamps,
  type StampsContract,
  stampsKeys,
  step
} from './scoped-transaction-fixtures';
import { createMockFinalizedTxData } from './test-mocks';

type StepResult = Ledger9CallResult<StampsContract, 'step'>;

const lastOf = (result: StepResult): bigint => Stamps.ledger(result.public.nextContractState).last;

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

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, step(address, 'id'), txCtx);
        lateCall = () => submitCallTx(providers, step(address, 'id'), txCtx);
      }
    );

    // Assert: RED WHEN a call made during the wait is recorded, or the scope stores the states it holds
    // after the wait instead of those it submitted.
    expect(late).toBeInstanceOf(InvalidArgumentError);
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
