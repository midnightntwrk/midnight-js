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
import {
  coinCommitment,
  type CoinPublicKey,
  sampleEncryptionPublicKey,
  Transaction,
  type UnprovenTransaction,
  ZswapSecretKeys
} from '@midnightntwrk/midnight-js-protocol/v9';
import { SucceedEntirely } from '@midnightntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex, toHex } from '@midnightntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { ZswapOutputResolutionError } from '../errors';
import { scoped } from '../internal/transaction';
import { submitCallTx } from '../submit-call-tx';
import { type ScopedTransactionOptions, withContractScopedTransaction, withLedger8ContractScopedTransaction } from '../transaction';
import { createLedger9UnprovenCallTx, createUnprovenCallTx } from '../unproven-call-tx';
import {
  BECH32M_COIN_PUBLIC_KEY,
  callee,
  calleeKeys,
  chainOf,
  deployedCallee,
  ledgerWellFormed,
  provenInput
} from './scoped-transaction-fixtures';
import { createMockContractAddress, createMockZswapSecretKeys, MOCK_CONFIG } from './test-mocks';

const hex = (key: CoinPublicKey): string => parseCoinPublicKeyToHex(key, MOCK_CONFIG.networkId);

const SEED = new Uint8Array(32).fill(9);

/** Keys made for one transaction, derived from a fixed seed. */
const oneTimeKeys = (): ZswapSecretKeys => ZswapSecretKeys.fromSeed(SEED);

/** Keys whose coin public key is `coinPublicKey`, as written, and whose other keys are samples. */
const keysOf = (coinPublicKey: CoinPublicKey): ZswapSecretKeys => ({
  ...createMockZswapSecretKeys(),
  coinPublicKey,
  clear: vi.fn()
});

/** Providers over a chain holding one deployed `callee`, at `address`. */
const chainWithCallee = async () => {
  const address = createMockContractAddress();
  const chain = await chainOf(new Map([[address, deployedCallee()]]));
  return { address, providers: chain.withKeys(calleeKeys).providers, walletCoinPublicKey: chain.coinPublicKey };
};

const DOMAIN = new Uint8Array(32).fill(7);

/** `callee.mintAndSend`: mints `value` and sends all of it to `coinPublicKey`. */
const mintTo = (address: string, coinPublicKey: CoinPublicKey, nonce: number, value = 1000n) => ({
  compiledContract: callee,
  contractAddress: address,
  circuitId: 'mintAndSend' as const,
  args: [
    DOMAIN,
    value,
    new Uint8Array(32).fill(nonce),
    { bytes: new Uint8Array(Buffer.from(hex(coinPublicKey), 'hex')) },
    value
  ] as [Uint8Array, bigint, Uint8Array, { bytes: Uint8Array }, bigint]
});

/** `callee.deposit`: the contract takes `coin` in. */
const deposit = (address: string, coin: CircuitCoin) => ({
  compiledContract: callee,
  contractAddress: address,
  circuitId: 'deposit' as const,
  args: [coin] as [CircuitCoin]
});

/** A coin as a circuit takes and returns it. */
type CircuitCoin = { readonly nonce: Uint8Array; readonly color: Uint8Array; readonly value: bigint };

/** The commitment of `coin` for the coin public key `owner`. */
const commitmentFor = (coin: CircuitCoin, owner: CoinPublicKey): string =>
  coinCommitment({ type: toHex(coin.color), nonce: toHex(coin.nonce), value: coin.value }, hex(owner));

const commitmentsOf = (tx: UnprovenTransaction, part: 'outputs' | 'transients'): string[] =>
  [tx.guaranteedOffer, ...(tx.fallibleOffer?.values() ?? [])].flatMap((offer) =>
    [...(offer?.[part] ?? [])].map((item) => String(item.commitment))
  );

/** Every text an error shows of itself and of each cause under it. */
const textsOf = (error: unknown): string[] => {
  const texts: string[] = [];
  for (let at: unknown = error; at !== undefined && at !== null; at = (at as { cause?: unknown }).cause) {
    texts.push(String(at), JSON.stringify(at));
    if (at instanceof Error) texts.push(at.message, ...Object.values(at).map((value) => String(value)));
    if (typeof at !== 'object') break;
  }
  return texts;
};

/** Every form of the keys that must never leave the scope. */
const keyTexts = (keys: ZswapSecretKeys): string[] => [
  toHex(SEED),
  keys.coinPublicKey,
  keys.encryptionPublicKey,
  toHex(keys.coinSecretKey.yesIKnowTheSecurityImplicationsOfThis_serialize()),
  toHex(keys.encryptionSecretKey.yesIKnowTheSecurityImplicationsOfThis_serialize())
];

const expectNoKeyIn = (error: unknown, keys: ZswapSecretKeys): void => {
  const texts = textsOf(error);
  for (const key of keyTexts(keys)) {
    expect(texts.filter((text) => text.includes(key))).toEqual([]);
  }
  expect(Object.values(error as object)).not.toContain(keys);
};

describe('one-time keys (spentHere) in a ledger 9 scoped transaction', () => {
  it('spends again, inside the transaction, the coin one call makes for them, so a later call takes its value in', async () => {
    // Arrange
    const { address, providers, walletCoinPublicKey } = await chainWithCallee();
    const keys = oneTimeKeys();
    let sent: CircuitCoin | undefined;
    let walletCoin: CircuitCoin | undefined;

    // Act
    const finalized = await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        sent = (await submitCallTx(providers, mintTo(address, keys.coinPublicKey, 1), txCtx)).private.result.sent;
        walletCoin = (await submitCallTx(providers, mintTo(address, walletCoinPublicKey, 2, 300n), txCtx)).private
          .result.sent;
        await submitCallTx(providers, deposit(address, { ...sent, nonce: new Uint8Array(32).fill(3) }), txCtx);
      },
      { spentHere: keys }
    );

    // Assert: RED WHEN the coin made for the one-time keys stays an output of the transaction, or the
    // output to another key is spent too.
    const tx = provenInput(providers.proofProvider.proveTx);
    const oneTimeCoin = commitmentFor(sent!, keys.coinPublicKey);
    expect(finalized.public.status).toBe(SucceedEntirely);
    expect(commitmentsOf(tx, 'transients')).toContain(oneTimeCoin);
    expect(commitmentsOf(tx, 'outputs')).not.toContain(oneTimeCoin);
    expect(commitmentsOf(tx, 'outputs')).toContain(commitmentFor(walletCoin!, walletCoinPublicKey));
    expect(ledgerWellFormed(tx)).toBe(true);
  });

  it('spends again the coin a lone call makes for them', async () => {
    // Arrange
    const { address, providers } = await chainWithCallee();
    const keys = oneTimeKeys();
    let sent: CircuitCoin | undefined;

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        sent = (await submitCallTx(providers, mintTo(address, keys.coinPublicKey, 4), txCtx)).private.result.sent;
      },
      { spentHere: keys }
    );

    // Assert: RED WHEN a scope of one call builds without the one-time keys.
    const tx = provenInput(providers.proofProvider.proveTx);
    const oneTimeCoin = commitmentFor(sent!, keys.coinPublicKey);
    expect(commitmentsOf(tx, 'transients')).toContain(oneTimeCoin);
    expect(commitmentsOf(tx, 'outputs')).not.toContain(oneTimeCoin);
    expect(ledgerWellFormed(tx)).toBe(true);
    expect(providers.proofProvider.proveTx).toHaveBeenCalledOnce();
  });

  it('leaves every output untouched when the scope is given no one-time keys', async () => {
    // Arrange
    const { address, providers } = await chainWithCallee();
    const keys = oneTimeKeys();
    let sent: CircuitCoin | undefined;

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        sent = (await submitCallTx(providers, mintTo(address, keys.coinPublicKey, 5), txCtx)).private.result.sent;
      },
      { additionalCoinEncPublicKeyMappings: new Map([[keys.coinPublicKey, keys.encryptionPublicKey]]) }
    );

    // Assert: RED WHEN an output is spent again without one-time keys given.
    const tx = provenInput(providers.proofProvider.proveTx);
    const oneTimeCoin = commitmentFor(sent!, keys.coinPublicKey);
    expect(commitmentsOf(tx, 'transients')).not.toContain(oneTimeCoin);
    expect(commitmentsOf(tx, 'outputs')).toContain(oneTimeCoin);
  });

  describe('refused before any proof is made', () => {
    it("refuses the scope wallet's own keys, its key given in Bech32m", async () => {
      // Arrange
      // The scope is opened with a wallet whose key is the one-time key; its call is made by another wallet.
      const { address, providers: callProviders, walletCoinPublicKey } = await chainWithCallee();
      const providers = {
        ...callProviders,
        walletProvider: { ...callProviders.walletProvider, getCoinPublicKey: () => BECH32M_COIN_PUBLIC_KEY }
      };
      const keys = keysOf(hex(BECH32M_COIN_PUBLIC_KEY));

      // Act
      const error = await withContractScopedTransaction(
        providers,
        async (txCtx) => {
          await submitCallTx(callProviders, mintTo(address, walletCoinPublicKey, 6), txCtx);
        },
        { spentHere: keys }
      ).catch((e: unknown) => e);

      // Assert: RED WHEN the scope's wallet is not compared, or its key is compared as given, not in hex.
      expect(error).toBeInstanceOf(InvalidArgumentError);
      expect((error as Error).message).toMatch(/wallet's own/);
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    it("refuses the keys of a call's wallet, the one-time key given in Bech32m", async () => {
      // Arrange
      const { address, providers } = await chainWithCallee();
      const callWallet = {
        ...providers,
        walletProvider: { ...providers.walletProvider, getCoinPublicKey: () => hex(BECH32M_COIN_PUBLIC_KEY) }
      };
      const keys = keysOf(BECH32M_COIN_PUBLIC_KEY);

      // Act
      const error = await withContractScopedTransaction(
        providers,
        async (txCtx) => {
          await submitCallTx(callWallet, mintTo(address, hex(BECH32M_COIN_PUBLIC_KEY), 7), txCtx);
        },
        { spentHere: keys }
      ).catch((e: unknown) => e);

      // Assert: RED WHEN only the scope's wallet is compared, or the one-time key is not read as Bech32m.
      expect(error).toBeInstanceOf(InvalidArgumentError);
      expect((error as Error).message).toMatch(/wallet's own/);
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    it('refuses keys that spend no coin the scope made', async () => {
      // Arrange
      const { address, providers, walletCoinPublicKey } = await chainWithCallee();
      const keys = oneTimeKeys();

      // Act
      const error = await withContractScopedTransaction(
        providers,
        async (txCtx) => {
          await submitCallTx(providers, mintTo(address, walletCoinPublicKey, 8), txCtx);
        },
        { spentHere: keys }
      ).catch((e: unknown) => e);

      // Assert: RED WHEN keys that spend nothing are accepted.
      expect(error).toBeInstanceOf(InvalidArgumentError);
      expect((error as Error).message).toMatch(/spend no coin/);
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
      expectNoKeyIn(error, keys);
    });

    it('refuses a mapping that gives the one-time coin key another encryption key', async () => {
      // Arrange
      const { address, providers } = await chainWithCallee();
      const keys = oneTimeKeys();

      // Act
      const error = await withContractScopedTransaction(
        providers,
        async (txCtx) => {
          await submitCallTx(providers, mintTo(address, keys.coinPublicKey, 9), txCtx);
        },
        {
          spentHere: keys,
          additionalCoinEncPublicKeyMappings: new Map([[keys.coinPublicKey, sampleEncryptionPublicKey()]])
        }
      ).catch((e: unknown) => e);

      // Assert: RED WHEN the one-time keys' own mapping is not checked against the mappings given.
      expect(error).toBeInstanceOf(ZswapOutputResolutionError);
      expect((error as Error).message).toMatch(/one-time/);
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
      expectNoKeyIn(error, keys);
    });

    it('refuses a mapping that gives the one-time coin key, written in Bech32m, another encryption key, naming no key', async () => {
      // Arrange: the coin public key of the keys made from SEED, as a wallet would write it.
      const { address, providers } = await chainWithCallee();
      const keys = oneTimeKeys();
      const bech32m = 'mn_shield-cpk_undeployed1e2rlqq0rkxs9vaxgxmlzq9wtc2gfgt7hu2vyfh47j8z79ctmr7tq6uah6t';
      expect(parseCoinPublicKeyToHex(bech32m, MOCK_CONFIG.networkId)).toBe(keys.coinPublicKey);

      // Act
      const error = await withContractScopedTransaction(
        providers,
        async (txCtx) => {
          await submitCallTx(providers, mintTo(address, keys.coinPublicKey, 16), txCtx);
        },
        { spentHere: keys, additionalCoinEncPublicKeyMappings: new Map([[bech32m, sampleEncryptionPublicKey()]]) }
      ).catch((e: unknown) => e);

      // Assert: RED WHEN a one-time coin key written in Bech32m escapes its own refusal for the one that
      // names both keys.
      expect(error).toBeInstanceOf(ZswapOutputResolutionError);
      expect((error as Error).message).toMatch(/one-time/);
      expect((error as Error).message).not.toContain(bech32m);
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
      expectNoKeyIn(error, keys);
    });

    it('refuses them in a nested scope, before any of its calls runs, naming the option', async () => {
      // Arrange
      const { address, providers, walletCoinPublicKey } = await chainWithCallee();
      const keys = oneTimeKeys();
      const nestedBody = vi.fn(async () => undefined);

      // Act
      const error = await withContractScopedTransaction(providers, async (txCtx) => {
        await submitCallTx(providers, mintTo(address, walletCoinPublicKey, 10), txCtx);
        await scoped(providers, nestedBody, txCtx, { spentHere: keys });
      }).catch((e: unknown) => e);

      // Assert: RED WHEN a nested scope takes one-time keys its outer scope never applies.
      expect(error).toBeInstanceOf(InvalidArgumentError);
      expect((error as Error).message).toMatch(/'spentHere'.*nested/);
      expect(nestedBody).not.toHaveBeenCalled();
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
      expectNoKeyIn(error, keys);
    });

    it('refuses them on a ledger 8 network, through either way in, before the function runs', async () => {
      // Arrange
      const { providers } = await chainWithCallee();
      providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(1_000_000);
      const keys = oneTimeKeys();
      const body = vi.fn(async () => undefined);

      // Act
      const errors = await Promise.all([
        withContractScopedTransaction(providers, body, { spentHere: keys }).catch((e: unknown) => e),
        withLedger8ContractScopedTransaction(providers, body, { spentHere: keys }).catch((e: unknown) => e)
      ]);

      // Assert: RED WHEN the ledger 8 scope runs with one-time keys it never applies.
      for (const error of errors) {
        expect(error).toBeInstanceOf(InvalidArgumentError);
        expect((error as Error).message).toMatch(/'spentHere'.*ledger 8/);
        expectNoKeyIn(error, keys);
      }
      expect(body).not.toHaveBeenCalled();
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    });
  });
  it('shows the scope transaction so far through the mid-scope getter: refused until a call makes their coin, the transient after', async () => {
    // Arrange
    const { address, providers, walletCoinPublicKey } = await chainWithCallee();
    const keys = oneTimeKeys();
    let before: unknown;
    let after: UnprovenTransaction | undefined;
    let sent: CircuitCoin | undefined;

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, mintTo(address, walletCoinPublicKey, 11), txCtx);
        try {
          txCtx.getLastUnsubmittedCallTxDataToTransact();
        } catch (error) {
          before = error;
        }
        sent = (await submitCallTx(providers, mintTo(address, keys.coinPublicKey, 12), txCtx)).private.result.sent;
        after = txCtx
          .getLastUnsubmittedCallTxDataToTransact()![0]
          .private.unprovenTx.deserialize({ v9: Transaction }) as UnprovenTransaction;
      },
      { spentHere: keys }
    );

    // Assert: RED WHEN the getter builds without the one-time keys.
    expect(before).toBeInstanceOf(InvalidArgumentError);
    expect((before as Error).message).toMatch(/spend no coin/);
    expectNoKeyIn(before, keys);
    const oneTimeCoin = commitmentFor(sent!, keys.coinPublicKey);
    expect(commitmentsOf(after!, 'transients')).toContain(oneTimeCoin);
    expect(commitmentsOf(after!, 'outputs')).not.toContain(oneTimeCoin);
  });

  describe('a call built as its own transaction with the scope', () => {
    const builders = {
      createLedger9UnprovenCallTx,
      createUnprovenCallTx
    } as const;

    for (const [name, build] of Object.entries(builders)) {
      it(`is refused by ${name} in a scope given one-time keys, before its circuit runs, naming the option`, async () => {
        // Arrange: the call maps the one-time key itself, as a caller had to before the scope did.
        const { address, providers } = await chainWithCallee();
        const keys = oneTimeKeys();
        const call = {
          ...mintTo(address, keys.coinPublicKey, 13),
          additionalCoinEncPublicKeyMappings: new Map([[keys.coinPublicKey, keys.encryptionPublicKey]])
        };
        let refusal: unknown;

        // Act
        await withContractScopedTransaction(
          providers,
          async (txCtx) => {
            refusal = await build(providers, call, txCtx).catch((e: unknown) => e);
          },
          { spentHere: keys }
        ).catch(() => undefined);

        // Assert: RED WHEN a call builds its own transaction, which leaves the coin made for the keys an output.
        expect(refusal).toBeInstanceOf(InvalidArgumentError);
        expect((refusal as Error).message).toMatch(/'spentHere'.*Submit the call through the scope/s);
        expect(providers.publicDataProvider.queryZSwapAndContractState).not.toHaveBeenCalled();
        expectNoKeyIn(refusal, keys);
      });
    }

    it("is refused with the context of another copy of this package, which is not an instance of this copy's class", async () => {
      // Arrange: the scope's context as another installed copy makes it: the same members on another class.
      const { address, providers } = await chainWithCallee();
      const keys = oneTimeKeys();
      const call = {
        ...mintTo(address, keys.coinPublicKey, 15),
        additionalCoinEncPublicKeyMappings: new Map([[keys.coinPublicKey, keys.encryptionPublicKey]])
      };
      const asAnotherCopy = <T extends object>(context: T): T => {
        class AnotherCopy {}
        const { constructor: _ownConstructor, ...members } = Object.getOwnPropertyDescriptors(
          Object.getPrototypeOf(context) as object
        );
        Object.defineProperties(AnotherCopy.prototype, members);
        return Object.assign(new AnotherCopy(), context) as T;
      };
      let refusal: unknown;

      // Act
      await withContractScopedTransaction(
        providers,
        async (txCtx) => {
          refusal = await createLedger9UnprovenCallTx(providers, call, asAnotherCopy(txCtx)).catch((e: unknown) => e);
        },
        { spentHere: keys }
      ).catch(() => undefined);

      // Assert: RED WHEN the refusal recognises only this copy's own class.
      expect(refusal).toBeInstanceOf(InvalidArgumentError);
      expect((refusal as Error).message).toMatch(/'spentHere'.*Submit the call through the scope/s);
      expectNoKeyIn(refusal, keys);
    });

    it('is built as before in a scope given no one-time keys', async () => {
      // Arrange
      const { address, providers } = await chainWithCallee();
      const keys = oneTimeKeys();
      const call = {
        ...mintTo(address, keys.coinPublicKey, 14),
        additionalCoinEncPublicKeyMappings: new Map([[keys.coinPublicKey, keys.encryptionPublicKey]])
      };
      let built: UnprovenTransaction | undefined;
      let sent: CircuitCoin | undefined;

      // Act
      await withContractScopedTransaction(providers, async (txCtx) => {
        const data = await createLedger9UnprovenCallTx(providers, call, txCtx);
        sent = data.private.result.sent;
        built = data.private.unprovenTx.deserialize({ v9: Transaction }) as UnprovenTransaction;
      }).catch(() => undefined);

      // Assert: RED WHEN a scope without one-time keys refuses the call's own build.
      expect(commitmentsOf(built!, 'outputs')).toContain(commitmentFor(sent!, keys.coinPublicKey));
    });

    it('is built as before, and so is the scope, when one-time keys are set on its options after it began', async () => {
      // Arrange
      const { address, providers } = await chainWithCallee();
      const keys = oneTimeKeys();
      const mapped = { additionalCoinEncPublicKeyMappings: new Map([[keys.coinPublicKey, keys.encryptionPublicKey]]) };
      const options: ScopedTransactionOptions = { scopeName: 'late keys' };
      let built: UnprovenTransaction | undefined;
      const sent: CircuitCoin[] = [];

      // Act
      await withContractScopedTransaction(
        providers,
        async (txCtx) => {
          Reflect.set(options, 'spentHere', keys);
          const data = await createLedger9UnprovenCallTx(providers, { ...mintTo(address, keys.coinPublicKey, 17), ...mapped }, txCtx);
          sent.push(data.private.result.sent);
          built = data.private.unprovenTx.deserialize({ v9: Transaction }) as UnprovenTransaction;
          const recorded = await submitCallTx(providers, { ...mintTo(address, keys.coinPublicKey, 18), ...mapped }, txCtx);
          sent.push(recorded.private.result.sent);
        },
        options
      );

      // Assert: RED WHEN the scope build reads the keys set later while its refusal does not, or the reverse.
      const submitted = provenInput(providers.proofProvider.proveTx);
      expect(commitmentsOf(built!, 'outputs')).toContain(commitmentFor(sent[0], keys.coinPublicKey));
      expect(commitmentsOf(submitted, 'outputs')).toContain(commitmentFor(sent[1], keys.coinPublicKey));
      expect(commitmentsOf(submitted, 'transients')).not.toContain(commitmentFor(sent[1], keys.coinPublicKey));
    });
  });
});
