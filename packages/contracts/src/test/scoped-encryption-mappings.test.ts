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


import {
  sampleCoinPublicKey,
  sampleEncryptionPublicKey
} from '@midnightntwrk/midnight-js-protocol/v9';
import { SucceedEntirely } from '@midnightntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from '@midnightntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { ZswapOutputResolutionError } from '../errors';
import { assembleLedger9CallTx } from '../internal/ledger9-scope-build';
import type * as InternalUtils from '../internal/utils';
import { createUnprovenLedgerCallTx } from '../internal/utils';
import { submitCallTx } from '../submit-call-tx';
import { withContractScopedTransaction } from '../transaction';
import { createLedger9UnprovenCallTx } from '../unproven-call-tx';
import {
  BECH32M_COIN_PUBLIC_KEY,
  BECH32M_ENCRYPTION_PUBLIC_KEY,
  chainWithShieldedMap,
  deposit
} from './scoped-transaction-fixtures';
import {
  createMockExecutedCall,
  MOCK_CONFIG
} from './test-mocks';

// Every build runs for real; the spy only records what each build was given.
vi.mock('../internal/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof InternalUtils>();
  return { ...actual, createUnprovenLedgerCallTx: vi.fn(actual.createUnprovenLedgerCallTx) };
});

describe('a ledger 9 scoped transaction', () => {
  it("encrypts with the scope's mappings and every call's, merged", async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    const [scopeCoin, firstCoin, secondCoin] = [sampleCoinPublicKey(), sampleCoinPublicKey(), sampleCoinPublicKey()];
    const [scopeEnc, firstEnc, secondEnc] = [sampleEncryptionPublicKey(), sampleEncryptionPublicKey(), sampleEncryptionPublicKey()];
    vi.mocked(createUnprovenLedgerCallTx).mockClear();

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, { ...deposit(contractAddress, 1), additionalCoinEncPublicKeyMappings: new Map([[firstCoin, firstEnc]]) }, txCtx);
        await submitCallTx(providers, { ...deposit(contractAddress, 2), additionalCoinEncPublicKeyMappings: new Map([[secondCoin, secondEnc]]) }, txCtx);
      },
      { additionalCoinEncPublicKeyMappings: new Map([[scopeCoin, scopeEnc]]) }
    );

    // Assert: RED WHEN the scope encrypts with one call's mappings, or without the scope's.
    const [, , , resolve] = vi.mocked(createUnprovenLedgerCallTx).mock.lastCall!;
    const encryptionKeyOf = resolve as (coinPublicKey: string) => string | undefined;
    const hex = (encPublicKey: string) => parseEncPublicKeyToHex(encPublicKey, MOCK_CONFIG.networkId);
    expect([scopeCoin, firstCoin, secondCoin].map(encryptionKeyOf)).toEqual([scopeEnc, firstEnc, secondEnc].map(hex));
  });

  it('refuses a coin key mapped to two encryption keys, in either notation, before proving', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    const coinHex = parseCoinPublicKeyToHex(BECH32M_COIN_PUBLIC_KEY, MOCK_CONFIG.networkId);

    // Act
    const rejection = withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, { ...deposit(contractAddress, 1), additionalCoinEncPublicKeyMappings: new Map([[coinHex, sampleEncryptionPublicKey()]]) }, txCtx);
      await submitCallTx(
        providers,
        { ...deposit(contractAddress, 2), additionalCoinEncPublicKeyMappings: new Map([[BECH32M_COIN_PUBLIC_KEY, sampleEncryptionPublicKey()]]) },
        txCtx
      );
    });

    // Assert: RED WHEN a coin key mapped twice, or written once in Bech32m and once in hex, is not refused.
    await expect(rejection).rejects.toThrow(ZswapOutputResolutionError);
    await expect(rejection).rejects.toThrow(new RegExp(`'${coinHex}' is mapped to two different encryption public keys`));
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it("refuses, before building, a call whose coins are not its own wallet's", () => {
    // Arrange: the second call's Zswap local state belongs to another coin key than its wallet's.
    const own = createMockExecutedCall().assembly;
    const other = createMockExecutedCall().assembly;
    const foreignCoins = {
      ...other,
      encryption: { ...other.encryption, zswapLocalState: { ...other.encryption.zswapLocalState, coinPublicKey: sampleCoinPublicKey() } }
    };

    // Act
    const act = () => assembleLedger9CallTx([own, foreignCoins], MOCK_CONFIG);

    // Assert: RED WHEN the build checks no call's coins against its wallet's coin key.
    expect(act).toThrow(ZswapOutputResolutionError);
    expect(act).toThrow('Unsupported coin');
    expect(createUnprovenLedgerCallTx).not.toHaveBeenCalled();
  });

  it('takes one coin key mapped to one encryption key by several calls, each key in either notation', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    const coinHex = parseCoinPublicKeyToHex(BECH32M_COIN_PUBLIC_KEY, MOCK_CONFIG.networkId);
    const { bech32m: encBech32m, hex: encHex } = BECH32M_ENCRYPTION_PUBLIC_KEY;

    // Act
    const finalized = await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, { ...deposit(contractAddress, 1), additionalCoinEncPublicKeyMappings: new Map([[coinHex, encHex]]) }, txCtx);
      await submitCallTx(providers, { ...deposit(contractAddress, 2), additionalCoinEncPublicKeyMappings: new Map([[BECH32M_COIN_PUBLIC_KEY, encBech32m]]) }, txCtx);
    });

    // Assert: RED WHEN one encryption key given in two notations is taken for two keys.
    expect(finalized.public.status).toBe(SucceedEntirely);
  });

  type Providers = Awaited<ReturnType<typeof chainWithShieldedMap>>['providers'];
  type MappedDeposit = ReturnType<typeof deposit> & { readonly additionalCoinEncPublicKeyMappings: ReadonlyMap<string, string> };

  const lonely = {
    submitCallTx: (providers: Providers, call: MappedDeposit) => submitCallTx(providers, call),
    createLedger9UnprovenCallTx: (providers: Providers, call: MappedDeposit) => createLedger9UnprovenCallTx(providers, call)
  } as const;

  for (const [name, make] of Object.entries(lonely)) {
    it(`refuses, through ${name}, a lone call whose own mapping gives its wallet's coin key another encryption key, before proving`, async () => {
      // Arrange
      const { providers, contractAddress } = await chainWithShieldedMap();
      const walletCoinPublicKey = providers.walletProvider.getCoinPublicKey();
      const call = {
        ...deposit(contractAddress, 1),
        additionalCoinEncPublicKeyMappings: new Map([[walletCoinPublicKey, sampleEncryptionPublicKey()]])
      };

      // Act
      const made = make(providers, call);

      // Assert: RED WHEN a lone call's wallet key enters the merged mappings only from two calls.
      await expect(made).rejects.toThrow(ZswapOutputResolutionError);
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    });
  }
});
