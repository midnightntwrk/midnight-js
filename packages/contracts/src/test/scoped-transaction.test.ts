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
  LedgerParameters,
  Transaction,
  type UnprovenTransaction,
  ZswapChainState
} from '@midnightntwrk/midnight-js-protocol/v9';
import type { Contract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import {
  ContractState
} from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import { type AnyProvableCircuitId } from '@midnightntwrk/midnight-js-types';
import { describe, expect, it, vi } from 'vitest';

import { type Ledger9CallResult } from '../call';
import { ZswapOutputResolutionError } from '../errors';
import { CacheStates, RecordCall, Submit, TransactionContextImpl } from '../internal/transaction';
import type * as InternalUtils from '../internal/utils';
import { createUnprovenLedgerCallTx } from '../internal/utils';
import { submitCallTx } from '../submit-call-tx';
import { withContractScopedTransaction } from '../transaction';
import { createLedger9UnprovenCallTx, executeLedger9CallWithProviders } from '../unproven-call-tx';
import {
  callsOf,
  chainWithShieldedMap,
  deployedShieldedMap,
  deposit,
  provenInput,
  type ShieldedMapContract
} from './scoped-transaction-fixtures';
import {
  createMockCoinInfo,
  createMockContractAddress,
  createMockExecutedCall,
  createMockProviders,
  createMockUnprovenCallTxData,
  MOCK_CONFIG,
  publicStatesReadStub
} from './test-mocks';

// Every build runs for real; the spy only records what each build was given.
vi.mock('../internal/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof InternalUtils>();
  return { ...actual, createUnprovenLedgerCallTx: vi.fn(actual.createUnprovenLedgerCallTx) };
});

describe('scoped transaction failures', () => {
  const withErrorLog = () => {
    const error = vi.fn();
    return { providers: { ...createMockProviders(), loggerProvider: { error, isLevelEnabled: () => true } }, error };
  };

  it('logs a root-scope failure with the scope name and rethrows it unchanged', async () => {
    // Arrange
    const { providers, error: logError } = withErrorLog();
    const failure = new Error('circuit failed');

    // Act
    const rejection = withContractScopedTransaction(
      providers,
      async () => {
        throw failure;
      },
      { scopeName: 'myTransfer' }
    );

    // Assert
    await expect(rejection).rejects.toBe(failure);
    expect(logError).toHaveBeenCalledExactlyOnceWith(
      { err: failure, scopeName: 'myTransfer', phase: 'executing' },
      "Scoped transaction 'myTransfer' failed while executing: Error: circuit failed"
    );
    expect(logError.mock.calls[0]?.[0]?.err).toBe(failure);
  });

  it('logs <unnamed> when no scopeName is provided', async () => {
    // Arrange
    const { providers, error: logError } = withErrorLog();
    const failure = new Error('circuit failed');

    // Act
    const rejection = withContractScopedTransaction(providers, async () => {
      throw failure;
    });

    // Assert
    await expect(rejection).rejects.toBe(failure);
    expect(logError).toHaveBeenCalledExactlyOnceWith(
      { err: failure, scopeName: '<unnamed>', phase: 'executing' },
      "Scoped transaction '<unnamed>' failed while executing: Error: circuit failed"
    );
  });
});

type DepositResult = Ledger9CallResult<ShieldedMapContract, 'deposit'>;

describe('a ledger 9 scoped transaction', () => {
  const deployed = deployedShieldedMap;

  const receivesOf = (transcript: { effects: { claimedShieldedReceives: readonly unknown[] } } | undefined): string[] =>
    (transcript?.effects.claimedShieldedReceives ?? []).map(String);

  it('a scope puts its calls in one intent in the order they were made', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    const results: DepositResult[] = [];

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      for (const nonce of [1, 2, 3]) {
        results.push(await submitCallTx(providers, deposit(contractAddress, nonce), txCtx));
      }
    });

    // Assert: RED WHEN the scope merges one transaction per call, each at its own random segment, which
    // leaves one intent per call and the ledger free to apply them in any order.
    const submitted = provenInput(providers.proofProvider.proveTx);
    expect(submitted.intents?.size).toBe(1);
    const calls = callsOf(submitted);
    expect(calls.map((call) => receivesOf(call.guaranteedTranscript))).toEqual(
      results.map((result) => receivesOf(result.calls[0]?.public.partitionedTranscript[0]))
    );
    expect(new Set(calls.map((call) => receivesOf(call.guaranteedTranscript)[0])).size).toBe(3);
  });

  it("a scope of one call keeps today's placement", async () => {
    // Arrange
    const { providers, zswapChainState, contractAddress } = await chainWithShieldedMap();
    const ownTx = (await createLedger9UnprovenCallTx(providers, deposit(contractAddress, 1))).private.unprovenTx.deserialize({
      v9: Transaction
    });
    vi.mocked(createUnprovenLedgerCallTx).mockClear();

    // Act
    const finalized = await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, deposit(contractAddress, 1), txCtx);
    });

    // Assert: RED WHEN the scope answers a contract's state from the state its calls left rather than
    // the state the call ran against, which builds the one call over other inputs than its own build.
    expect(createUnprovenLedgerCallTx).toHaveBeenCalledOnce();
    const [calls, contractStateFor, chainStateFor, , config] = vi.mocked(createUnprovenLedgerCallTx).mock.lastCall!;
    expect(calls).toBe(finalized.calls);
    expect(contractStateFor(calls[0]!.contractAddress)?.serialize()).toEqual((await deployed()).serialize());
    expect(chainStateFor(calls[0]!.contractAddress)?.serialize()).toEqual(zswapChainState.serialize());
    expect(config).toBe(providers.config);
    const built = vi.mocked(createUnprovenLedgerCallTx).mock.results[0]!.value as UnprovenTransaction;
    const submitted = provenInput(providers.proofProvider.proveTx);
    expect(submitted.serialize()).toEqual(built.serialize());
    expect(finalized.private.unprovenTx.serialize()).toEqual(built.serialize());
    expect(submitted.intents?.size).toBe(ownTx.intents?.size);
    expect(submitted.guaranteedOffer?.outputs.length).toBe(ownTx.guaranteedOffer?.outputs.length);
    expect(submitted.fallibleOffer).toEqual(ownTx.fallibleOffer);
    expect(callsOf(submitted).map((call) => [String(call.guaranteedTranscript), String(call.fallibleTranscript)])).toEqual(
      callsOf(ownTx).map((call) => [String(call.guaranteedTranscript), String(call.fallibleTranscript)])
    );
  });

  it('a call recorded into a scope builds no transaction of its own', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    vi.mocked(createUnprovenLedgerCallTx).mockClear();
    let buildsWhileRecording: number | undefined;

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, deposit(contractAddress, 1), txCtx);
      await submitCallTx(providers, deposit(contractAddress, 2), txCtx);
      buildsWhileRecording = vi.mocked(createUnprovenLedgerCallTx).mock.calls.length;
    });

    // Assert: RED WHEN a call made in a scope builds its own transaction, as a call made on its own does.
    expect(buildsWhileRecording).toBe(0);
    expect(createUnprovenLedgerCallTx).toHaveBeenCalledOnce();
    expect(vi.mocked(createUnprovenLedgerCallTx).mock.lastCall![0]).toHaveLength(2);
  });

  it('the claim check runs over every call of the scope before proving', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    const scope = new TransactionContextImpl<ShieldedMapContract, 'deposit'>(providers);
    const first = await executeLedger9CallWithProviders(providers, deposit(contractAddress, 1), scope);
    // The first call no longer claims the coin it was sent, so the scope's offers carry a coin no call receives.
    const unclaimed = first.assembly.calls.map((call) => {
      const [guaranteed, fallible] = call.public.partitionedTranscript;
      const withoutReceives = guaranteed && { ...guaranteed, effects: { ...guaranteed.effects, claimedShieldedReceives: [] } };
      return { ...call, public: { ...call.public, partitionedTranscript: [withoutReceives, fallible] as typeof call.public.partitionedTranscript } };
    });
    await scope[RecordCall]('deposit', () => Promise.resolve({ ...first, assembly: { ...first.assembly, calls: unclaimed } }));
    await scope[RecordCall]('deposit', () => executeLedger9CallWithProviders(providers, deposit(contractAddress, 2), scope));

    // Act
    const rejection = scope[Submit]();

    // Assert: RED WHEN the scope checks what its last call claims only.
    await expect(rejection).rejects.toThrow(ZswapOutputResolutionError);
    await expect(rejection).rejects.toThrow(/offered 1, claimed 0/);
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('refuses a ledger 9 context made by a copy of the package that records calls another way, before the call runs', async () => {
    // Arrange: a context as an earlier copy makes it: the same brand and era, no member to record a call through.
    const { providers, contractAddress } = await chainWithShieldedMap();
    const earlier = Object.assign(Object.create(null) as object, new TransactionContextImpl(providers));

    // Act
    const call = submitCallTx(providers, deposit(contractAddress, 1), earlier);

    // Assert: RED WHEN such a context is taken and the call fails on a member it lacks, or is half recorded.
    await expect(call).rejects.toThrow(InvalidArgumentError);
    await expect(call).rejects.toThrow(
      /was passed a ledger 9 transaction context made by another copy of @midnightntwrk\/midnight-js-contracts/
    );
    expect(providers.publicDataProvider.queryZSwapAndContractState).not.toHaveBeenCalled();
  });

  it("offers a copy of the package that records calls another way no member to record into this copy's scope", async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    let members: (string | symbol)[] = [];

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      members = Reflect.ownKeys(Object.getPrototypeOf(txCtx) as object);
      await submitCallTx(providers, deposit(contractAddress, 1), txCtx);
    });

    // Assert: RED WHEN the scope keeps a public member under the key an earlier copy records through.
    expect(members).not.toContain(Symbol.for('@midnight-ntwrk/midnight-js#Transaction/MergeUnsubmittedCallTxData'));
  });

  it('refuses a call made while another call of the same scope is still running', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();

    // Act
    const rejection = withContractScopedTransaction(providers, async (txCtx) => {
      await Promise.all([
        submitCallTx(providers, deposit(contractAddress, 1), txCtx),
        submitCallTx(providers, deposit(contractAddress, 2), txCtx)
      ]);
    });

    // Assert: RED WHEN two calls of one scope may run at once, both from the same states.
    await expect(rejection).rejects.toThrow(InvalidArgumentError);
    await expect(rejection).rejects.toThrow(/await each call before making the next/);
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('accepts the next call of a scope after a call that failed', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    vi.mocked(providers.publicDataProvider.queryZSwapAndContractState).mockRejectedValueOnce(new Error('indexer unavailable'));

    // Act
    const finalized = await withContractScopedTransaction(providers, async (txCtx) => {
      await expect(submitCallTx(providers, deposit(contractAddress, 1), txCtx)).rejects.toThrow(/indexer unavailable/);
      await submitCallTx(providers, deposit(contractAddress, 2), txCtx);
    });

    // Assert: RED WHEN a call that fails leaves the scope marked as running a call.
    expect(finalized.era).toBe('v9');
    expect(callsOf(provenInput(providers.proofProvider.proveTx))).toHaveLength(1);
  });

  it('hands out the transaction of every call made so far as the last call data', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    const results: DepositResult[] = [];
    let lastCallTx: UnprovenTransaction | undefined;

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      results.push(await submitCallTx(providers, deposit(contractAddress, 1), txCtx));
      results.push(await submitCallTx(providers, deposit(contractAddress, 2), txCtx));
      lastCallTx = txCtx.getLastUnsubmittedCallTxDataToTransact()?.[0].private.unprovenTx.deserialize({ v9: Transaction });
    });

    // Assert: RED WHEN the last call data carries the transaction of the last call alone.
    expect(lastCallTx?.intents?.size).toBe(1);
    expect(callsOf(lastCallTx!).map((call) => receivesOf(call.guaranteedTranscript))).toEqual(
      results.map((result) => receivesOf(result.calls[0]?.public.partitionedTranscript[0]))
    );
  });

  it('gives the new coins of every call of the scope, in the order the calls were made', async () => {
    // Arrange
    const { providers } = await chainWithShieldedMap();
    const scope = new TransactionContextImpl<Contract.Any, AnyProvableCircuitId>(providers);
    const coinsOf = (...nonces: string[]) => nonces.map((nonce) => ({ ...createMockCoinInfo(), nonce }));
    const callWithCoins = (...nonces: string[]) => {
      const callTxData = createMockUnprovenCallTxData();
      return createMockExecutedCall({ ...callTxData, private: { ...callTxData.private, newCoins: coinsOf(...nonces) } });
    };
    scope[CacheStates](
      { contractState: new ContractState(), zswapChainState: new ZswapChainState(), ledgerParameters: LedgerParameters.initialParameters() },
      publicStatesReadStub('v9'),
      { contractAddress: createMockContractAddress() },
      '00'.repeat(32)
    );
    await scope[RecordCall]('testCircuit', () => Promise.resolve(callWithCoins('first')));
    await scope[RecordCall]('testCircuit', () => Promise.resolve(callWithCoins('second', 'third')));
    // The calls carry no proof data, so each of the two builds below answers an empty transaction.
    vi.mocked(createUnprovenLedgerCallTx)
      .mockReturnValueOnce(Transaction.fromParts(MOCK_CONFIG.networkId))
      .mockReturnValueOnce(Transaction.fromParts(MOCK_CONFIG.networkId));

    // Act
    const lastCallData = scope.getLastUnsubmittedCallTxDataToTransact()?.[0];
    const finalized = await scope[Submit]();

    // Assert: RED WHEN the scope's result carries the new coins of its last call only.
    expect(finalized.private.newCoins).toEqual(coinsOf('first', 'second', 'third'));
    expect(lastCallData?.private.newCoins).toEqual(coinsOf('first', 'second', 'third'));
  });

});
