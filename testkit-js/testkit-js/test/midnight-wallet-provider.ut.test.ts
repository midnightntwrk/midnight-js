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

import { DustSecretKey, type TransactionId, ZswapSecretKeys } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  UntaggedPayloadError,
  V8PayloadUnsupportedError,
  type VersionedFinalizedTransaction,
  type VersionedUnboundTransaction
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import {
  type BalancingRecipe,
  ProtocolVersion,
  type UnboundTransactionRecipe,
  type UnshieldedKeystore,
  type WalletFacade
} from '@midnightntwrk/wallet-sdk';
import { pino } from 'pino';
import * as Rx from 'rxjs';

import type { EnvironmentConfiguration } from '../src/test-environment/environment-configuration';
import { MidnightWalletProvider } from '../src/wallet/midnight-wallet-provider';
import { FORK_SCHEDULE } from '../src/wallet/wallet-configuration-mapper';
import { WalletSeeds } from '../src/wallet/wallet-seed';
import { adoptFinalized, adoptUnbound } from '../src/wallet/wallet-transaction';

// Two versions, one on each side of the fork. The retained one is what the
// refusal-is-gone tests run at; the current one is what the v9 arm needs, since
// a handle only unwraps within the epoch it was authored in.
const RETAINED_VERSION = ProtocolVersion.ProtocolVersion(1_000_000n);
const CURRENT_VERSION = FORK_SCHEDULE.v9;

const walletAt = (activeProtocolVersion: ProtocolVersion.ProtocolVersion): Pick<WalletFacade, 'state'> =>
  ({ state: () => Rx.of({ activeProtocolVersion }) }) as Pick<WalletFacade, 'state'>;

// The payload is rejected before the wallet is touched, so the facade only
// needs the methods this suite asserts are never reached. A single
// `Partial<WalletFacade> as WalletFacade` step rather than a double assertion
// through `Pick`, which is the same escape hatch as `as unknown as`.
const createWalletStub = (): WalletFacade => {
  const stub: Partial<WalletFacade> = {
    balanceUnboundTransaction: vi.fn(),
    submitTransaction: vi.fn(),
    // The seams adopt a transaction AT the chain's active protocol version, so a
    // stub without this cannot reach either era's path. Pinned below the fork
    // version, i.e. the retained epoch. `activeProtocolVersion` is the only
    // member of `FacadeState` these seams read, so the narrowing is confined to
    // this one member rather than spread across the assertions.
    state: walletAt(RETAINED_VERSION).state
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
  readonly finalized: { readonly serialize: () => Uint8Array };
}

// The wallet's balancing path is three calls deep -- balance, sign, finalize --
// and each stage's output has to reach the next one. The recipes it hands back
// are opaque markers: this suite asserts the wiring across the seam, not the
// wallet SDK's own types. The finalized stage is the exception: the seam unwraps
// what `finalizeRecipe` returns, so that one has to be a real handle.
const createBalancingWallet = async (): Promise<BalancingWallet> => {
  const recipe = {} as UnboundTransactionRecipe;
  const signedRecipe = {} as BalancingRecipe;
  const finalized = { serialize: () => new Uint8Array([7, 7, 7]) };
  const finalizedHandle = await adoptFinalized(walletAt(CURRENT_VERSION), finalized as never);
  const stub: Partial<WalletFacade> = {
    balanceUnboundTransaction: vi.fn(async () => recipe),
    signRecipe: vi.fn(async () => signedRecipe),
    finalizeRecipe: vi.fn(async () => finalizedHandle),
    submitTransaction: vi.fn(async () => TRANSACTION_ID),
    state: walletAt(CURRENT_VERSION).state
  };
  return { wallet: stub as WalletFacade, recipe, signedRecipe, finalized };
};

const createKeystoreStub = (): UnshieldedKeystore => {
  const stub: Partial<UnshieldedKeystore> = {
    signDataAsync: vi.fn(async () => SIGNATURE)
  };
  return stub as UnshieldedKeystore;
};

// Real seeds rather than a stub: wallet-sdk 2.0.0-beta.3 takes the seed set and
// derives the shielded and dust secret keys itself, so the constructor runs
// `fromSeed` on whatever is passed here. Shared, so a test can derive the same
// keys independently and compare.
const SEEDS = WalletSeeds.testWallet();

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
    SEEDS,
    unshieldedKeystore
  );

describe('MidnightWalletProvider', () => {
  // These two used to assert the opposite. The retained arm is now carried rather
  // than refused, so what they pin is that the refusal is GONE -- and that what
  // remains can only be a failure of the bytes, never of the version tag. Three
  // bytes are not a transaction, so each still rejects; the assertion is about
  // WHERE.
  describe('balanceTx with a v8 payload', () => {
    it('carries the retained arm instead of refusing it, failing only in the retained deserializer', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider.balanceTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeDefined();
      expect(rejection).not.toBeInstanceOf(V8PayloadUnsupportedError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(false);
    });
  });

  describe('submitTx with a v8 payload', () => {
    it('carries the retained arm instead of refusing it, failing only in the retained deserializer', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider.submitTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeDefined();
      expect(rejection).not.toBeInstanceOf(V8PayloadUnsupportedError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(false);
    });
  });

  describe('balanceTx with a v9 payload', () => {
    it("adopts the transaction at the chain's active version and tags the finalized result as the v9 arm", async () => {
      const { wallet, recipe, signedRecipe, finalized } = await createBalancingWallet();
      const provider = await createProvider(wallet);
      const unbound = { serialize: () => new Uint8Array([1]) };

      const balanced = await provider.balanceTx({ version: 'v9', tx: unbound as never });

      // Structural equality against an independently adopted handle, which pins
      // three things at once: the wallet is handed a handle rather than the
      // version-tagged wrapper, the handle carries the transaction the caller
      // passed, and it is stamped at the version the chain is actually at.
      expect(vi.mocked(wallet.balanceUnboundTransaction).mock.calls[0][0]).toEqual(
        await adoptUnbound(walletAt(CURRENT_VERSION), unbound as never)
      );
      // Identity for the rest, never structural equality: the recipes are opaque
      // markers, so `toHaveBeenCalledWith` would not tell one stage's output from
      // another's.
      expect(vi.mocked(wallet.signRecipe).mock.calls[0][0]).toBe(recipe);
      expect(vi.mocked(wallet.finalizeRecipe).mock.calls[0][0]).toBe(signedRecipe);
      expect(balanced.version).toBe('v9');
      expect(balanced.version === 'v9' && balanced.tx).toBe(finalized);
    });

    it('signs the recipe through the unshielded keystore it was built with', async () => {
      const { wallet } = await createBalancingWallet();
      const keystore = createKeystoreStub();
      const provider = await createProvider(wallet, keystore);
      const payload = new Uint8Array([9, 9, 9]);

      await provider.balanceTx({ version: 'v9', tx: {} as never });

      const signSegment = vi.mocked(wallet.signRecipe).mock.calls[0][1];
      await expect(signSegment(payload)).resolves.toBe(SIGNATURE);
      expect(keystore.signDataAsync).toHaveBeenCalledWith(payload);
    });

    it('forwards the ttl the caller supplied', async () => {
      const { wallet } = await createBalancingWallet();
      const provider = await createProvider(wallet);
      const ttl = new Date(0);

      await provider.balanceTx({ version: 'v9', tx: {} as never }, ttl);

      expect(vi.mocked(wallet.balanceUnboundTransaction).mock.calls[0][1].ttl).toBe(ttl);
    });

    it('defaults the ttl to one hour ahead when the caller supplies none', async () => {
      const { wallet } = await createBalancingWallet();
      const provider = await createProvider(wallet);
      const before = Date.now();

      await provider.balanceTx({ version: 'v9', tx: {} as never });

      const { ttl } = vi.mocked(wallet.balanceUnboundTransaction).mock.calls[0][1];
      expect(ttl.getTime()).toBeGreaterThanOrEqual(before + ONE_HOUR_MS);
      expect(ttl.getTime()).toBeLessThanOrEqual(Date.now() + ONE_HOUR_MS);
    });
  });

  // The wallet SDK takes the seed set and derives both key sets itself, so the
  // swap the class can still get wrong is which seed member feeds which
  // derivation. Each is asserted against its own seed AND against the other's,
  // because the two derivations accept the same argument type.
  describe('the secret keys it derives', () => {
    it('derives the shielded keys from the shielded seed and the dust key from the dust seed', async () => {
      const provider = await createProvider((await createBalancingWallet()).wallet);

      expect(provider.zswapSecretKeys.coinPublicKey).toBe(ZswapSecretKeys.fromSeed(SEEDS.shielded).coinPublicKey);
      expect(provider.zswapSecretKeys.coinPublicKey).not.toBe(ZswapSecretKeys.fromSeed(SEEDS.dust).coinPublicKey);
      expect(provider.dustSecretKey.publicKey).toBe(DustSecretKey.fromSeed(SEEDS.dust).publicKey);
      expect(provider.dustSecretKey.publicKey).not.toBe(DustSecretKey.fromSeed(SEEDS.shielded).publicKey);
    });
  });

  // Nothing else in this suite exercises the key readers, and they are the only
  // members of the provider surface that never touch a transaction.
  describe('the key readers', () => {
    it("project the shielded keys derived from the wallet's own seed", async () => {
      const provider = await createProvider((await createBalancingWallet()).wallet);
      const shielded = ZswapSecretKeys.fromSeed(SEEDS.shielded);

      expect(provider.getCoinPublicKey()).toBe(shielded.coinPublicKey);
      expect(provider.getEncryptionPublicKey()).toBe(shielded.encryptionPublicKey);
    });
  });

  describe('submitTx with a v9 payload', () => {
    it('hands the wallet the adopted finalized transaction and returns its transaction id', async () => {
      const { wallet, finalized } = await createBalancingWallet();
      const provider = await createProvider(wallet);

      const submitted = await provider.submitTx({ version: 'v9', tx: finalized as never });

      expect(vi.mocked(wallet.submitTransaction).mock.calls[0][0]).toEqual(
        await adoptFinalized(walletAt(CURRENT_VERSION), finalized as never)
      );
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
