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
  createShieldedCoinInfo,
  Intent,
  sampleCoinPublicKey,
  sampleEncryptionPublicKey,
  sampleUserAddress,
  shieldedToken,
  Transaction,
  type UnprovenTransaction,
  ZswapOffer,
  ZswapOutput
} from '@midnightntwrk/midnight-js-protocol/v9';
import { FailFallible } from '@midnightntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex } from '@midnightntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { Ledger9ScopeFalliblePartError, Ledger9ScopeOutsideTimeToDismissError, TxFailedError } from '../errors';
import { RecordCall } from '../internal/ledger9-scope';
import { refuseGuaranteedParts } from '../internal/ledger9-scope-fallible';
import type * as Utils from '../internal/utils';
import { submitCallTx } from '../submit-call-tx';
import { withContractScopedTransaction } from '../transaction';
import { executeLedger9CallWithProviders } from '../unproven-call-tx';
import {
  caller,
  callerKeys,
  callsOf,
  chainOf,
  chainRecordingOrder,
  count,
  deployedCallee,
  deployedCaller,
  deployedUnshieldedBalance,
  fillTwo,
  finalizedWithUnshieldedOutputs,
  halvesOf,
  IN_FALLIBLE_SECTION,
  ledgerWellFormed,
  parametersWithTimeToDismiss,
  provenInput,
  rejectionOf,
  stampsChain,
  step,
  unshieldedBalance,
  unshieldedBalanceKeys,
  unshieldedOffer
} from './scoped-transaction-fixtures';
import { createMockContractAddress, createMockFinalizedTxData, MOCK_CONFIG } from './test-mocks';

/** Whether the scope's build is made to place a coin in the guaranteed half, as no call does under the option. */
const forged = vi.hoisted(() => ({ guaranteedCoin: false }));

vi.mock('../internal/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof Utils>();
  const ledger = await import('@midnightntwrk/midnight-js-protocol/v9');
  return {
    ...actual,
    createUnprovenLedgerCallTx: (...args: Parameters<typeof actual.createUnprovenLedgerCallTx>) => {
      const tx = actual.createUnprovenLedgerCallTx(...args);
      if (forged.guaranteedCoin) {
        const coin = ledger.createShieldedCoinInfo(ledger.shieldedToken().raw, 10n);
        const output = ledger.ZswapOutput.new(
          coin,
          0,
          ledger.sampleCoinPublicKey(),
          ledger.sampleEncryptionPublicKey()
        );
        tx.guaranteedOffer = ledger.ZswapOffer.fromOutput(output, coin.type, coin.value);
      }
      return tx;
    }
  };
});

/** The one intent of a transaction, with its segment. */
const onlyIntentOf = (tx: UnprovenTransaction) => {
  const intents = [...(tx.intents?.entries() ?? [])];
  expect(intents).toHaveLength(1);
  const [[segment, intent]] = intents;
  return { segment, intent };
};

/** Which halves each call of a call tree was placed in by the ledger's partitioner. */
const placedHalves = (calls: readonly { public: { partitionedTranscript: readonly [unknown, unknown] } }[]) =>
  calls.map(({ public: { partitionedTranscript } }): [boolean, boolean] => [
    partitionedTranscript[0] !== undefined,
    partitionedTranscript[1] !== undefined
  ]);

/** Providers over a chain holding a caller and its callee, with calls that move coins through both. */
const callerAndCallee = async () => {
  const calleeAddress = createMockContractAddress();
  const callerAddress = createMockContractAddress();
  const chain = await chainOf(
    new Map([
      [calleeAddress, deployedCallee()],
      [callerAddress, deployedCaller(calleeAddress)]
    ]),
    [calleeAddress]
  );
  const walletKey = parseCoinPublicKeyToHex(chain.coinPublicKey, MOCK_CONFIG.networkId);
  const mintAndSend = {
    compiledContract: caller,
    contractAddress: callerAddress,
    circuitId: 'mintAndSendFromCallee' as const,
    args: [
      new Uint8Array(32).fill(7),
      1000n,
      new Uint8Array(32).fill(1),
      { bytes: new Uint8Array(Buffer.from(walletKey, 'hex')) },
      400n
    ] as [Uint8Array, bigint, Uint8Array, { bytes: Uint8Array }, bigint]
  };
  const depositThroughCaller = {
    compiledContract: caller,
    contractAddress: callerAddress,
    circuitId: 'depositToCallee' as const,
    args: [{ nonce: new Uint8Array(32).fill(2), color: new Uint8Array(32).fill(1), value: 5n }] as [
      { nonce: Uint8Array; color: Uint8Array; value: bigint }
    ]
  };
  return { providers: chain.withKeys(callerKeys).providers, mintAndSend, depositThroughCaller };
};

describe('a ledger 9 scoped transaction placed in the fallible section', () => {
  it('places every call tree in the fallible section, callees too, its coins in the fallible offer of its segment, and the ledger accepts the result', async () => {
    // Arrange: under the ledger parameters a test reads, the partitioner places these calls guaranteed.
    const { providers, mintAndSend, depositThroughCaller } = await callerAndCallee();
    const placed: [boolean, boolean][] = [];

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        placed.push(...placedHalves((await submitCallTx(providers, mintAndSend, txCtx)).calls));
        placed.push(...placedHalves((await submitCallTx(providers, depositThroughCaller, txCtx)).calls));
      },
      IN_FALLIBLE_SECTION
    );

    // Assert: RED WHEN a call tree, or a callee of one, is left in the guaranteed half, or its coins are.
    const submitted = provenInput(providers.proofProvider.proveTx);
    expect(placed.length).toBeGreaterThan(2);
    expect(placed.every(([guaranteed, fallible]) => guaranteed && !fallible)).toBe(true);
    expect(halvesOf(callsOf(submitted))).toEqual(placed.map(() => [false, true]));
    const { segment } = onlyIntentOf(submitted);
    expect(submitted.guaranteedOffer).toBeUndefined();
    expect([...(submitted.fallibleOffer?.keys() ?? [])]).toEqual([segment]);
    expect(ledgerWellFormed(submitted)).toBe(true);
  });

  it("puts the unshielded payments the calls make to a user in the intent's fallible unshielded offer, and the ledger accepts the result", async () => {
    // Arrange
    const tokens = createMockContractAddress();
    const chain = await chainOf(new Map([[tokens, deployedUnshieldedBalance()]]));
    const { providers } = chain.withKeys(unshieldedBalanceKeys);
    const user = { bytes: new Uint8Array(Buffer.from(sampleUserAddress(), 'hex')) };

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        const mint = { compiledContract: unshieldedBalance, contractAddress: tokens, circuitId: 'mintToSelf' as const };
        const color = (await submitCallTx(providers, { ...mint, args: [new Uint8Array(32).fill(1), 100n] }, txCtx))
          .private.result;
        const send = { compiledContract: unshieldedBalance, contractAddress: tokens, circuitId: 'sendToUser' as const };
        await submitCallTx(providers, { ...send, args: [color, 40n, user] }, txCtx);
      },
      IN_FALLIBLE_SECTION
    );

    // Assert: RED WHEN a payment to a user is left guaranteed while the call that makes it is fallible.
    const submitted = provenInput(providers.proofProvider.proveTx);
    const { intent } = onlyIntentOf(submitted);
    expect(halvesOf(callsOf(submitted))).toEqual([
      [false, true],
      [false, true]
    ]);
    expect(intent.guaranteedUnshieldedOffer).toBeUndefined();
    expect(intent.fallibleUnshieldedOffer?.outputs).toHaveLength(1);
    expect(ledgerWellFormed(submitted)).toBe(true);
  });

  it('keeps a call tree the ledger placed wholly in the fallible half where it is, beside one it moves there', async () => {
    // Arrange: under the initial ledger parameters fillTwo is placed wholly fallible, count guaranteed.
    const { address, providers } = await stampsChain();

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, count(address), txCtx);
        await submitCallTx(providers, fillTwo(address, 1), txCtx);
      },
      IN_FALLIBLE_SECTION
    );

    // Assert: RED WHEN either call is built anywhere but the fallible half, or the pair is refused.
    const submitted = provenInput(providers.proofProvider.proveTx);
    expect(halvesOf(callsOf(submitted))).toEqual([
      [false, true],
      [false, true]
    ]);
    expect(ledgerWellFormed(submitted)).toBe(true);
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledOnce();
  });

  it('places a lone call in the fallible section too', async () => {
    // Arrange
    const { address, providers } = await stampsChain();

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, count(address), txCtx);
      },
      IN_FALLIBLE_SECTION
    );

    // Assert: RED WHEN a scope of one call is built as that call made alone under the option.
    const submitted = provenInput(providers.proofProvider.proveTx);
    expect(halvesOf(callsOf(submitted))).toEqual([[false, true]]);
    expect(ledgerWellFormed(submitted)).toBe(true);
  });

  it.each([1, 2])(
    'refuses, before any proof is made, a call split at a checkpoint, in a scope of %i call(s)',
    async (calls) => {
      // Arrange: the last call's transcript is given a fallible half beside its guaranteed one, as a
      // call split at a checkpoint is.
      const { address, providers } = await stampsChain();

      // Act
      const scope = withContractScopedTransaction(
        providers,
        async (txCtx) => {
          if (calls === 2) await submitCallTx(providers, count(address), txCtx);
          await txCtx[RecordCall]('count', async () => {
            const executed = await executeLedger9CallWithProviders(providers, count(address), txCtx);
            const split = executed.assembly.calls.map((call) => {
              const [guaranteed] = call.public.partitionedTranscript;
              const halves: typeof call.public.partitionedTranscript = [guaranteed, guaranteed];
              return { ...call, public: { ...call.public, partitionedTranscript: halves } };
            });
            return { ...executed, assembly: { ...executed.assembly, calls: split } };
          });
        },
        IN_FALLIBLE_SECTION
      );

      // Assert: RED WHEN a split call is moved, built or proven under the option.
      const error = await rejectionOf(scope);
      expect(error).toBeInstanceOf(Ledger9ScopeFalliblePartError);
      expect(error).toMatchObject({ stage: 'unproven', code: 'MIDNIGHT_JS_C_LEDGER9_SCOPE_FALLIBLE_PART' });
      expect((error as Ledger9ScopeFalliblePartError).parts).toEqual([
        `a guaranteed transcript of 'count' of contract '${address}', split at a checkpoint from its fallible one`
      ]);
      expect((error as Error).message).toContain('placed in its fallible section lands whole or fails whole');
      expect((error as Error).message).toContain('Make a call split at a checkpoint');
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    }
  );

  it('refuses, before any proof is made, a callee split at a checkpoint, not only a root', async () => {
    // Arrange: the first callee of the tree is given a fallible half beside its guaranteed one.
    const { providers, mintAndSend } = await callerAndCallee();
    let callee = '';

    // Act
    const scope = withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await txCtx[RecordCall](mintAndSend.circuitId, async () => {
          const executed = await executeLedger9CallWithProviders(providers, mintAndSend, txCtx);
          const [first, ...rest] = executed.assembly.calls;
          expect(rest.length).toBeGreaterThan(0);
          callee = `'${String(first.circuitId)}' of contract '${String(first.contractAddress)}'`;
          const [guaranteed] = first.public.partitionedTranscript;
          const halves: typeof first.public.partitionedTranscript = [guaranteed, guaranteed];
          const split = { ...first, public: { ...first.public, partitionedTranscript: halves } };
          return { ...executed, assembly: { ...executed.assembly, calls: [split, ...rest] } };
        });
      },
      IN_FALLIBLE_SECTION
    );

    // Assert: RED WHEN only the root of each call tree is looked at for a split.
    const error = await rejectionOf(scope);
    expect(error).toBeInstanceOf(Ledger9ScopeFalliblePartError);
    expect((error as Ledger9ScopeFalliblePartError).parts).toEqual([
      `a guaranteed transcript of ${callee}, split at a checkpoint from its fallible one`
    ]);
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('names no option in the refusal of a split call in a scope of two calls without it', async () => {
    // Arrange
    const { address, providers } = await stampsChain();

    // Act
    const scope = withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, count(address), txCtx);
      await txCtx[RecordCall]('count', async () => {
        const executed = await executeLedger9CallWithProviders(providers, count(address), txCtx);
        const split = executed.assembly.calls.map((call) => {
          const [guaranteed] = call.public.partitionedTranscript;
          const halves: typeof call.public.partitionedTranscript = [guaranteed, guaranteed];
          return { ...call, public: { ...call.public, partitionedTranscript: halves } };
        });
        return { ...executed, assembly: { ...executed.assembly, calls: split } };
      });
    });

    // Assert: RED WHEN the refusal of the default placement speaks of the fallible section.
    const error = await rejectionOf(scope);
    expect(error).toBeInstanceOf(Ledger9ScopeFalliblePartError);
    expect((error as Error).message).toContain('A scoped transaction of two or more calls lands whole or not at all');
    expect((error as Error).message).not.toContain('fallible section');
  });

  it('refuses, before any proof is made, a coin the build of its calls places in the guaranteed half', async () => {
    // Arrange: the build is made to place a coin in the guaranteed half.
    const { address, providers } = await stampsChain();
    forged.guaranteedCoin = true;
    try {
      // Act
      const scope = withContractScopedTransaction(
        providers,
        async (txCtx) => {
          await submitCallTx(providers, count(address), txCtx);
        },
        IN_FALLIBLE_SECTION
      );

      // Assert: RED WHEN the built transaction is not checked for a guaranteed part of the calls.
      await expect(scope).rejects.toMatchObject({
        name: 'Ledger9ScopeFalliblePartError',
        stage: 'unproven',
        parts: ['guaranteed coins']
      });
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    } finally {
      forged.guaranteedCoin = false;
    }
  });

  it('does not price a lone call, which costs no more to dismiss than that call made alone', async () => {
    // Arrange: under these, nothing fits.
    const { address, providers } = await stampsChain(parametersWithTimeToDismiss(0n, 1n));

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, count(address), txCtx);
      },
      IN_FALLIBLE_SECTION
    );

    // Assert: RED WHEN a lone call in the fallible section is priced before proving.
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledOnce();
  });

  it('prices two calls against the time to dismiss before proving', async () => {
    // Arrange: under these, nothing fits.
    const { address, providers } = await stampsChain(parametersWithTimeToDismiss(0n, 1n));

    // Act
    const scope = withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, count(address), txCtx);
        await submitCallTx(providers, count(address), txCtx);
      },
      IN_FALLIBLE_SECTION
    );

    // Assert: RED WHEN two calls in the fallible section are not priced before proving.
    await expect(scope).rejects.toThrow(Ledger9ScopeOutsideTimeToDismissError);
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('submits the transaction the wallet balanced with its fallible parts, unchecked for them', async () => {
    // Arrange: the wallet balances into a transaction with a fallible unshielded offer.
    const { address, providers } = await stampsChain();
    const balanced = await finalizedWithUnshieldedOutputs(1, 'fallible');
    vi.mocked(providers.walletProvider.balanceTx).mockResolvedValue(balanced);

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, count(address), txCtx);
        await submitCallTx(providers, count(address), txCtx);
      },
      IN_FALLIBLE_SECTION
    );

    // Assert: RED WHEN the balanced transaction of a scope in the fallible section is refused for its fallible parts.
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledOnce();
  });

  it('is built as before, in the guaranteed half, when the option is false', async () => {
    // Arrange
    const { address, providers } = await stampsChain();

    // Act
    await withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, count(address), txCtx);
        await submitCallTx(providers, count(address), txCtx);
      },
      { inFallibleSection: false }
    );

    // Assert: RED WHEN a false option places the calls in the fallible section.
    expect(halvesOf(callsOf(provenInput(providers.proofProvider.proveTx)))).toEqual([
      [true, false],
      [true, false]
    ]);
  });

  it.each([
    [false, true],
    [true, false]
  ])(
    'reads the option from the copy the scope took when it began, %s, set to %s while the scope runs',
    async (atStart, whileRunning) => {
      // Arrange
      const { address, providers } = await stampsChain();
      const options: { inFallibleSection: boolean } = { inFallibleSection: atStart };

      // Act
      await withContractScopedTransaction(
        providers,
        async (txCtx) => {
          await submitCallTx(providers, count(address), txCtx);
          options.inFallibleSection = whileRunning;
          await submitCallTx(providers, count(address), txCtx);
        },
        options
      );

      // Assert: RED WHEN the scope reads its options object as it is when it builds.
      const halves: [boolean, boolean] = atStart ? [false, true] : [true, false];
      expect(halvesOf(callsOf(provenInput(providers.proofProvider.proveTx)))).toEqual([halves, halves]);
    }
  );
});

describe('a ledger 9 scoped transaction in the fallible section, failed on chain', () => {
  it('stores no private state on FailFallible and throws TxFailedError carrying the states the calls left', async () => {
    // Arrange: the chain records the transaction as FailFallible.
    const { address, providers, stored } = await chainRecordingOrder();
    vi.mocked(providers.publicDataProvider.watchForTxData).mockResolvedValue(createMockFinalizedTxData(FailFallible));
    const before = Object.fromEntries(stored);

    // Act
    const error = await rejectionOf(
      withContractScopedTransaction(
        providers,
        async (txCtx) => {
          await submitCallTx(providers, step(address, 'id'), txCtx);
          await submitCallTx(providers, step(address, 'id'), txCtx);
        },
        IN_FALLIBLE_SECTION
      )
    );

    // Assert: RED WHEN a state is stored after the calls failed on chain, or the error drops them.
    expect(error).toBeInstanceOf(TxFailedError);
    expect((error as TxFailedError).record.status).toBe(FailFallible);
    expect((error as TxFailedError).pendingPrivateStates).toEqual([
      { contractAddress: address, privateStateId: 'id', privateState: { stamp: 2 } }
    ]);
    expect(Object.fromEntries(stored)).toEqual(before);
    expect((error as Error).message).toContain('its fee was paid and nothing of its calls was kept');
    expect((error as Error).message).toContain("do not keep this error's 'pendingPrivateStates'");
    expect((error as Error).message).not.toContain('guaranteed effects were kept');
  });
});

describe('the check that the calls of a scope in the fallible section put nothing in the guaranteed half', () => {
  const coin = createShieldedCoinInfo(shieldedToken().raw, 10n);
  const transactionsHolding = {
    'guaranteed coins': () =>
      Transaction.fromParts(
        MOCK_CONFIG.networkId,
        ZswapOffer.fromOutput(
          ZswapOutput.new(coin, 0, sampleCoinPublicKey(), sampleEncryptionPublicKey()),
          coin.type,
          coin.value
        ),
        undefined,
        undefined
      ),
    'a guaranteed unshielded offer': () => {
      const intent = Intent.new(new Date(Date.now() + 3_600_000));
      intent.guaranteedUnshieldedOffer = unshieldedOffer(1);
      return Transaction.fromParts(MOCK_CONFIG.networkId, undefined, undefined, intent);
    }
  };

  it.each(Object.keys(transactionsHolding) as (keyof typeof transactionsHolding)[])(
    'refuses a transaction holding %s',
    (part) => {
      // Act / Assert: RED WHEN that part is not looked for.
      expect(() => refuseGuaranteedParts(transactionsHolding[part]())).toThrow(
        expect.objectContaining({
          name: 'Ledger9ScopeFalliblePartError',
          stage: 'unproven',
          parts: [expect.stringContaining(part)]
        })
      );
    }
  );

  it('refuses a transaction holding a guaranteed transcript', async () => {
    // Arrange: a lone count, built as that call made alone, keeps its guaranteed transcript.
    const { address, providers } = await stampsChain();
    await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, count(address), txCtx);
    });

    // Act / Assert: RED WHEN a guaranteed transcript is not looked for.
    expect(() => refuseGuaranteedParts(provenInput(providers.proofProvider.proveTx))).toThrow(
      expect.objectContaining({ parts: [expect.stringMatching(/^1 guaranteed transcript\(s\) in segment \d+$/)] })
    );
  });

  it('passes a transaction with nothing guaranteed', () => {
    // Arrange
    const intent = Intent.new(new Date(Date.now() + 3_600_000));
    intent.fallibleUnshieldedOffer = unshieldedOffer(1);

    // Act / Assert: RED WHEN a fallible part is taken for a guaranteed one.
    expect(() =>
      refuseGuaranteedParts(Transaction.fromParts(MOCK_CONFIG.networkId, undefined, undefined, intent))
    ).not.toThrow();
  });
});
