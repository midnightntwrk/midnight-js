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

import { COMMON_ERROR_CODES } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { CostModel, Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvalidTransactionHandleError, PROVIDER_ERROR_CODES, ProviderEraUnsupportedError } from '../errors';
import { LedgerTransaction } from '../ledger-transaction';
import { createLedger9ProofProvider } from '../proof-provider';
import { handles, inertProvingProvider, ledgerTransactions } from './ledger-transaction-fixtures';

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

const timeoutRefusal = expect.objectContaining({
  name: 'InvalidArgumentError',
  code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
  message: expect.stringContaining('proveTxConfig.timeout')
});

describe('createLedger9ProofProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves an unproven v9 handle with its proving provider and cost model, answering an unbound v9 handle', async () => {
    const prove = vi.spyOn(Transaction.prototype, 'prove');
    const costModel = CostModel.initialCostModel();
    const provider = createLedger9ProofProvider(inertProvingProvider, costModel);

    const result = await provider.proveTx(handles.v9.Unproven());

    expect(prove).toHaveBeenCalledWith(inertProvingProvider, costModel);
    expect([result.era, result.stage]).toEqual(['v9', 'Unbound']);
    expect(LedgerTransaction.unwrap(result, 'v9')).toBe(await prove.mock.results[0]?.value);
  });

  it('declares exactly v9', () => {
    expect(createLedger9ProofProvider(inertProvingProvider).supportedEras).toEqual(['v9']);
  });

  it('refuses a v8 handle as an unserved era', async () => {
    const provider = createLedger9ProofProvider(inertProvingProvider);

    const rejection = await rejectionOf(provider.proveTx(await handles.v8.Unproven()));

    expect(rejection).toBeInstanceOf(ProviderEraUnsupportedError);
    expect(rejection).toMatchObject({ code: PROVIDER_ERROR_CODES.PROVIDER_ERA_UNSUPPORTED, method: 'proveTx', era: 'v8' });
  });

  it.each([
    ['the pre-handle version-tagged payload', () => ({ version: 'v9', tx: ledgerTransactions.v9.Unproven() })],
    ['a raw ledger transaction', () => ledgerTransactions.v9.Unproven()],
    ['null', () => null]
  ])('refuses %s as not a handle', async (_label, value) => {
    const prove = vi.spyOn(Transaction.prototype, 'prove');
    const provider = createLedger9ProofProvider(inertProvingProvider);

    // @ts-expect-error the value is not a transaction handle
    const rejection = await rejectionOf(provider.proveTx(value()));

    expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
    expect(rejection).toMatchObject({ method: 'proveTx', reason: 'not-a-handle' });
    expect(prove).not.toHaveBeenCalled();
  });

  describe('proveTxConfig.timeout', () => {
    it.each([
      ['a timeout', 5_000],
      ['a zero timeout', 0]
    ])('refuses a proof with %s before proving starts', async (_label, timeout) => {
      const prove = vi.spyOn(Transaction.prototype, 'prove');
      const provider = createLedger9ProofProvider(inertProvingProvider);

      await expect(provider.proveTx(handles.v9.Unproven(), { timeout })).rejects.toThrow(timeoutRefusal);
      expect(prove).not.toHaveBeenCalled();
    });

    it('names the refusing factory and the provider that honours a timeout', async () => {
      const provider = createLedger9ProofProvider(inertProvingProvider);

      const rejection = await rejectionOf(provider.proveTx(handles.v9.Unproven(), { timeout: 5_000 }));

      expect(String(rejection)).toContain('createLedger9ProofProvider');
      expect(String(rejection)).toContain('httpClientProofProvider');
    });

    it.each([
      ['carries no timeout', {}],
      ['has the timeout key present but undefined', { timeout: undefined }]
    ])('proves a transaction when the config %s', async (_label, config) => {
      const provider = createLedger9ProofProvider(inertProvingProvider);

      const result = await provider.proveTx(handles.v9.Unproven(), config);

      expect([result.era, result.stage]).toEqual(['v9', 'Unbound']);
    });
  });
});
