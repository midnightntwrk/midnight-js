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
  ContractDeploy,
  ContractState,
  createShieldedCoinInfo,
  Intent,
  LedgerParameters,
  MaintenanceUpdate,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  shieldedToken,
  Transaction,
  ZswapOffer,
  ZswapOutput
} from '@midnightntwrk/midnight-js-protocol/v9';
import { LedgerTransaction } from '@midnightntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex } from '@midnightntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { Ledger9ScopeFalliblePartError, Ledger9ScopeOutsideTimeToDismissError } from '../errors';
import { RecordCall, Submit, TransactionContextImpl } from '../internal/ledger9-scope';
import { assembleLedger9CallTx } from '../internal/ledger9-scope-build';
import { assertWithinTimeToDismiss, refuseFallibleTransaction } from '../internal/ledger9-scope-checks';
import { type Ledger9CallAssembly } from '../internal/ledger9-scope-states';
import type * as Utils from '../internal/utils';
import { submitCallTx } from '../submit-call-tx';
import { submitLedger9Payload } from '../submit-tx';
import { withContractScopedTransaction } from '../transaction';
import { executeLedger9CallWithProviders } from '../unproven-call-tx';
import {
  caller,
  callerKeys,
  callsOf,
  chainOf,
  deployedCallee,
  deployedCaller,
  deployedStamps,
  finalizedWithUnshieldedOutputs,
  ledgerWellFormed,
  provenInput,
  stamps,
  stampsKeys,
  unshieldedOffer
} from './scoped-transaction-fixtures';
import { createMockContractAddress, MOCK_CONFIG } from './test-mocks';

/** Whether the scope's build is made to place a coin in the fallible half, as no call places one today. */
const forged = vi.hoisted(() => ({ fallibleCoin: false }));

vi.mock('../internal/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof Utils>();
  const ledger = await import('@midnightntwrk/midnight-js-protocol/v9');
  return {
    ...actual,
    createUnprovenLedgerCallTx: (...args: Parameters<typeof actual.createUnprovenLedgerCallTx>) => {
      const tx = actual.createUnprovenLedgerCallTx(...args);
      if (forged.fallibleCoin) {
        const coin = ledger.createShieldedCoinInfo(ledger.shieldedToken().raw, 10n);
        const output = ledger.ZswapOutput.new(
          coin,
          1,
          ledger.sampleCoinPublicKey(),
          ledger.sampleEncryptionPublicKey()
        );
        tx.fallibleOffer = new Map([[1, ledger.ZswapOffer.fromOutput(output, coin.type, coin.value)]]);
      }
      return tx;
    }
  };
});

/** A ledger integer in the compact form its serialization uses. */
const compactInteger = (value: bigint): Buffer => {
  if (value < 1n << 6n) return Buffer.from([Number(value << 2n)]);
  if (value < 1n << 14n) return Buffer.from(new Uint16Array([Number((value << 2n) | 1n)]).buffer);
  if (value < 1n << 30n) return Buffer.from(new Uint32Array([Number((value << 2n) | 2n)]).buffer);
  const bytes: number[] = [];
  for (let rest = value; rest > 0n; rest >>= 8n) bytes.push(Number(rest & 0xffn));
  return Buffer.from([((bytes.length - 4) << 2) | 3, ...bytes]);
};

/**
 * The initial ledger parameters with the time to dismiss a transaction may take set to
 * `perBytePicoseconds` per byte of its size, and at least `minimumPicoseconds`. The partitioner
 * reads the same limits, so they also decide which half a call is placed in.
 */
const parametersWithTimeToDismiss = (perBytePicoseconds: bigint, minimumPicoseconds: bigint): LedgerParameters => {
  const initial = Buffer.from(LedgerParameters.initialParameters().serialize());
  const byteLimit = compactInteger(1n << 20n);
  const initialLimits = Buffer.concat([byteLimit, compactInteger(2_000_000n), compactInteger(15_000_000_000n)]);
  const at = initial.indexOf(initialLimits);
  if (at < 0) {
    throw new Error('The initial ledger parameters no longer hold the time to dismiss limits this test rewrites.');
  }
  return LedgerParameters.deserialize(
    Buffer.concat([
      initial.subarray(0, at),
      byteLimit,
      compactInteger(perBytePicoseconds),
      compactInteger(minimumPicoseconds),
      initial.subarray(at + initialLimits.length)
    ])
  );
};

/** Under these, `fillTwo` is placed wholly in the fallible half, and two of them fit once moved. */
const ROOM_FOR_TWO_FILLS = parametersWithTimeToDismiss(2_800_000n, 15_000_000_000n);

/** Under these, nothing fits. */
const NO_TIME_TO_DISMISS = parametersWithTimeToDismiss(0n, 1n);

/** Providers over a chain holding one deployed `stamps`, serving `ledgerParameters`. */
const stampsChain = async (ledgerParameters?: LedgerParameters) => {
  const address = createMockContractAddress();
  const chain = await chainOf(new Map([[address, deployedStamps()]]), [], ledgerParameters);
  const wallet = chain.withKeys(stampsKeys);
  wallet.stored.set(`${address}:id`, { stamp: 0 });
  return { address, providers: wallet.providers };
};

const fillTwo = (contractAddress: string, seed: number) => ({
  compiledContract: stamps,
  contractAddress,
  circuitId: 'fillTwo' as const,
  args: [new Uint8Array(32).fill(seed)] as [Uint8Array],
  privateStateId: 'id'
});

const count = (contractAddress: string) => ({
  compiledContract: stamps,
  contractAddress,
  circuitId: 'count' as const,
  privateStateId: 'id'
});

/** Which halves each contract call of a transaction has a transcript in. */
const halvesOf = (calls: ReturnType<typeof callsOf>): [boolean, boolean][] =>
  calls.map((call) => [call.guaranteedTranscript !== undefined, call.fallibleTranscript !== undefined]);

/** The refusal carries the balanced transaction, named but out of its message, keys and JSON. */
const expectCarriesHidden = (error: Ledger9ScopeFalliblePartError, balanced: LedgerTransaction<'Finalized', 'v9'>): void => {
  expect(error.balancedTransaction).toBe(balanced);
  expect(Object.keys(error)).not.toContain('balancedTransaction');
  expect(JSON.stringify(error)).not.toContain('balancedTransaction');
  expect(error.message).toContain("stay booked until the transaction's time to live passes, and its Dust until");
  expect(error.message).toContain('a wallet reached through the DApp connector offers no revert');
};

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (reason: unknown) => reason
  );

describe('a ledger 9 scoped transaction of two or more calls lands whole', () => {
  it('moves calls placed wholly in the fallible half whole into the guaranteed half, and the ledger accepts the result', async () => {
    // Arrange
    const { address, providers } = await stampsChain(ROOM_FOR_TWO_FILLS);
    const placed: [boolean, boolean][] = [];

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      for (const seed of [1, 2]) {
        const result = await submitCallTx(providers, fillTwo(address, seed), txCtx);
        placed.push(
          ...result.calls.map((call): [boolean, boolean] => [
            call.public.partitionedTranscript[0] !== undefined,
            call.public.partitionedTranscript[1] !== undefined
          ])
        );
      }
    });

    // Assert: RED WHEN a call tree placed wholly in the fallible half is built into the transaction
    // where it was placed, or refused instead of moved.
    const submitted = provenInput(providers.proofProvider.proveTx);
    expect(placed).toEqual([
      [false, true],
      [false, true]
    ]);
    expect(halvesOf(callsOf(submitted))).toEqual([
      [true, false],
      [true, false]
    ]);
    expect(submitted.fallibleOffer).toBeUndefined();
    expect(ledgerWellFormed(submitted)).toBe(true);
  });

  it('builds a lone call with a fallible part as that call alone, fallible part included', async () => {
    // Arrange
    const { address, providers } = await stampsChain();

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, fillTwo(address, 1), txCtx);
    });

    // Assert: RED WHEN a scope of one call is moved or refused as a scope of several is.
    expect(halvesOf(callsOf(provenInput(providers.proofProvider.proveTx)))).toEqual([[false, true]]);
  });

  it('refuses, before any proof is made, a call whose transcript is split into both halves', async () => {
    // Arrange: the second call's transcript is given a fallible half beside its guaranteed one, as a
    // call split at a checkpoint is.
    const { address, providers } = await stampsChain();

    // Act
    const scope = withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, count(address), txCtx);
      await txCtx[RecordCall]('count', async () => {
        const executed = await executeLedger9CallWithProviders(providers, count(address), txCtx);
        const calls = executed.assembly.calls.map((call) => {
          const [guaranteed] = call.public.partitionedTranscript;
          const split: typeof call.public.partitionedTranscript = [guaranteed, guaranteed];
          return { ...call, public: { ...call.public, partitionedTranscript: split } };
        });
        return { ...executed, assembly: { ...executed.assembly, calls } };
      });
    });

    // Assert: RED WHEN a split transcript is built into the scope's transaction.
    const error = await rejectionOf(scope);
    expect(error).toBeInstanceOf(Ledger9ScopeFalliblePartError);
    expect(error).toMatchObject({ stage: 'unproven', code: 'MIDNIGHT_JS_C_LEDGER9_SCOPE_FALLIBLE_PART', category: 'USAGE' });
    expect((error as Ledger9ScopeFalliblePartError).parts).toEqual([
      `a fallible transcript of 'count' of contract '${address}'`
    ]);
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('refuses a fallible part the wallet adds while balancing, before anything is submitted', async () => {
    // Arrange
    const { address, providers } = await stampsChain();
    const balanced = await finalizedWithUnshieldedOutputs(1, 'fallible');
    vi.mocked(providers.walletProvider.balanceTx).mockResolvedValue(balanced);
    const beforeSubmit = vi.fn();

    // Act
    const scope = withContractScopedTransaction(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, count(address), txCtx);
        await submitCallTx(providers, count(address), txCtx);
      },
      { beforeSubmit }
    );

    // Assert: RED WHEN the balanced transaction is submitted unchecked, or beforeSubmit is handed one
    // the check refuses.
    const error = await rejectionOf(scope);
    expect(beforeSubmit).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(Ledger9ScopeFalliblePartError);
    expect(error).toMatchObject({ stage: 'balanced' });
    expect((error as Ledger9ScopeFalliblePartError).parts).toEqual([
      expect.stringMatching(/^a fallible unshielded offer in segment \d+$/)
    ]);
    expectCarriesHidden(error as Ledger9ScopeFalliblePartError, balanced);
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('submits a lone call as that call made alone, its balanced transaction unchecked', async () => {
    // Arrange: a balanced transaction with a fallible part, over its time to dismiss.
    const { address, providers } = await stampsChain();
    vi.mocked(providers.walletProvider.balanceTx).mockResolvedValue(
      await finalizedWithUnshieldedOutputs(50, 'fallible')
    );

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, count(address), txCtx);
    });

    // Assert: RED WHEN a scope of one call is held to the checks of a scope of several.
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledOnce();
  });

  it('refuses, before any proof is made, fallible coins in the build of two calls, at the function and through the scope', async () => {
    // Arrange: the build is made to place a coin in the fallible half.
    const { address, providers } = await stampsChain();
    const assemblies: Ledger9CallAssembly[] = [];
    forged.fallibleCoin = true;
    try {
      // Act
      const scope = withContractScopedTransaction(providers, async (txCtx) => {
        for (let call = 0; call < 2; call++) {
          await txCtx[RecordCall]('count', async () => {
            const executed = await executeLedger9CallWithProviders(providers, count(address), txCtx);
            assemblies.push(executed.assembly);
            return executed;
          });
        }
      });

      // Assert: RED WHEN the build of two calls is not checked for a fallible part before proving.
      await expect(scope).rejects.toMatchObject({
        name: 'Ledger9ScopeFalliblePartError',
        stage: 'unproven',
        parts: ['fallible coins in segment 1']
      });
      expect(() => assembleLedger9CallTx(assemblies, MOCK_CONFIG)).toThrow(Ledger9ScopeFalliblePartError);
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    } finally {
      forged.fallibleCoin = false;
    }
  });

  it('moves a call tree with callees and coins whole into the guaranteed half, and the ledger accepts the result', async () => {
    // Arrange: under these parameters every call is placed wholly in the fallible half.
    const calleeAddress = createMockContractAddress();
    const callerAddress = createMockContractAddress();
    const chain = await chainOf(
      new Map([
        [calleeAddress, deployedCallee()],
        [callerAddress, deployedCaller(calleeAddress)]
      ]),
      [calleeAddress],
      NO_TIME_TO_DISMISS
    );
    const providers = chain.withKeys(callerKeys).providers;
    const walletKey = parseCoinPublicKeyToHex(chain.coinPublicKey, MOCK_CONFIG.networkId);
    const coinOf = (nonce: number) => ({
      nonce: new Uint8Array(32).fill(nonce),
      color: new Uint8Array(32).fill(1),
      value: 5n
    });
    const calls = [
      {
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
      },
      {
        compiledContract: caller,
        contractAddress: callerAddress,
        circuitId: 'depositToCallee' as const,
        args: [coinOf(2)] as [ReturnType<typeof coinOf>]
      }
    ];
    const assemblies: Ledger9CallAssembly[] = [];

    // Act: the scope itself is refused for its time to dismiss; its calls are assembled as it built them.
    const scope = withContractScopedTransaction(providers, async (txCtx) => {
      for (const options of calls) {
        await txCtx[RecordCall](options.circuitId, async () => {
          const executed = await executeLedger9CallWithProviders(providers, options as never, txCtx);
          assemblies.push(executed.assembly);
          return executed;
        });
      }
    });
    await expect(scope).rejects.toThrow(Ledger9ScopeOutsideTimeToDismissError);
    const tx = assembleLedger9CallTx(assemblies, MOCK_CONFIG);

    // Assert: RED WHEN a callee of a moved tree is left in the fallible half.
    const placed = assemblies.flatMap((assembly) => assembly.calls).map((call) => call.public.partitionedTranscript);
    expect(placed.length).toBeGreaterThan(calls.length);
    expect(placed.every(([guaranteed, fallible]) => guaranteed === undefined && fallible !== undefined)).toBe(true);
    expect(halvesOf(callsOf(tx)).every(([guaranteed, fallible]) => guaranteed && !fallible)).toBe(true);
    expect(callsOf(tx)).toHaveLength(placed.length);
    expect(tx.fallibleOffer).toBeUndefined();
    expect(tx.guaranteedOffer).toBeDefined();
    expect(ledgerWellFormed(tx)).toBe(true);
  });

  const coin = createShieldedCoinInfo(shieldedToken().raw, 10n);
  const transactionsHolding = {
    'fallible coins': () =>
      Transaction.fromParts(
        MOCK_CONFIG.networkId,
        undefined,
        ZswapOffer.fromOutput(
          ZswapOutput.new(coin, 1, sampleCoinPublicKey(), sampleEncryptionPublicKey()),
          coin.type,
          coin.value
        ),
        undefined
      ),
    'a fallible unshielded offer': () => {
      const intent = Intent.new(new Date(Date.now() + 3_600_000));
      intent.fallibleUnshieldedOffer = unshieldedOffer(1);
      return Transaction.fromParts(MOCK_CONFIG.networkId, undefined, undefined, intent);
    },
    'contract deploy': () =>
      Transaction.fromParts(
        MOCK_CONFIG.networkId,
        undefined,
        undefined,
        Intent.new(new Date(Date.now() + 3_600_000)).addDeploy(new ContractDeploy(new ContractState()))
      ),
    'maintenance update': () =>
      Transaction.fromParts(
        MOCK_CONFIG.networkId,
        undefined,
        undefined,
        Intent.new(new Date(Date.now() + 3_600_000)).addMaintenanceUpdate(
          new MaintenanceUpdate(sampleContractAddress(), [], 0n)
        )
      )
  };

  it.each(
    (Object.keys(transactionsHolding) as (keyof typeof transactionsHolding)[]).flatMap((part) =>
      (['unproven', 'balanced'] as const).map((stage) => [part, stage] as const)
    )
  )('refuses a transaction holding %s at the %s stage', (part, stage) => {
    // Arrange
    const tx = transactionsHolding[part]();

    // Act / Assert: RED WHEN that part is not looked for.
    expect(() => refuseFallibleTransaction(tx, stage)).toThrow(
      expect.objectContaining({ name: 'Ledger9ScopeFalliblePartError', stage, parts: [expect.stringContaining(part)] })
    );
  });

  it.each(['unproven', 'balanced'] as const)(
    'refuses a transaction holding a fallible transcript at the %s stage',
    async (stage) => {
      // Arrange: a lone fillTwo keeps its fallible transcript.
      const { address, providers } = await stampsChain();
      await withContractScopedTransaction(providers, async (txCtx) => {
        await submitCallTx(providers, fillTwo(address, 1), txCtx);
      });

      // Act / Assert: RED WHEN a fallible transcript is not looked for.
      expect(() => refuseFallibleTransaction(provenInput(providers.proofProvider.proveTx), stage)).toThrow(
        expect.objectContaining({
          stage,
          parts: [expect.stringMatching(/^1 fallible transcript\(s\) in segment \d+$/)]
        })
      );
    }
  );
});

describe("a ledger 9 scoped transaction and the ledger's time to dismiss", () => {
  it('passes on as the ledger raised it a refusal of its cost function other than the time to dismiss', () => {
    // Arrange: a transaction the ledger refuses to price for another reason, as it does one that repeats an entry.
    const refusal = new Error('transaction contains repeated entries');
    const priced = { cost: () => { throw refusal; } };

    // Act
    const act = () => assertWithinTimeToDismiss(priced, LedgerParameters.initialParameters(), []);

    // Assert: RED WHEN a refusal that is not over the time to dismiss is dropped, or reported as one.
    expect(act).toThrow(refusal);
    expect(act).not.toThrow(Ledger9ScopeOutsideTimeToDismissError);
  });

  it('refuses two calls that cost more to dismiss than their size allows, before any proof is made', async () => {
    // Arrange: two fillTwo, moved into the guaranteed half, are priced above what the initial
    // parameters allow a transaction of their size.
    const { address, providers } = await stampsChain();

    // Act
    const scope = withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, fillTwo(address, 1), txCtx);
      await submitCallTx(providers, fillTwo(address, 2), txCtx);
    });

    // Assert: RED WHEN the transaction is proven before it is priced, or the calls moved out of the
    // fallible half go unnamed.
    const error = await rejectionOf(scope);
    expect(error).toBeInstanceOf(Ledger9ScopeOutsideTimeToDismissError);
    expect(error).toMatchObject({
      code: 'MIDNIGHT_JS_C_LEDGER9_SCOPE_OUTSIDE_TIME_TO_DISMISS',
      category: 'REJECTED'
    });
    const { size, message } = error as Ledger9ScopeOutsideTimeToDismissError;
    expect(size).toBeGreaterThan(0);
    expect(message).toMatch(
      new RegExp(`priced at \\S+ms to dismiss, but its estimated size of ${size} bytes allows at most \\S+ms\\.`)
    );
    expect(message).toContain('This is an estimate');
    expect(message).not.toContain('node would refuse');
    expect(message).toContain(
      `The ledger placed 'fillTwo' of contract '${address}', 'fillTwo' of contract '${address}' wholly in the fallible half`
    );
    expect(message).toContain('Send it in a transaction of its own');
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('does not price a lone call, which is submitted as that call made alone', async () => {
    // Arrange: under these parameters a scope of two calls would be refused.
    const { address, providers } = await stampsChain(NO_TIME_TO_DISMISS);

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, count(address), txCtx);
    });

    // Assert: RED WHEN a lone call is priced before proving.
    expect(providers.proofProvider.proveTx).toHaveBeenCalledOnce();
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledOnce();
  });

  it('prices two calls under the ledger parameters the scope read its states at', async () => {
    // Arrange: the initial parameters would let these calls through.
    const { address, providers } = await stampsChain(NO_TIME_TO_DISMISS);

    // Act
    const scope = withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, count(address), txCtx);
      await submitCallTx(providers, count(address), txCtx);
    });

    // Assert: RED WHEN the calls are priced under parameters other than those read.
    await expect(scope).rejects.toMatchObject({
      name: 'Ledger9ScopeOutsideTimeToDismissError',
      message: expect.stringContaining('allows at most 1ps.')
    });
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('refuses to submit two calls recorded without reading their states through the scope, before any proof is made', async () => {
    // Arrange: the call reads its states through another scope, so this one holds no ledger parameters.
    const { address, providers } = await stampsChain();
    const executed = await executeLedger9CallWithProviders(
      providers,
      count(address),
      new TransactionContextImpl(providers)
    );
    const scope = new TransactionContextImpl(providers);
    await scope[RecordCall]('count', () => Promise.resolve(executed));
    await scope[RecordCall]('count', () => Promise.resolve(executed));

    // Act / Assert: RED WHEN a scope with nothing to price its transaction under submits it unpriced.
    await expect(scope[Submit]()).rejects.toThrow(InvalidArgumentError);
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('submits the transaction the wallet balanced unchecked for its time to dismiss, leaving that to the node', async () => {
    // Arrange: the calls fit; the wallet's answer, ten unshielded outputs in under a kilobyte, does not.
    const { address, providers } = await stampsChain();
    const balanced = await finalizedWithUnshieldedOutputs(10, 'guaranteed');
    vi.mocked(providers.walletProvider.balanceTx).mockResolvedValue(balanced);

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, count(address), txCtx);
      await submitCallTx(providers, count(address), txCtx);
    });

    // Assert: RED WHEN the balanced transaction is priced before it is submitted. The node refuses a
    // transaction over its time to dismiss at no fee, and the wallet then releases what it booked.
    expect(providers.proofProvider.proveTx).toHaveBeenCalledOnce();
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledWith(balanced);
  });

  it('leaves a transaction submitted without a scope, as a deploy or a maintenance update is, unchecked', async () => {
    // Arrange: a balanced transaction that holds a fallible part and is over its time to dismiss.
    const { providers } = await stampsChain();
    const balanced = await finalizedWithUnshieldedOutputs(50, 'fallible');
    vi.mocked(providers.walletProvider.balanceTx).mockResolvedValue(balanced);

    // Act
    const finalized = await submitLedger9Payload(providers, {
      unprovenTx: LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts(MOCK_CONFIG.networkId))
    });

    // Assert: RED WHEN a path that passes no check is checked.
    expect(finalized.status).toBe('SucceedEntirely');
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledWith(balanced);
  });
});
