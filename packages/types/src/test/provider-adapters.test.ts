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

import type {
  CoinPublicKey,
  EncPublicKey,
  FinalizedTransaction,
  TransactionId
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { UntaggedPayloadError, V8PayloadUnsupportedError } from '../errors';
import { createMidnightProvider } from '../midnight-provider';
import type { UnboundTransaction, VersionedUnboundTransaction } from '../proof-provider';
import { createWalletProvider, type VersionedFinalizedTransaction } from '../wallet-provider';

const coinPublicKey = 'coin-pk' as CoinPublicKey;
const encryptionPublicKey = 'enc-pk' as EncPublicKey;

const v8Payload = { version: 'v8', txBytes: new Uint8Array([1, 2, 3]) } as const;

const stubUnbound = (): UnboundTransaction => ({}) as UnboundTransaction;
const stubFinalized = (): FinalizedTransaction => ({}) as FinalizedTransaction;

describe('createWalletProvider', () => {
  const buildImpl = (balanced: FinalizedTransaction) => ({
    balanceTx: vi.fn(async () => balanced),
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey
  });

  it('tags the implementation result as the v9 arm', async () => {
    const balanced = stubFinalized();
    const provider = createWalletProvider(buildImpl(balanced));

    const result = await provider.balanceTx({ version: 'v9', tx: stubUnbound() });

    expect(result.version).toBe('v9');
    // Identity, not structural equality: ledger objects from different WASM
    // instances must never be conflated, and `toEqual` passes for any object.
    expect(result.version === 'v9' && result.tx).toBe(balanced);
  });

  it('hands the implementation the bare ledger object, never the tagged wrapper', async () => {
    const unbound = stubUnbound();
    const impl = buildImpl(stubFinalized());
    const provider = createWalletProvider(impl);

    await provider.balanceTx({ version: 'v9', tx: unbound });

    expect(impl.balanceTx).toHaveBeenCalledWith(unbound, undefined);
  });

  it('forwards the ttl the caller supplied', async () => {
    const ttl = new Date(0);
    const impl = buildImpl(stubFinalized());
    const provider = createWalletProvider(impl);

    await provider.balanceTx({ version: 'v9', tx: stubUnbound() }, ttl);

    expect(impl.balanceTx).toHaveBeenCalledWith(expect.anything(), ttl);
  });

  it('rejects a v8 payload with the registered code, and never calls the implementation', async () => {
    const impl = buildImpl(stubFinalized());
    const provider = createWalletProvider(impl);

    const rejection = await provider.balanceTx(v8Payload).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
    expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
    expect((rejection as V8PayloadUnsupportedError).seam).toBe('balanceTx');
    expect(impl.balanceTx).not.toHaveBeenCalled();
  });

  it('rejects an untagged payload — the shape a pre-5.0.0 caller passes', async () => {
    const impl = buildImpl(stubFinalized());
    const provider = createWalletProvider(impl);

    const rejection = await provider
      .balanceTx(stubUnbound() as unknown as VersionedUnboundTransaction)
      .then(
        () => undefined,
        (error: unknown) => error
      );

    expect(rejection).toBeInstanceOf(UntaggedPayloadError);
    expect((rejection as UntaggedPayloadError).seam).toBe('balanceTx');
    expect(impl.balanceTx).not.toHaveBeenCalled();
  });

  it('passes the key readers through unchanged', () => {
    const provider = createWalletProvider(buildImpl(stubFinalized()));

    expect(provider.getCoinPublicKey()).toBe(coinPublicKey);
    expect(provider.getEncryptionPublicKey()).toBe(encryptionPublicKey);
  });
});

describe('createMidnightProvider', () => {
  it('hands the implementation the bare ledger object and returns its transaction id', async () => {
    const finalized = stubFinalized();
    const submit = vi.fn(async () => 'tx-id' as TransactionId);
    const provider = createMidnightProvider(submit);

    const txId = await provider.submitTx({ version: 'v9', tx: finalized });

    expect(submit).toHaveBeenCalledWith(finalized);
    expect(txId).toBe('tx-id');
  });

  it('rejects a v8 payload with the registered code, and never submits', async () => {
    const submit = vi.fn(async () => 'tx-id' as TransactionId);
    const provider = createMidnightProvider(submit);

    const rejection = await provider.submitTx(v8Payload).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
    expect((rejection as V8PayloadUnsupportedError).seam).toBe('submitTx');
    expect(submit).not.toHaveBeenCalled();
  });

  it('rejects an untagged payload and never submits', async () => {
    const submit = vi.fn(async () => 'tx-id' as TransactionId);
    const provider = createMidnightProvider(submit);

    const rejection = await provider
      .submitTx(stubFinalized() as unknown as VersionedFinalizedTransaction)
      .then(
        () => undefined,
        (error: unknown) => error
      );

    expect(rejection).toBeInstanceOf(UntaggedPayloadError);
    expect(submit).not.toHaveBeenCalled();
  });
});
