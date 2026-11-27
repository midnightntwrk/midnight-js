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
import { describe, expect, it, vi } from 'vitest';

import { scoped } from '../internal/transaction';
import { submitCallTx } from '../submit-call-tx';
import { withContractScopedTransaction, withLedger8ContractScopedTransaction } from '../transaction';
import { chainRecordingOrder, IN_FALLIBLE_SECTION, step } from './scoped-transaction-fixtures';

describe('inFallibleSection where no scope that submits would act on it', () => {
  it('is refused for a nested scope, before any of its calls runs', async () => {
    // Arrange
    const { address, providers } = await chainRecordingOrder();
    const nestedBody = vi.fn(async () => undefined);

    // Act
    const error = await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, step(address, 'id'), txCtx);
      await scoped(providers, nestedBody, txCtx, IN_FALLIBLE_SECTION);
    }).catch((e: unknown) => e);

    // Assert: RED WHEN a nested scope takes the option, which only the scope that builds acts on.
    expect(error).toBeInstanceOf(InvalidArgumentError);
    expect((error as Error).message).toMatch(/'inFallibleSection' given to a scoped transaction nested/);
    expect(nestedBody).not.toHaveBeenCalled();
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('is refused for a scope on a ledger 8 network, before its function runs', async () => {
    // Arrange
    const { providers } = await chainRecordingOrder();
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(1_000_000);
    const body = vi.fn(async () => undefined);

    // Act
    const error = await withContractScopedTransaction(providers, body, IN_FALLIBLE_SECTION).catch((e: unknown) => e);

    // Assert: RED WHEN the ledger 8 scope runs with an option it does not act on.
    expect(error).toBeInstanceOf(InvalidArgumentError);
    expect((error as Error).message).toMatch(/'inFallibleSection' given to a scoped transaction on a ledger 8 network/);
    expect(body).not.toHaveBeenCalled();
  });

  it('is refused by withLedger8ContractScopedTransaction, before its function runs', async () => {
    // Arrange
    const { providers } = await chainRecordingOrder();
    const body = vi.fn(async () => undefined);

    // Act
    const error = await withLedger8ContractScopedTransaction(providers, body, IN_FALLIBLE_SECTION).catch(
      (e: unknown) => e
    );

    // Assert: RED WHEN the ledger 8 scope function takes an option it does not act on.
    expect(error).toBeInstanceOf(InvalidArgumentError);
    expect((error as Error).message).toMatch(/'inFallibleSection'/);
    expect(body).not.toHaveBeenCalled();
  });

  it('is refused for a nested scope when false too, since the scope it joins places the calls', async () => {
    // Arrange
    const { address, providers } = await chainRecordingOrder();
    const nestedBody = vi.fn(async () => undefined);

    // Act
    const error = await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, step(address, 'id'), txCtx);
        await scoped(providers, nestedBody, txCtx, { inFallibleSection: false });
      },
      IN_FALLIBLE_SECTION
    ).catch((e: unknown) => e);

    // Assert: RED WHEN a nested scope's false is passed over while the scope it joins places its calls otherwise.
    expect(error).toBeInstanceOf(InvalidArgumentError);
    expect((error as Error).message).toMatch(/'inFallibleSection' given to a scoped transaction nested/);
    expect(nestedBody).not.toHaveBeenCalled();
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });
});
