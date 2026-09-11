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
  TransactionId,
  UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { UntaggedPayloadError, V8PayloadUnsupportedError } from '../errors';
import { createMidnightProviderFromArms } from '../midnight-provider';
import {
  createProofProviderFromArms,
  type UnboundTransaction,
  type VersionedUnboundTransaction,
  type VersionedUnprovenTransaction
} from '../proof-provider';
import { createWalletProviderFromArms, type VersionedFinalizedTransaction } from '../wallet-provider';

const coinPublicKey = 'coin-pk' as CoinPublicKey;
const encryptionPublicKey = 'enc-pk' as EncPublicKey;

const stubUnproven = (): UnprovenTransaction => ({}) as UnprovenTransaction;
const stubUnbound = (): UnboundTransaction => ({}) as UnboundTransaction;
const stubFinalized = (): FinalizedTransaction => ({}) as FinalizedTransaction;

const keyReaders = {
  getCoinPublicKey: () => coinPublicKey,
  getEncryptionPublicKey: () => encryptionPublicKey
};

describe('createProofProviderFromArms', () => {
  it('declares exactly the current era when no retained arm is supplied', () => {
    const provider = createProofProviderFromArms({ currentEra: async () => stubUnbound() });

    // Set equality, not `toContain`: a declaration that leaked an era it
    // cannot serve is the failure this field exists to prevent, and a
    // one-directional assertion would pass for it.
    expect([...provider.supportedEras].sort()).toEqual(['v9']);
  });

  it('declares both eras when a retained arm is supplied', () => {
    const provider = createProofProviderFromArms({
      currentEra: async () => stubUnbound(),
      retainedEras: { v8: async (bytes) => bytes }
    });

    expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
  });

  // The declaration is read by the pre-flight check in `assertSeamsSupportEra`,
  // so a consumer must not be able to widen it after construction and make the
  // check pass for an era the arms do not serve.
  it('freezes the declaration', () => {
    const provider = createProofProviderFromArms({ currentEra: async () => stubUnbound() });

    expect(Object.isFrozen(provider.supportedEras)).toBe(true);
  });

  it('drives the current-era arm with the bare transaction and tags the answer', async () => {
    const unproven = stubUnproven();
    const unbound = stubUnbound();
    const currentEra = vi.fn(async () => unbound);
    const provider = createProofProviderFromArms({ currentEra });

    const result = await provider.proveTx({ version: 'v9', tx: unproven }, { timeout: 5 });

    expect(currentEra).toHaveBeenCalledWith(unproven, { timeout: 5 });
    expect(result.version).toBe('v9');
    // Identity, not structural equality: two structurally-equal ledger objects
    // can come from different WASM instances, which is what these seams exist
    // to keep apart.
    expect(result.version === 'v9' && result.tx).toBe(unbound);
  });

  it('drives the retained-era arm with the bare bytes and answers in the same era', async () => {
    const requested = new Uint8Array([1, 2, 3]);
    const proven = new Uint8Array([4, 5, 6]);
    const retained = vi.fn(async () => proven);
    const provider = createProofProviderFromArms({
      currentEra: async () => stubUnbound(),
      retainedEras: { v8: retained }
    });

    const result = await provider.proveTx({ version: 'v8', txBytes: requested }, { timeout: 7 });

    expect(retained).toHaveBeenCalledWith(requested, { timeout: 7 });
    expect(result).toEqual({ version: 'v8', txBytes: proven });
  });

  it('never crosses the arms: a current-era request does not reach the retained arm', async () => {
    const retained = vi.fn(async (bytes: Uint8Array) => bytes);
    const provider = createProofProviderFromArms({
      currentEra: async () => stubUnbound(),
      retainedEras: { v8: retained }
    });

    await provider.proveTx({ version: 'v9', tx: stubUnproven() });

    expect(retained).not.toHaveBeenCalled();
  });

  it('rejects the retained arm it was not given, with the registered code', async () => {
    const currentEra = vi.fn(async () => stubUnbound());
    const provider = createProofProviderFromArms({ currentEra });

    const rejection = await provider.proveTx({ version: 'v8', txBytes: new Uint8Array([1]) }).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
    expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
    expect((rejection as V8PayloadUnsupportedError).seam).toBe('proveTx');
    expect(currentEra).not.toHaveBeenCalled();
  });

  it('rejects an untagged payload — the shape a pre-5.0.0 caller passes', async () => {
    const currentEra = vi.fn(async () => stubUnbound());
    const provider = createProofProviderFromArms({ currentEra });

    const rejection = await provider
      .proveTx(stubUnproven() as unknown as VersionedUnprovenTransaction)
      .then(
        () => undefined,
        (error: unknown) => error
      );

    expect(rejection).toBeInstanceOf(UntaggedPayloadError);
    expect((rejection as UntaggedPayloadError).seam).toBe('proveTx');
    expect(currentEra).not.toHaveBeenCalled();
  });
});

describe('createWalletProviderFromArms', () => {
  const currentOnly = () =>
    createWalletProviderFromArms({ currentEra: async () => stubFinalized(), ...keyReaders });

  it('declares exactly the current era when no retained arm is supplied', () => {
    expect([...currentOnly().supportedEras].sort()).toEqual(['v9']);
  });

  it('declares both eras when a retained arm is supplied', () => {
    const provider = createWalletProviderFromArms({
      currentEra: async () => stubFinalized(),
      retainedEras: { v8: async (bytes) => bytes },
      ...keyReaders
    });

    expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
  });

  it('drives the current-era arm with the bare transaction and the ttl, and tags the answer', async () => {
    const ttl = new Date(0);
    const unbound = stubUnbound();
    const finalized = stubFinalized();
    const currentEra = vi.fn(async () => finalized);
    const provider = createWalletProviderFromArms({ currentEra, ...keyReaders });

    const result = await provider.balanceTx({ version: 'v9', tx: unbound }, ttl);

    expect(currentEra).toHaveBeenCalledWith(unbound, ttl);
    expect(result.version === 'v9' && result.tx).toBe(finalized);
  });

  it('drives the retained-era arm with the bare bytes and answers in the same era', async () => {
    const requested = new Uint8Array([1, 2]);
    const balanced = new Uint8Array([3, 4]);
    const retained = vi.fn(async () => balanced);
    const provider = createWalletProviderFromArms({
      currentEra: async () => stubFinalized(),
      retainedEras: { v8: retained },
      ...keyReaders
    });

    const result = await provider.balanceTx({ version: 'v8', txBytes: requested });

    expect(retained).toHaveBeenCalledWith(requested, undefined);
    expect(result).toEqual({ version: 'v8', txBytes: balanced });
  });

  it('rejects the retained arm it was not given, without balancing anything', async () => {
    const currentEra = vi.fn(async () => stubFinalized());
    const provider = createWalletProviderFromArms({ currentEra, ...keyReaders });

    const rejection = await provider.balanceTx({ version: 'v8', txBytes: new Uint8Array([1]) }).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
    expect((rejection as V8PayloadUnsupportedError).seam).toBe('balanceTx');
    expect(currentEra).not.toHaveBeenCalled();
  });

  it('rejects an untagged payload without balancing anything', async () => {
    const currentEra = vi.fn(async () => stubFinalized());
    const provider = createWalletProviderFromArms({ currentEra, ...keyReaders });

    const rejection = await provider
      .balanceTx(stubUnbound() as unknown as VersionedUnboundTransaction)
      .then(
        () => undefined,
        (error: unknown) => error
      );

    expect(rejection).toBeInstanceOf(UntaggedPayloadError);
    expect(currentEra).not.toHaveBeenCalled();
  });

  // The two key readers answer the same for both eras, so they sit beside the
  // arms rather than inside one.
  it('passes the key readers through unchanged', () => {
    const provider = currentOnly();

    expect(provider.getCoinPublicKey()).toBe(coinPublicKey);
    expect(provider.getEncryptionPublicKey()).toBe(encryptionPublicKey);
  });
});

describe('createMidnightProviderFromArms', () => {
  it('declares exactly the current era when no retained arm is supplied', () => {
    const provider = createMidnightProviderFromArms({ currentEra: async () => 'tx-id' as TransactionId });

    expect([...provider.supportedEras].sort()).toEqual(['v9']);
  });

  it('declares both eras when a retained arm is supplied', () => {
    const provider = createMidnightProviderFromArms({
      currentEra: async () => 'tx-id' as TransactionId,
      retainedEras: { v8: async () => 'tx-id-v8' as TransactionId }
    });

    expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
  });

  it('drives the current-era arm with the bare transaction and returns its id', async () => {
    const finalized = stubFinalized();
    const currentEra = vi.fn(async () => 'tx-id' as TransactionId);
    const provider = createMidnightProviderFromArms({ currentEra });

    const txId = await provider.submitTx({ version: 'v9', tx: finalized });

    expect(currentEra).toHaveBeenCalledWith(finalized);
    expect(txId).toBe('tx-id');
  });

  // A transaction id is era-independent, so this seam answers untagged in both
  // arms — the retained arm differs only in what it is handed.
  it('drives the retained-era arm with the bare bytes and returns its id', async () => {
    const requested = new Uint8Array([9]);
    const retained = vi.fn(async () => 'tx-id-v8' as TransactionId);
    const provider = createMidnightProviderFromArms({
      currentEra: async () => 'tx-id' as TransactionId,
      retainedEras: { v8: retained }
    });

    const txId = await provider.submitTx({ version: 'v8', txBytes: requested });

    expect(retained).toHaveBeenCalledWith(requested);
    expect(txId).toBe('tx-id-v8');
  });

  it('rejects the retained arm it was not given, without submitting anything', async () => {
    const currentEra = vi.fn(async () => 'tx-id' as TransactionId);
    const provider = createMidnightProviderFromArms({ currentEra });

    const rejection = await provider.submitTx({ version: 'v8', txBytes: new Uint8Array([1]) }).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
    expect((rejection as V8PayloadUnsupportedError).seam).toBe('submitTx');
    expect(currentEra).not.toHaveBeenCalled();
  });

  it('rejects an untagged payload without submitting anything', async () => {
    const currentEra = vi.fn(async () => 'tx-id' as TransactionId);
    const provider = createMidnightProviderFromArms({ currentEra });

    const rejection = await provider
      .submitTx(stubFinalized() as unknown as VersionedFinalizedTransaction)
      .then(
        () => undefined,
        (error: unknown) => error
      );

    expect(rejection).toBeInstanceOf(UntaggedPayloadError);
    expect(currentEra).not.toHaveBeenCalled();
  });
});
