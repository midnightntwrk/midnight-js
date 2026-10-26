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

import type { LedgerTransactionTypes } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import { describe, expect, it, vi } from 'vitest';

import { InvalidTransactionHandleError, PROVIDER_ERROR_CODES, ProviderEraUnsupportedError } from '../errors';
import { LedgerTransaction } from '../ledger-transaction';
import { createMidnightProvider } from '../midnight-provider';
import { createWalletProvider } from '../wallet-provider';
import { handles, ledgerTransactions } from './ledger-transaction-fixtures';

const coinPublicKey = 'coin-pk';
const encryptionPublicKey = 'enc-pk';

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

describe('createWalletProvider', () => {
  const buildImpl = (balanced: LedgerTransactionTypes['v9']['Finalized']) => ({
    balanceTx: vi.fn(async () => balanced),
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey
  });

  it('answers a finalized v9 handle around the implementation result', async () => {
    const balanced = await ledgerTransactions.v9.Finalized();
    const provider = createWalletProvider(buildImpl(balanced));

    const result = await provider.balanceTx(await handles.v9.Unbound());

    expect([result.era, result.stage]).toEqual(['v9', 'Finalized']);
    expect(LedgerTransaction.unwrap(result, 'v9')).toBe(balanced);
  });

  it('hands the implementation the unwrapped ledger object and the ttl', async () => {
    const handle = await handles.v9.Unbound();
    const ttl = new Date(0);
    const impl = buildImpl(await ledgerTransactions.v9.Finalized());
    const provider = createWalletProvider(impl);

    await provider.balanceTx(handle, ttl);

    expect(impl.balanceTx).toHaveBeenCalledWith(LedgerTransaction.unwrap(handle, 'v9'), ttl);
  });

  it('refuses a v8 handle as an unserved era, and never calls the implementation', async () => {
    const impl = buildImpl(await ledgerTransactions.v9.Finalized());
    const provider = createWalletProvider(impl);

    const rejection = await rejectionOf(provider.balanceTx(await handles.v8.Unbound()));

    expect(rejection).toBeInstanceOf(ProviderEraUnsupportedError);
    expect(rejection).toMatchObject({ code: PROVIDER_ERROR_CODES.PROVIDER_ERA_UNSUPPORTED, method: 'balanceTx', era: 'v8' });
    expect(impl.balanceTx).not.toHaveBeenCalled();
  });

  it('refuses the pre-handle version-tagged payload, and never calls the implementation', async () => {
    const impl = buildImpl(await ledgerTransactions.v9.Finalized());
    const provider = createWalletProvider(impl);

    // @ts-expect-error the version-tagged payload is not a transaction handle
    const rejection = await rejectionOf(provider.balanceTx({ version: 'v9', tx: await ledgerTransactions.v9.Unbound() }));

    expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
    expect(rejection).toMatchObject({ method: 'balanceTx', reason: 'not-a-handle' });
    expect(impl.balanceTx).not.toHaveBeenCalled();
  });

  it('passes the key readers through unchanged', async () => {
    const provider = createWalletProvider(buildImpl(await ledgerTransactions.v9.Finalized()));

    expect([provider.getCoinPublicKey(), provider.getEncryptionPublicKey()]).toEqual([coinPublicKey, encryptionPublicKey]);
  });

  it('declares exactly v9', async () => {
    const provider = createWalletProvider(buildImpl(await ledgerTransactions.v9.Finalized()));

    expect(provider.supportedEras).toEqual(['v9']);
  });
});

describe('createMidnightProvider', () => {
  it('hands the implementation the unwrapped ledger object and returns its transaction id', async () => {
    const handle = await handles.v9.Finalized();
    const submit = vi.fn(async () => 'tx-id');
    const provider = createMidnightProvider(submit);

    const txId = await provider.submitTx(handle);

    expect(submit).toHaveBeenCalledWith(LedgerTransaction.unwrap(handle, 'v9'));
    expect(txId).toBe('tx-id');
  });

  it('refuses a v8 handle as an unserved era, and never submits', async () => {
    const submit = vi.fn(async () => 'tx-id');
    const provider = createMidnightProvider(submit);

    const rejection = await rejectionOf(provider.submitTx(await handles.v8.Finalized()));

    expect(rejection).toBeInstanceOf(ProviderEraUnsupportedError);
    expect(rejection).toMatchObject({ method: 'submitTx', era: 'v8', declared: ['v9'] });
    expect(submit).not.toHaveBeenCalled();
  });

  it('refuses a raw ledger transaction, and never submits', async () => {
    const submit = vi.fn(async () => 'tx-id');
    const provider = createMidnightProvider(submit);

    // @ts-expect-error a raw ledger transaction is not a transaction handle
    const rejection = await rejectionOf(provider.submitTx(await ledgerTransactions.v9.Finalized()));

    expect(rejection).toMatchObject({ name: 'InvalidTransactionHandleError', method: 'submitTx', reason: 'not-a-handle' });
    expect(submit).not.toHaveBeenCalled();
  });

  it('declares exactly v9', () => {
    expect(createMidnightProvider(vi.fn(async () => 'tx-id')).supportedEras).toEqual(['v9']);
  });
});
