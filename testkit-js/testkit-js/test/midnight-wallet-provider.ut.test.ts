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

import { type Ledger8Protocol, loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import {
  CostModel,
  DustSecretKey,
  type ProvingProvider,
  Transaction,
  type TransactionId,
  ZswapSecretKeys
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { LedgerTransactionTypes } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import {
  type FinalizedTx,
  InvalidTransactionHandleError,
  LedgerTransaction,
  type UnboundTx
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import {
  type BalancingRecipe,
  ProtocolVersion,
  type UnboundTransactionRecipe,
  type UnshieldedKeystore,
  type WalletFacade,
  WalletTransaction
} from '@midnightntwrk/wallet-sdk';
import * as walletSdkLedger8 from '@midnightntwrk/wallet-sdk/ledger/v8';
import * as walletSdkLedger9 from '@midnightntwrk/wallet-sdk/ledger/v9';
import { pino } from 'pino';
import * as Rx from 'rxjs';

import type { EnvironmentConfiguration } from '../src/test-environment/environment-configuration';
import { MidnightWalletProvider } from '../src/wallet/midnight-wallet-provider';
import { FORK_SCHEDULE } from '../src/wallet/wallet-configuration-mapper';
import { WalletSeeds } from '../src/wallet/wallet-seed';
import { loadWalletLedger8 } from '../src/wallet/wallet-transaction';

const RETAINED_VERSION = ProtocolVersion.ProtocolVersion(1_000_000n);
const CURRENT_VERSION = FORK_SCHEDULE.v9;
const NETWORK_ID = 'undeployed';

const inertProvingProvider: ProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array()),
  lookupKey: () => Promise.resolve(undefined)
};

const ledger9Unbound = (): Promise<LedgerTransactionTypes['v9']['Unbound']> =>
  Transaction.fromParts(NETWORK_ID).prove(inertProvingProvider, CostModel.initialCostModel());

const ledger8Unbound = async (v8: Ledger8Protocol): Promise<LedgerTransactionTypes['v8']['Unbound']> =>
  v8.Transaction.fromParts(NETWORK_ID).prove(inertProvingProvider, v8.CostModel.initialCostModel());

interface EraFixture {
  readonly era: 'v8' | 'v9';
  readonly activeVersion: ProtocolVersion.ProtocolVersion;
  readonly unbound: () => Promise<UnboundTx>;
  readonly finalized: () => Promise<FinalizedTx>;
  readonly walletFinalizedBytes: () => Promise<Uint8Array>;
  readonly walletTransactionClass: () => Promise<unknown>;
  readonly frameworkTransactionClass: () => Promise<unknown>;
}

const eras: readonly EraFixture[] = [
  {
    era: 'v9',
    activeVersion: CURRENT_VERSION,
    unbound: async () => LedgerTransaction.seal('v9', 'Unbound', await ledger9Unbound()),
    finalized: async () => LedgerTransaction.seal('v9', 'Finalized', (await ledger9Unbound()).bind()),
    walletFinalizedBytes: async () => (await ledger9Unbound()).bind().serialize(),
    walletTransactionClass: () => Promise.resolve(walletSdkLedger9.Transaction),
    frameworkTransactionClass: () => Promise.resolve(Transaction)
  },
  {
    era: 'v8',
    activeVersion: RETAINED_VERSION,
    unbound: async () => LedgerTransaction.seal('v8', 'Unbound', await ledger8Unbound(await loadLedger8Protocol())),
    finalized: async () =>
      LedgerTransaction.seal('v8', 'Finalized', (await ledger8Unbound(await loadLedger8Protocol())).bind()),
    walletFinalizedBytes: async () => (await ledger8Unbound(await loadLedger8Protocol())).bind().serialize(),
    walletTransactionClass: () => Promise.resolve(walletSdkLedger8.Transaction),
    frameworkTransactionClass: async () => (await loadLedger8Protocol()).Transaction
  }
];

const walletAt = (activeProtocolVersion: ProtocolVersion.ProtocolVersion): Pick<WalletFacade, 'state'> =>
  ({ state: () => Rx.of({ activeProtocolVersion }) }) as Pick<WalletFacade, 'state'>;

type Signature = Awaited<ReturnType<UnshieldedKeystore['signDataAsync']>>;

const SIGNATURE = {} as Signature;
const TRANSACTION_ID = 'submitted-tx-id' as TransactionId;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface BalancingWallet {
  readonly wallet: WalletFacade;
  readonly recipe: UnboundTransactionRecipe;
  readonly signedRecipe: BalancingRecipe;
  readonly walletFinalized: object;
}

// Balance, sign and finalize are stubbed; the recipes are opaque markers. The
// finalized stage is a real handle around a transaction of the wallet's own
// ledger copy, because the provider reads it back into the framework's copy.
const createBalancingWallet = async (fixture: EraFixture = eras[0]): Promise<BalancingWallet> => {
  const recipe = {} as UnboundTransactionRecipe;
  const signedRecipe = {} as BalancingRecipe;
  const bytes = await fixture.walletFinalizedBytes();
  const walletFinalized =
    fixture.era === 'v9'
      ? walletSdkLedger9.Transaction.deserialize('signature', 'proof', 'binding', bytes)
      : (await loadWalletLedger8()).Transaction.deserialize('signature', 'proof', 'binding', bytes);
  const finalizedHandle = WalletTransaction.adopt('Finalized', walletFinalized, fixture.activeVersion);
  const stub: Partial<WalletFacade> = {
    balanceUnboundTransaction: vi.fn(async () => recipe),
    signRecipe: vi.fn(async () => signedRecipe),
    finalizeRecipe: vi.fn(async () => finalizedHandle),
    submitTransaction: vi.fn(async () => TRANSACTION_ID),
    state: walletAt(fixture.activeVersion).state
  };
  return { wallet: stub as WalletFacade, recipe, signedRecipe, walletFinalized };
};

const createKeystoreStub = (): UnshieldedKeystore => {
  const stub: Partial<UnshieldedKeystore> = {
    signDataAsync: vi.fn(async () => SIGNATURE)
  };
  return stub as UnshieldedKeystore;
};

const SEEDS = WalletSeeds.testWallet();

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

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

describe('MidnightWalletProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('the eras it declares', () => {
    it('declares both eras', async () => {
      const provider = await createProvider((await createBalancingWallet()).wallet);

      expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
    });
  });

  // `ledger-v8` is installed twice, under both npm scopes, and the two copies'
  // classes refuse each other.
  describe('the ledger the v8 transactions are handed to the wallet in', () => {
    it('is the module the wallet SDK publishes, so a revert to another copy fails here', async () => {
      const deserializer = await loadWalletLedger8();

      expect(deserializer.Transaction).toBe(walletSdkLedger8.Transaction);
    });
  });

  describe.each(eras)('balanceTx with a $era handle', (fixture) => {
    it("hands the wallet a copy of the transaction decoded with the wallet's own ledger, at the active version", async () => {
      const { wallet } = await createBalancingWallet(fixture);
      const provider = await createProvider(wallet);
      const unbound = await fixture.unbound();
      const frameworkTx = LedgerTransaction.unwrap(unbound, fixture.era);
      const adopt = vi.spyOn(WalletTransaction, 'adopt');

      await provider.balanceTx(unbound);

      const [stage, adopted, version] = adopt.mock.calls[0];
      expect(stage).toBe('Unbound');
      expect(adopted).not.toBe(frameworkTx);
      expect(adopted).toBeInstanceOf(await fixture.walletTransactionClass());
      expect(adopted.serialize()).toEqual(frameworkTx.serialize());
      expect(version).toBe(fixture.activeVersion);
      expect(vi.mocked(wallet.balanceUnboundTransaction).mock.calls[0][0]).toBe(adopt.mock.results[0].value);
    });

    it("returns a finalized handle of the same era around an object of the framework's ledger copy", async () => {
      const { wallet, recipe, signedRecipe, walletFinalized } = await createBalancingWallet(fixture);
      const provider = await createProvider(wallet);

      const balanced = await provider.balanceTx(await fixture.unbound());

      expect(vi.mocked(wallet.signRecipe).mock.calls[0][0]).toBe(recipe);
      expect(vi.mocked(wallet.finalizeRecipe).mock.calls[0][0]).toBe(signedRecipe);
      expect(balanced.era).toBe(fixture.era);
      expect(balanced.stage).toBe('Finalized');
      const unwrapped = LedgerTransaction.unwrap(balanced, fixture.era);
      expect(unwrapped).toBeInstanceOf(await fixture.frameworkTransactionClass());
      expect(unwrapped).not.toBe(walletFinalized);
      expect(balanced.serialize()).toEqual(await fixture.walletFinalizedBytes());
    });
  });

  describe('balanceTx', () => {
    it('signs the recipe through the unshielded keystore it was built with', async () => {
      const { wallet } = await createBalancingWallet();
      const keystore = createKeystoreStub();
      const provider = await createProvider(wallet, keystore);
      const payload = new Uint8Array([9, 9, 9]);

      await provider.balanceTx(await eras[0].unbound());

      const signSegment = vi.mocked(wallet.signRecipe).mock.calls[0][1];
      await expect(signSegment(payload)).resolves.toBe(SIGNATURE);
      expect(keystore.signDataAsync).toHaveBeenCalledWith(payload);
    });

    it('forwards the ttl the caller supplied', async () => {
      const { wallet } = await createBalancingWallet();
      const provider = await createProvider(wallet);
      const ttl = new Date(0);

      await provider.balanceTx(await eras[0].unbound(), ttl);

      expect(vi.mocked(wallet.balanceUnboundTransaction).mock.calls[0][1].ttl).toBe(ttl);
    });

    it('defaults the ttl to one hour ahead when the caller supplies none', async () => {
      const { wallet } = await createBalancingWallet();
      const provider = await createProvider(wallet);
      const before = Date.now();

      await provider.balanceTx(await eras[0].unbound());

      const { ttl } = vi.mocked(wallet.balanceUnboundTransaction).mock.calls[0][1];
      expect(ttl.getTime()).toBeGreaterThanOrEqual(before + ONE_HOUR_MS);
      expect(ttl.getTime()).toBeLessThanOrEqual(Date.now() + ONE_HOUR_MS);
    });
  });

  describe.each(eras)('submitTx with a $era handle', (fixture) => {
    it("hands the wallet a copy decoded with the wallet's own ledger and returns its transaction id", async () => {
      const { wallet } = await createBalancingWallet(fixture);
      const provider = await createProvider(wallet);
      const finalized = await fixture.finalized();
      const frameworkTx = LedgerTransaction.unwrap(finalized, fixture.era);
      const adopt = vi.spyOn(WalletTransaction, 'adopt');

      const submitted = await provider.submitTx(finalized);

      const [stage, adopted, version] = adopt.mock.calls[0];
      expect(stage).toBe('Finalized');
      expect(adopted).not.toBe(frameworkTx);
      expect(adopted).toBeInstanceOf(await fixture.walletTransactionClass());
      expect(adopted.serialize()).toEqual(frameworkTx.serialize());
      expect(version).toBe(fixture.activeVersion);
      expect(vi.mocked(wallet.submitTransaction).mock.calls[0][0]).toBe(adopt.mock.results[0].value);
      expect(submitted).toBe(TRANSACTION_ID);
    });
  });

  describe('the secret keys it derives', () => {
    it('derives the shielded keys from the shielded seed and the dust key from the dust seed', async () => {
      const provider = await createProvider((await createBalancingWallet()).wallet);

      expect(provider.zswapSecretKeys.coinPublicKey).toBe(ZswapSecretKeys.fromSeed(SEEDS.shielded).coinPublicKey);
      expect(provider.zswapSecretKeys.coinPublicKey).not.toBe(ZswapSecretKeys.fromSeed(SEEDS.dust).coinPublicKey);
      expect(provider.dustSecretKey.publicKey).toBe(DustSecretKey.fromSeed(SEEDS.dust).publicKey);
      expect(provider.dustSecretKey.publicKey).not.toBe(DustSecretKey.fromSeed(SEEDS.shielded).publicKey);
    });
  });

  describe('the key readers', () => {
    it("project the shielded keys derived from the wallet's own seed", async () => {
      const provider = await createProvider((await createBalancingWallet()).wallet);
      const shielded = ZswapSecretKeys.fromSeed(SEEDS.shielded);

      expect(provider.getCoinPublicKey()).toBe(shielded.coinPublicKey);
      expect(provider.getEncryptionPublicKey()).toBe(shielded.encryptionPublicKey);
    });
  });

  // The likely migration failure: a consumer built against the old API passes
  // the version-tagged record or a bare transaction instead of a handle.
  describe('a value that is not a transaction handle', () => {
    it('is refused on balanceTx with the invalid-handle code, and nothing is balanced', async () => {
      const { wallet } = await createBalancingWallet();
      const provider = await createProvider(wallet);
      const frameworkTx = await ledger9Unbound();

      // @ts-expect-error the pre-handle version-tagged record is no longer accepted
      const rejection = await rejectionOf(provider.balanceTx({ version: 'v9', tx: frameworkTx }));

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
      expect(rejection).toMatchObject({ method: 'balanceTx', reason: 'not-a-handle' });
      expect(wallet.balanceUnboundTransaction).not.toHaveBeenCalled();
    });

    it('is refused on submitTx with the invalid-handle code, and nothing is submitted', async () => {
      const { wallet } = await createBalancingWallet();
      const provider = await createProvider(wallet);
      const frameworkTx = (await ledger9Unbound()).bind();

      // @ts-expect-error a bare ledger transaction is not a handle
      const rejection = await rejectionOf(provider.submitTx(frameworkTx));

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
      expect(rejection).toMatchObject({ method: 'submitTx', reason: 'not-a-handle' });
      expect(wallet.submitTransaction).not.toHaveBeenCalled();
    });

    it('is refused on balanceTx when the handle is at another stage, and nothing is balanced', async () => {
      const { wallet } = await createBalancingWallet();
      const provider = await createProvider(wallet);

      // @ts-expect-error a finalized handle where an unbound one is required
      const rejection = await rejectionOf(provider.balanceTx(await eras[0].finalized()));

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
      expect(rejection).toMatchObject({ method: 'balanceTx', reason: 'wrong-stage' });
      expect(wallet.balanceUnboundTransaction).not.toHaveBeenCalled();
    });
  });
});
