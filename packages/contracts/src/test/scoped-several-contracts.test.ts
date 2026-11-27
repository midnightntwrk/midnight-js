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
  sampleCoinPublicKey,
  sampleEncryptionPublicKey,
  sampleUserAddress
} from '@midnightntwrk/midnight-js-protocol/v9';
import { type PublicStatesRead, SucceedEntirely } from '@midnightntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from '@midnightntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { type Ledger9CallResult } from '../call';
import { ZswapOutputResolutionError } from '../errors';
import { scopeStateCacheOf } from '../internal/ledger9-scope';
import { PublicStatesOf } from '../internal/transaction';
import type * as InternalUtils from '../internal/utils';
import { createUnprovenLedgerCallTx } from '../internal/utils';
import { submitCallTx } from '../submit-call-tx';
import { type AnyLedger9TransactionContext, withContractScopedTransaction } from '../transaction';
import * as ShieldedMap from './resources/compiled/shielded-map/contract/index.js';
import {
  callee,
  calleeKeys,
  caller,
  callerKeys,
  callsOf,
  chainOf,
  checkpointed,
  checkpointedKeys,
  countingShieldedMap,
  type CountingShieldedMapContract,
  deployedCallee,
  deployedCaller,
  deployedCheckpointed,
  deployedShieldedMap,
  deployedUnshieldedBalance,
  deposit,
  lastProvenInput,
  ledgerWellFormed,
  provenInput,
  shieldedCoin,
  shieldedMapKeys,
  unshieldedBalance,
  unshieldedBalanceKeys
} from './scoped-transaction-fixtures';
import {
  createMockContractAddress,
  MOCK_CONFIG
} from './test-mocks';

// Every build runs for real; the spy only records what each build was given.
vi.mock('../internal/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof InternalUtils>();
  return { ...actual, createUnprovenLedgerCallTx: vi.fn(actual.createUnprovenLedgerCallTx) };
});

describe('a ledger 9 scoped transaction', () => {
  describe('over several contracts', () => {
    const countingDeposit = (contractAddress: string, privateStateId: string, nonce: number) => ({
      compiledContract: countingShieldedMap,
      contractAddress,
      circuitId: 'deposit' as const,
      args: [shieldedCoin(nonce)] as [ReturnType<typeof shieldedCoin>],
      privateStateId
    });

    const mintToSelf = (contractAddress: string, nonce: number) => ({
      compiledContract: unshieldedBalance,
      contractAddress,
      circuitId: 'mintToSelf' as const,
      args: [new Uint8Array(32).fill(nonce), 100n] as [Uint8Array, bigint]
    });

    const calleeDeposit = (contractAddress: string, nonce: number) => ({
      compiledContract: callee,
      contractAddress,
      circuitId: 'deposit' as const,
      args: [shieldedCoin(nonce)] as [ReturnType<typeof shieldedCoin>]
    });

    const depositThroughCaller = (contractAddress: string, nonce: number) => ({
      compiledContract: caller,
      contractAddress,
      circuitId: 'depositToCallee' as const,
      args: [shieldedCoin(nonce)] as [ReturnType<typeof shieldedCoin>]
    });

    const mintThroughCaller = (contractAddress: string, walletCoinPublicKey: string, nonce: number) => ({
      compiledContract: caller,
      contractAddress,
      circuitId: 'mintAndSendFromCallee' as const,
      args: [
        new Uint8Array(32).fill(7),
        1000n,
        new Uint8Array(32).fill(nonce),
        { bytes: new Uint8Array(Buffer.from(walletCoinPublicKey, 'hex')) },
        400n
      ] as [Uint8Array, bigint, Uint8Array, { bytes: Uint8Array }, bigint]
    });

    /** A chain holding two `shielded-map`s, a `callee` and a `caller` of it. */
    const chainOfFour = async () => {
      const [first, second, calleeAddress, callerAddress] = [1, 2, 3, 4].map(() => createMockContractAddress());
      const chain = await chainOf(
        new Map([
          [first, deployedShieldedMap()],
          [second, deployedShieldedMap()],
          [calleeAddress, deployedCallee()],
          [callerAddress, deployedCaller(calleeAddress)]
        ]),
        [calleeAddress]
      );
      return { ...chain, first, second, calleeAddress, callerAddress };
    };

    const readsOf = (providers: { publicDataProvider: { queryZSwapAndContractState: unknown } }, address: string): number =>
      vi.mocked(providers.publicDataProvider.queryZSwapAndContractState as (address: string) => unknown).mock.calls.filter(
        ([read]) => String(read) === address
      ).length;

    it('keeps the private states of two contracts, and of two ids of one contract, apart, and stores each through its own provider', async () => {
      // Arrange
      const { withKeys, first, second } = await chainOfFour();
      const firstContract = withKeys(shieldedMapKeys);
      const secondContract = withKeys(shieldedMapKeys);
      firstContract.stored.set(`${first}:a`, { count: 0 });
      firstContract.stored.set(`${first}:b`, { count: 10 });
      secondContract.stored.set(`${second}:a`, { count: 100 });
      const results: Ledger9CallResult<CountingShieldedMapContract, 'deposit'>[] = [];

      // Act
      await withContractScopedTransaction(firstContract.providers, async (txCtx) => {
        results.push(await submitCallTx(firstContract.providers, countingDeposit(first, 'a', 1), txCtx));
        results.push(await submitCallTx(firstContract.providers, countingDeposit(first, 'a', 2), txCtx));
        results.push(await submitCallTx(firstContract.providers, countingDeposit(first, 'b', 3), txCtx));
        results.push(await submitCallTx(secondContract.providers, countingDeposit(second, 'a', 4), txCtx));
      });

      // Assert: RED WHEN private states are held per contract only, or stored through the scope's
      // provider, or only the last call's is stored.
      expect(results.map((result) => result.private.nextPrivateState)).toEqual([{ count: 1 }, { count: 2 }, { count: 11 }, { count: 101 }]);
      expect(Object.fromEntries(firstContract.stored)).toEqual({ [`${first}:a`]: { count: 2 }, [`${first}:b`]: { count: 11 } });
      expect(Object.fromEntries(secondContract.stored)).toEqual({ [`${second}:a`]: { count: 101 } });
      // The second id of the first contract ran on the public state the first id's calls left.
      expect(results.map((result) => ShieldedMap.ledger(result.public.nextContractState).counter)).toEqual([1n, 2n, 3n, 1n]);
      // Every contract was read at the one block the scope pinned with its first read.
      const reads = vi.mocked(firstContract.providers.publicDataProvider.queryZSwapAndContractState).mock.calls;
      expect(new Set(reads.map(([, at]) => JSON.stringify(at))).size).toBe(1);
      expect(firstContract.providers.publicDataProvider.queryBlock).toHaveBeenCalledOnce();
    });

    it('gives a callee the state the scope holds for it, not the chain\'s', async () => {
      // Arrange
      const { withKeys, calleeAddress, callerAddress } = await chainOfFour();
      const calleeProviders = withKeys(calleeKeys).providers;
      const callerProviders = withKeys(callerKeys).providers;

      // Act
      const finalized = await withContractScopedTransaction(callerProviders, async (txCtx) => {
        await submitCallTx(calleeProviders, calleeDeposit(calleeAddress, 1), txCtx);
        await submitCallTx(callerProviders, depositThroughCaller(callerAddress, 2), txCtx);
      });

      // Assert: RED WHEN a callee the scope holds is read from the chain again.
      expect(readsOf(callerProviders, calleeAddress)).toBe(1);
      expect(readsOf(callerProviders, callerAddress)).toBe(1);
      expect(finalized.public.status).toBe(SucceedEntirely);
      // The caller is applied before the callee it claims, and its claim is of that call.
      const calls = callsOf(provenInput(callerProviders.proofProvider.proveTx));
      expect(calls.map((call) => String(call.address))).toEqual([calleeAddress, callerAddress, calleeAddress]);
      expect(calls[1]?.guaranteedTranscript?.effects.claimedContractCalls.map(([, address]) => String(address))).toEqual([calleeAddress]);
    });

    it('answers getCurrentStates for a contract the scope first reached as a callee, after a call made to it', async () => {
      // Arrange
      const { withKeys, calleeAddress, callerAddress } = await chainOfFour();
      const calleeProviders = withKeys(calleeKeys).providers;
      const callerProviders = withKeys(callerKeys).providers;
      let current: PublicStatesRead | undefined;
      let held: Uint8Array | undefined;

      // Act
      await withContractScopedTransaction(callerProviders, async (txCtx) => {
        await submitCallTx(callerProviders, depositThroughCaller(callerAddress, 1), txCtx);
        await submitCallTx(calleeProviders, calleeDeposit(calleeAddress, 2), txCtx);
        current = txCtx.getCurrentStates();
        held = scopeStateCacheOf(txCtx)?.[PublicStatesOf](calleeAddress)?.contractState.serialize();
      });

      // Assert: RED WHEN the scope answers only for a contract it read itself.
      expect(held).toBeDefined();
      expect(current?.contractState.serialize()).toEqual(held);
      expect(readsOf(callerProviders, calleeAddress)).toBe(1);
    });

    it('builds every shape of scoped calls a network took, each passing every comparison the ledger makes, as the ledger finds', async () => {
      // Arrange
      const { withKeys, first, second, calleeAddress, callerAddress, coinPublicKey } = await chainOfFour();
      const tokens = createMockContractAddress();
      const heavy = createMockContractAddress();
      const more = await chainOf(
        new Map([
          [first, deployedShieldedMap()],
          [second, deployedShieldedMap()],
          [calleeAddress, deployedCallee()],
          [callerAddress, deployedCaller(calleeAddress)],
          [tokens, deployedUnshieldedBalance()],
          [heavy, deployedCheckpointed()]
        ]),
        [calleeAddress]
      );
      void withKeys;
      const mapProviders = more.withKeys(shieldedMapKeys).providers;
      const calleeProviders = more.withKeys(calleeKeys).providers;
      const callerProviders = more.withKeys(callerKeys).providers;
      const tokenProviders = more.withKeys(unshieldedBalanceKeys).providers;
      const heavyProviders = more.withKeys(checkpointedKeys).providers;
      const walletKey = parseCoinPublicKeyToHex(more.coinPublicKey, MOCK_CONFIG.networkId);
      void coinPublicKey;
      const user = { bytes: new Uint8Array(Buffer.from(sampleUserAddress(), 'hex')) };
      const shapes: Record<string, (txCtx: AnyLedger9TransactionContext) => Promise<unknown>> = {
        'two dependent calls of one contract': async (txCtx) => {
          await submitCallTx(mapProviders, deposit(first, 1), txCtx);
          await submitCallTx(mapProviders, deposit(first, 2), txCtx);
        },
        'a caller with its callee': (txCtx) => submitCallTx(callerProviders, depositThroughCaller(callerAddress, 3), txCtx),
        'a callee that mints a coin, spends it and sends part to the wallet': (txCtx) =>
          submitCallTx(callerProviders, mintThroughCaller(callerAddress, walletKey, 4), txCtx),
        'five calls across three contracts, two of them a caller with its callee': async (txCtx) => {
          await submitCallTx(mapProviders, deposit(second, 5), txCtx);
          await submitCallTx(calleeProviders, calleeDeposit(calleeAddress, 6), txCtx);
          await submitCallTx(callerProviders, depositThroughCaller(callerAddress, 7), txCtx);
          await submitCallTx(callerProviders, mintThroughCaller(callerAddress, walletKey, 8), txCtx);
          await submitCallTx(mapProviders, deposit(second, 9), txCtx);
        },
        'unshielded tokens minted to a contract and paid on to a user': async (txCtx) => {
          const color = (await submitCallTx(tokenProviders, mintToSelf(tokens, 10), txCtx)).private.result;
          await submitCallTx(tokenProviders, { compiledContract: unshieldedBalance, contractAddress: tokens, circuitId: 'sendToUser', args: [color, 40n, user] }, txCtx);
        },
        // Under the ledger parameters a test reads without a chain, the partition keeps this whole
        // call guaranteed; the halves a fallible call claims in are covered with built transcripts.
        'a call with a checkpoint, writing much state before it': (txCtx) =>
          submitCallTx(
            heavyProviders,
            {
              compiledContract: checkpointed,
              contractAddress: heavy,
              circuitId: 'heavyCheckpointMintAndSend',
              args: [new Uint8Array(32).fill(7), 1000n, new Uint8Array(32).fill(11), { bytes: new Uint8Array(Buffer.from(walletKey, 'hex')) }, 400n]
            },
            txCtx
          )
      };

      // Act: one shape after another, each transaction read as it is handed to be proven.
      const outcomes: [string, string, true | string][] = [];
      for (const [shape, calls] of Object.entries(shapes)) {
        const status = await withContractScopedTransaction(callerProviders, async (txCtx) => {
          await calls(txCtx);
        }).then(
          (finalized) => finalized.public.status,
          (error: unknown) => String(error)
        );
        outcomes.push([shape, status, status === SucceedEntirely ? ledgerWellFormed(lastProvenInput(callerProviders.proofProvider.proveTx)) : 'not built']);
      }

      // Assert: RED WHEN a comparison keys what the transcripts claim otherwise than the ledger does,
      // or passes a transaction the ledger does not find well formed.
      expect(outcomes).toEqual(Object.keys(shapes).map((shape) => [shape, SucceedEntirely, true]));
    });

    it('refuses a call that reaches a private state the scope read through another provider, before it runs', async () => {
      // Arrange: two wallets, each with its own store, use one private state id of one contract.
      const { withKeys, first } = await chainOfFour();
      const firstWallet = withKeys(shieldedMapKeys);
      const secondWallet = withKeys(shieldedMapKeys);
      firstWallet.stored.set(`${first}:a`, { count: 0 });
      secondWallet.stored.set(`${first}:a`, { count: 50 });
      const results: unknown[] = [];

      // Act
      const rejection = withContractScopedTransaction(firstWallet.providers, async (txCtx) => {
        results.push(await submitCallTx(firstWallet.providers, countingDeposit(first, 'a', 1), txCtx));
        results.push(await submitCallTx(secondWallet.providers, countingDeposit(first, 'a', 2), txCtx));
      });

      // Assert: RED WHEN the second wallet's call runs on, and stores, the private state the first read.
      await expect(rejection).rejects.toThrow(InvalidArgumentError);
      await expect(rejection).rejects.toThrow(/was read in this scoped transaction through another private state provider/);
      expect(results).toHaveLength(1);
      expect(firstWallet.providers.proofProvider.proveTx).not.toHaveBeenCalled();
      expect(Object.fromEntries(secondWallet.stored)).toEqual({ [`${first}:a`]: { count: 50 } });
    });

    it('takes one contract written in either case as one contract', async () => {
      // Arrange
      const { withKeys, first } = await chainOfFour();
      const wallet = withKeys(shieldedMapKeys);
      wallet.stored.set(`${first}:a`, { count: 0 });
      const results: Ledger9CallResult<CountingShieldedMapContract, 'deposit'>[] = [];

      // Act
      await withContractScopedTransaction(wallet.providers, async (txCtx) => {
        results.push(await submitCallTx(wallet.providers, countingDeposit(first, 'a', 1), txCtx));
        results.push(await submitCallTx(wallet.providers, countingDeposit(first.toUpperCase(), 'a', 2), txCtx));
      });

      // Assert: RED WHEN the scope keys a contract by its address as written.
      expect(results.map((result) => result.private.nextPrivateState)).toEqual([{ count: 1 }, { count: 2 }]);
      expect(results.map((result) => ShieldedMap.ledger(result.public.nextContractState).counter)).toEqual([1n, 2n]);
      expect(Object.fromEntries(wallet.stored)).toEqual({ [`${first}:a`]: { count: 2 } });
      expect(vi.mocked(wallet.providers.publicDataProvider.queryZSwapAndContractState)).toHaveBeenCalledOnce();
    });

    describe('with two wallets', () => {
      const twoWallets = async () => {
        const { withKeys, calleeAddress, coinPublicKey, encryptionPublicKey } = await chainOfFour();
        const firstWallet = withKeys(calleeKeys).providers;
        const secondKeys = { coinPublicKey: sampleCoinPublicKey(), encryptionPublicKey: sampleEncryptionPublicKey() };
        const base = withKeys(calleeKeys).providers;
        const secondWallet = {
          ...base,
          walletProvider: {
            ...base.walletProvider,
            getCoinPublicKey: () => secondKeys.coinPublicKey,
            getEncryptionPublicKey: () => secondKeys.encryptionPublicKey
          }
        };
        const hex = (key: string) => parseCoinPublicKeyToHex(key, MOCK_CONFIG.networkId);
        const mintTo = (walletCoinPublicKey: string, nonce: number) => ({
          compiledContract: callee,
          contractAddress: calleeAddress,
          circuitId: 'mintAndSend' as const,
          args: [new Uint8Array(32).fill(7), 1000n, new Uint8Array(32).fill(nonce), { bytes: new Uint8Array(Buffer.from(hex(walletCoinPublicKey), 'hex')) }, 400n] as [
            Uint8Array,
            bigint,
            Uint8Array,
            { bytes: Uint8Array },
            bigint
          ]
        });
        return { firstWallet, secondWallet, secondKeys, first: { coinPublicKey, encryptionPublicKey }, mintTo };
      };

      it("encrypts each wallet's coins to that wallet's own key", async () => {
        // Arrange
        const { firstWallet, secondWallet, secondKeys, first, mintTo } = await twoWallets();
        vi.mocked(createUnprovenLedgerCallTx).mockClear();

        // Act
        const finalized = await withContractScopedTransaction(firstWallet, async (txCtx) => {
          await submitCallTx(firstWallet, mintTo(first.coinPublicKey, 1), txCtx);
          await submitCallTx(secondWallet, mintTo(secondKeys.coinPublicKey, 2), txCtx);
        });

        // Assert: RED WHEN only the first call's wallet keys are known to the scope's build.
        const [, , , resolve] = vi.mocked(createUnprovenLedgerCallTx).mock.lastCall!;
        const encryptionKeyOf = resolve as (coinPublicKey: string) => string | undefined;
        expect(finalized.public.status).toBe(SucceedEntirely);
        expect(encryptionKeyOf(secondKeys.coinPublicKey)).toBe(parseEncPublicKeyToHex(secondKeys.encryptionPublicKey, MOCK_CONFIG.networkId));
        expect(encryptionKeyOf(first.coinPublicKey)).toBe(parseEncPublicKeyToHex(first.encryptionPublicKey, MOCK_CONFIG.networkId));
      });

      it("refuses a mapping that contradicts a wallet's own key, before proving", async () => {
        // Arrange
        const { firstWallet, secondWallet, secondKeys, first, mintTo } = await twoWallets();

        // Act
        const rejection = withContractScopedTransaction(firstWallet, async (txCtx) => {
          await submitCallTx(
            firstWallet,
            { ...mintTo(first.coinPublicKey, 3), additionalCoinEncPublicKeyMappings: new Map([[secondKeys.coinPublicKey, sampleEncryptionPublicKey()]]) },
            txCtx
          );
          await submitCallTx(secondWallet, mintTo(secondKeys.coinPublicKey, 4), txCtx);
        });

        // Assert: RED WHEN a call's wallet keys are left out of the merged mappings and their conflict check.
        await expect(rejection).rejects.toThrow(ZswapOutputResolutionError);
        await expect(rejection).rejects.toThrow(/is mapped to two different encryption public keys/);
        expect(firstWallet.proofProvider.proveTx).not.toHaveBeenCalled();
      });
    });

    it('runs a call on the balance an earlier call of the scope left the contract', async () => {
      // Arrange
      const tokens = createMockContractAddress();
      const chain = await chainOf(new Map([[tokens, deployedUnshieldedBalance()]]));
      const tokenProviders = chain.withKeys(unshieldedBalanceKeys).providers;
      let balance: bigint | undefined;

      // Act
      await withContractScopedTransaction(tokenProviders, async (txCtx) => {
        const color = (await submitCallTx(tokenProviders, mintToSelf(tokens, 12), txCtx)).private.result;
        balance = (await submitCallTx(tokenProviders, { compiledContract: unshieldedBalance, contractAddress: tokens, circuitId: 'balanceOf', args: [color] }, txCtx))
          .private.result;
      });

      // Assert: RED WHEN a contract's data advances in the scope but its balance stays as read.
      expect(balance).toBe(100n);
    });

    it('runs a call on the balance an earlier call of the scope paid out of the contract', async () => {
      // Arrange
      const tokens = createMockContractAddress();
      const chain = await chainOf(new Map([[tokens, deployedUnshieldedBalance()]]));
      const tokenProviders = chain.withKeys(unshieldedBalanceKeys).providers;
      const user = { bytes: new Uint8Array(Buffer.from(sampleUserAddress(), 'hex')) };
      let balance: bigint | undefined;

      // Act
      await withContractScopedTransaction(tokenProviders, async (txCtx) => {
        const color = (await submitCallTx(tokenProviders, mintToSelf(tokens, 13), txCtx)).private.result;
        await submitCallTx(tokenProviders, { compiledContract: unshieldedBalance, contractAddress: tokens, circuitId: 'sendToUser', args: [color, 40n, user] }, txCtx);
        balance = (await submitCallTx(tokenProviders, { compiledContract: unshieldedBalance, contractAddress: tokens, circuitId: 'balanceOf', args: [color] }, txCtx))
          .private.result;
      });

      // Assert: RED WHEN a call's unshielded outputs leave the contract's balance in the scope as it was.
      expect(balance).toBe(60n);
    });
  });
});
