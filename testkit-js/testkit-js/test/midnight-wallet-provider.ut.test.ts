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
  DustSecretKey,
  EncPublicKey,
  FinalizedTransaction,
  TransactionId,
  ZswapSecretKeys
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  UntaggedPayloadError,
  V8PayloadUnsupportedError,
  type VersionedFinalizedTransaction,
  type VersionedUnboundTransaction
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import type {
  BalancingRecipe,
  UnboundTransaction,
  UnboundTransactionRecipe,
  UnshieldedKeystore,
  WalletFacade
} from '@midnightntwrk/wallet-sdk';
import { pino } from 'pino';

import type { EnvironmentConfiguration } from '../src/test-environment/environment-configuration';
import { MidnightWalletProvider } from '../src/wallet/midnight-wallet-provider';

// The payload is rejected before the wallet is touched, so the facade only
// needs the methods this suite asserts are never reached. A single
// `Partial<WalletFacade> as WalletFacade` step rather than a double assertion
// through `Pick`, which is the same escape hatch as `as unknown as`.
const createWalletStub = (): WalletFacade => {
  const stub: Partial<WalletFacade> = {
    balanceUnboundTransaction: vi.fn(),
    submitTransaction: vi.fn()
  };
  return stub as WalletFacade;
};

type Signature = Awaited<ReturnType<UnshieldedKeystore['signDataAsync']>>;

const SIGNATURE = {} as Signature;
const TRANSACTION_ID = 'submitted-tx-id' as TransactionId;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface BalancingWallet {
  readonly wallet: WalletFacade;
  readonly recipe: UnboundTransactionRecipe;
  readonly signedRecipe: BalancingRecipe;
  readonly finalized: FinalizedTransaction;
}

// The wallet's balancing path is three calls deep — balance, sign, finalize —
// and each stage's output has to reach the next one. The recipes it hands back
// are opaque markers: this suite asserts the wiring across the seam, not the
// wallet SDK's own types.
const createBalancingWallet = (): BalancingWallet => {
  const recipe = {} as UnboundTransactionRecipe;
  const signedRecipe = {} as BalancingRecipe;
  const finalized = {} as FinalizedTransaction;
  const stub: Partial<WalletFacade> = {
    balanceUnboundTransaction: vi.fn(async () => recipe),
    signRecipe: vi.fn(async () => signedRecipe),
    finalizeRecipe: vi.fn(async () => finalized),
    submitTransaction: vi.fn(async () => TRANSACTION_ID)
  };
  return { wallet: stub as WalletFacade, recipe, signedRecipe, finalized };
};

const createKeystoreStub = (): UnshieldedKeystore => {
  const stub: Partial<UnshieldedKeystore> = {
    signDataAsync: vi.fn(async () => SIGNATURE)
  };
  return stub as UnshieldedKeystore;
};

const COIN_PUBLIC_KEY = 'coin-pk' as CoinPublicKey;
const ENCRYPTION_PUBLIC_KEY = 'enc-pk' as EncPublicKey;

// Only the two members the key readers project. Distinct values, so a reader
// wired to the wrong one fails instead of matching by coincidence.
const createSecretKeysStub = (): ZswapSecretKeys => {
  const stub: Partial<ZswapSecretKeys> = {
    coinPublicKey: COIN_PUBLIC_KEY,
    encryptionPublicKey: ENCRYPTION_PUBLIC_KEY
  };
  return stub as ZswapSecretKeys;
};

// A real pino logger rather than `{}`: `withWallet` only stores it today, but a
// stub that is not a logger turns any future log call in this path into an
// unreadable TypeError instead of a failed assertion.
const createProvider = async (
  wallet: WalletFacade,
  unshieldedKeystore: UnshieldedKeystore = {} as UnshieldedKeystore
): Promise<MidnightWalletProvider> =>
  MidnightWalletProvider.withWallet(
    pino({ enabled: false }),
    {} as EnvironmentConfiguration,
    wallet,
    createSecretKeysStub(),
    {} as DustSecretKey,
    unshieldedKeystore
  );

describe('MidnightWalletProvider', () => {
  describe('balanceTx with a v8 payload', () => {
    it('rejects with the registered unsupported-payload code and never balances through the wallet', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider.balanceTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
      // Without this the test passes even if balanceTx names the wrong seam.
      expect((rejection as V8PayloadUnsupportedError).seam).toBe('balanceTx');
      expect(wallet.balanceUnboundTransaction).not.toHaveBeenCalled();
    });
  });

  describe('submitTx with a v8 payload', () => {
    it('rejects with the registered unsupported-payload code and never submits through the wallet', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider.submitTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
      expect((rejection as V8PayloadUnsupportedError).seam).toBe('submitTx');
      expect(wallet.submitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('balanceTx with a v9 payload', () => {
    it('hands the wallet the bare unbound transaction and tags the finalized result as the v9 arm', async () => {
      const { wallet, recipe, signedRecipe, finalized } = createBalancingWallet();
      const provider = await createProvider(wallet);
      const unbound = {} as UnboundTransaction;

      const balanced = await provider.balanceTx({ version: 'v9', tx: unbound });

      // Identity throughout, never structural equality: every marker in this
      // suite is an opaque object, so `toHaveBeenCalledWith` would not tell one
      // stage's output from another's. The first assertion is the seam's own
      // property: the wallet is handed the bare ledger object, never the
      // version-tagged wrapper.
      expect(vi.mocked(wallet.balanceUnboundTransaction).mock.calls[0][0]).toBe(unbound);
      expect(vi.mocked(wallet.signRecipe).mock.calls[0][0]).toBe(recipe);
      expect(vi.mocked(wallet.finalizeRecipe).mock.calls[0][0]).toBe(signedRecipe);
      expect(balanced.version).toBe('v9');
      expect(balanced.version === 'v9' && balanced.tx).toBe(finalized);
    });

    it('signs the recipe through the unshielded keystore it was built with', async () => {
      const { wallet } = createBalancingWallet();
      const keystore = createKeystoreStub();
      const provider = await createProvider(wallet, keystore);
      const payload = new Uint8Array([9, 9, 9]);

      await provider.balanceTx({ version: 'v9', tx: {} as UnboundTransaction });

      const signSegment = vi.mocked(wallet.signRecipe).mock.calls[0][1];
      await expect(signSegment(payload)).resolves.toBe(SIGNATURE);
      expect(keystore.signDataAsync).toHaveBeenCalledWith(payload);
    });

    it('forwards the ttl the caller supplied', async () => {
      const { wallet } = createBalancingWallet();
      const provider = await createProvider(wallet);
      const ttl = new Date(0);

      await provider.balanceTx({ version: 'v9', tx: {} as UnboundTransaction }, ttl);

      expect(vi.mocked(wallet.balanceUnboundTransaction).mock.calls[0][2].ttl).toBe(ttl);
    });

    it('defaults the ttl to one hour ahead when the caller supplies none', async () => {
      const { wallet } = createBalancingWallet();
      const provider = await createProvider(wallet);
      const before = Date.now();

      await provider.balanceTx({ version: 'v9', tx: {} as UnboundTransaction });

      const { ttl } = vi.mocked(wallet.balanceUnboundTransaction).mock.calls[0][2];
      expect(ttl.getTime()).toBeGreaterThanOrEqual(before + ONE_HOUR_MS);
      expect(ttl.getTime()).toBeLessThanOrEqual(Date.now() + ONE_HOUR_MS);
    });
  });

  // The class routes its whole WalletProvider surface through the adapter, key
  // readers included, so that the object handed to `createWalletProvider` has no
  // member the class never calls. That makes these two worth pinning: nothing
  // else exercises them, and the delegation is only justified while it works.
  describe('the key readers', () => {
    it('project the wallet\'s own coin and encryption public keys', async () => {
      const provider = await createProvider(createBalancingWallet().wallet);

      expect(provider.getCoinPublicKey()).toBe(COIN_PUBLIC_KEY);
      expect(provider.getEncryptionPublicKey()).toBe(ENCRYPTION_PUBLIC_KEY);
    });
  });

  describe('submitTx with a v9 payload', () => {
    it('hands the wallet the bare finalized transaction and returns its transaction id', async () => {
      const { wallet, finalized } = createBalancingWallet();
      const provider = await createProvider(wallet);

      const submitted = await provider.submitTx({ version: 'v9', tx: finalized });

      expect(vi.mocked(wallet.submitTransaction).mock.calls[0][0]).toBe(finalized);
      expect(submitted).toBe(TRANSACTION_ID);
    });
  });

  // The likely 5.0.0 migration failure: a consumer built against the pre-5.0.0
  // seam passes a bare transaction. It must fail with a coded, actionable error
  // rather than a TypeError inside the wallet SDK.
  describe('a payload with no recognised version discriminant', () => {
    // These payloads are unrepresentable in the seam types on purpose — that is
    // the property under test. This helper is the one place the type system is
    // stepped around, rather than an `as unknown as` at each call site.
    const untagged = <T>(payload: object): T => payload as T;

    it('rejects on balanceTx with the untagged-payload code and never balances', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider
        .balanceTx(untagged<VersionedUnboundTransaction>({ prove: () => undefined }))
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(UntaggedPayloadError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.UNTAGGED_PAYLOAD)).toBe(true);
      expect((rejection as UntaggedPayloadError).seam).toBe('balanceTx');
      expect(wallet.balanceUnboundTransaction).not.toHaveBeenCalled();
    });

    it('rejects on submitTx with the untagged-payload code and never submits', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider
        .submitTx(untagged<VersionedFinalizedTransaction>({ version: 'v10' }))
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(UntaggedPayloadError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.UNTAGGED_PAYLOAD)).toBe(true);
      expect((rejection as UntaggedPayloadError).received).toBe("'v10'");
      expect(wallet.submitTransaction).not.toHaveBeenCalled();
    });
  });
});
