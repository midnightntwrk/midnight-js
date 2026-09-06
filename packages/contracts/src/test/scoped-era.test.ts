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

/**
 * The ERA RULES a contract-scoped transaction runs under.
 *
 * A scope is a single chain snapshot: the first read pins a block and every
 * later call in the scope reuses it. The era belongs with that discipline, so
 * it is resolved ONCE, when the scope is created, and never re-resolved per
 * merged call — a scope that read the head twice could compose half its calls
 * against each answer, which is the one thing a batched transaction must not
 * do.
 *
 * On a PRE-FORK head a scope is refused outright. The refusal is not a gap in
 * an unfinished pipeline: the pre-fork era composes exactly ONE call per
 * transaction and refuses a longer list, because a call tree is a post-fork
 * ledger feature, so there is nothing for a scope to batch INTO. A pre-fork
 * contract is single-call by construction, so a pre-fork scope also has little
 * to be atomic about.
 */

import type * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import { LEDGER_VERSIONS, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';
import type { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { AnyProvableCircuitId } from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MixedEraScopeError, ScopedTxEraUnsupportedError } from '../errors';
import { pipelineEraOf } from '../internal/era';
import { assertScopeAdmitsRetainedEraCall, scopedTransaction, TransactionContextImpl } from '../internal/transaction';
import { submitCallTx } from '../submit-call-tx';
import { submitTx } from '../submit-tx';
import { withContractScopedTransaction } from '../transaction';
import { type CallTxOptions, createUnprovenCallTx } from '../unproven-call-tx';
import {
  createMockCompiledContract,
  createMockContractAddress,
  createMockFinalizedTxData,
  createMockProviders,
  createMockUnprovenCallTxData
} from './test-mocks';

vi.mock('../unproven-call-tx');
vi.mock('../submit-tx');

/**
 * Every era acquisition this file's flows attempt, and an optional era to make
 * FAIL.
 *
 * Acquiring an era is a lazy runtime load -- for the pre-fork era it reaches
 * the `/v8` subpath and instantiates that ledger's WASM -- so a scope refusal
 * that runs after the acquisition both pays for it and depends on it
 * succeeding. `ledger-v8` is a hard dependency of `packages/protocol`, so the
 * load always succeeds here unless it is made to fail, which is exactly why
 * this slot exists: without it no test in this repository can tell the two
 * orders apart.
 */
const eraLoadSlot = vi.hoisted((): { readonly acquired: string[]; rejectFor?: string } => ({ acquired: [] }));

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const actual = await importOriginal<typeof Protocol>();
  return {
    ...actual,
    loadLedgerEra: (version: LedgerVersion): Promise<Protocol.LedgerEra> => {
      eraLoadSlot.acquired.push(version);
      if (version === eraLoadSlot.rejectFor) {
        // The shape the real acquisition fails with when the lazy subpath
        // cannot be loaded -- a bundler that pruned it, or a runtime that
        // cannot instantiate its WASM.
        return Promise.reject(new Error(`/${version} could not be acquired`));
      }
      return actual.loadLedgerEra(version);
    }
  };
});

// The era timeline's own scheme, `node-major * 1_000_000 + node-minor * 1_000`.
const PRE_FORK_PROTOCOL_VERSION = 1_000_000;
const POST_FORK_PROTOCOL_VERSION = 2_000_000;
// The SAME era as `POST_FORK_PROTOCOL_VERSION`, one node minor release later.
const POST_FORK_NODE_MINOR_BUMP = 2_001_000;

describe('per-scope era resolution', () => {
  let providers: ReturnType<typeof createMockProviders>;
  let compiledContract: CompiledContract.CompiledContract<Contract.Any, unknown, never>;
  let contractAddress: ReturnType<typeof createMockContractAddress>;

  beforeEach(() => {
    vi.clearAllMocks();
    eraLoadSlot.acquired.length = 0;
    eraLoadSlot.rejectFor = undefined;
    providers = createMockProviders();
    compiledContract = createMockCompiledContract();
    contractAddress = createMockContractAddress();
    vi.mocked(createUnprovenCallTx).mockResolvedValue(createMockUnprovenCallTxData());
    vi.mocked(submitTx).mockResolvedValue(createMockFinalizedTxData());
  });

  const callOptions = (): CallTxOptions<Contract.Any, AnyProvableCircuitId> => ({
    compiledContract,
    contractAddress,
    circuitId: 'testCircuit' as AnyProvableCircuitId,
    args: ['arg1']
  });

  const onPostForkHead = (protocolVersion = POST_FORK_PROTOCOL_VERSION): void => {
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(protocolVersion);
  };

  it('resolves the head era ONCE per scope, however many calls are merged into it', async () => {
    onPostForkHead();

    await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions(), txCtx);
      await submitCallTx(providers, callOptions(), txCtx);
    });

    // ONE head read for the whole scope, not one per merged call. Two reads
    // could answer differently mid-scope and leave the batched transaction
    // composed half against each era.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    expect(createUnprovenCallTx).toHaveBeenCalledTimes(2);
    expect(submitTx).toHaveBeenCalledTimes(1);
  });

  it('refuses a scope on a PRE-FORK head, before the scope body runs at all', async () => {
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(PRE_FORK_PROTOCOL_VERSION);
    const body = vi.fn(async () => undefined);

    let caught: unknown;
    try {
      await withContractScopedTransaction(providers, body);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ScopedTxEraUnsupportedError);
    // The CODE, not only the class: a consumer that cannot import this
    // package's classes branches on `code`.
    expect(hasErrorCode(caught, CONTRACTS_ERROR_CODES.SCOPED_TX_ERA_UNSUPPORTED)).toBe(true);
    expect((caught as ScopedTxEraUnsupportedError).head).toBe('v8');
    // Refused at CREATION: the body never ran, so no circuit was executed and
    // no private state was touched on a scope that could never be submitted.
    expect(body).not.toHaveBeenCalled();
    expect(createUnprovenCallTx).not.toHaveBeenCalled();
    expect(submitTx).not.toHaveBeenCalled();
  });

  it('refuses a PRE-FORK head WITHOUT acquiring that era, and still refuses when the acquisition would fail', async () => {
    // The refusal has to be decided from the HEAD READING alone. Acquiring the
    // era first would make a current-era-only dApp -- the caller the lazy
    // pre-fork subpath exists for -- pay to instantiate a ledger it will never
    // use, and would replace this refusal with an acquisition failure whenever
    // that subpath cannot be loaded. Then the caller is told to acquire the
    // retained runtime, which is the wrong instruction for it, and never sees
    // the two-way remediation at all.
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(PRE_FORK_PROTOCOL_VERSION);
    eraLoadSlot.rejectFor = 'v8';

    let caught: unknown;
    try {
      await withContractScopedTransaction(providers, async () => undefined);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ScopedTxEraUnsupportedError);
    expect(hasErrorCode(caught, CONTRACTS_ERROR_CODES.SCOPED_TX_ERA_UNSUPPORTED)).toBe(true);
    // NOTHING was acquired: not the era it refuses, and not any other.
    expect(eraLoadSlot.acquired).toEqual([]);
  });

  it('acquires the head era exactly once on a post-fork head, after admitting the scope', async () => {
    // The mirror of the test above, so "refuse before acquiring" does not
    // become "never acquire": the era a scope RUNS on is still acquired, once,
    // and the previous task's threading still gets a real facade.
    onPostForkHead();

    await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions(), txCtx);
    });

    expect(eraLoadSlot.acquired).toEqual(['v9']);
  });

  it('names BOTH ways forward in the refusal, rather than only saying no', async () => {
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(PRE_FORK_PROTOCOL_VERSION);

    let caught: unknown;
    try {
      await withContractScopedTransaction(providers, async () => undefined);
    } catch (error) {
      caught = error;
    }

    const message = (caught as Error).message;
    // Way one: drop the batching and submit each call on its own.
    expect(message).toContain('submitCallTx');
    // Way two: keep the batching and run the scope after the fork.
    expect(message).toMatch(/crossed the fork|after the fork/);
    // And it says WHY, so the refusal does not read as an arbitrary limitation.
    expect(message).toContain('one call');
  });

  it('admits a scope on a post-fork head, unchanged from before these era rules', async () => {
    onPostForkHead();

    const finalized = await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions(), txCtx);
    });

    expect(finalized.public.status).toBe('SucceedEntirely');
    expect(submitTx).toHaveBeenCalledTimes(1);
  });

  it('admits a scope on a post-fork head reported by a LATER node minor release: eras decide, not integers', async () => {
    // 2_001_000 is a different integer from 2_000_000 and the same ledger era.
    // A scope gate written against the integer would refuse an ordinary node
    // upgrade.
    onPostForkHead(POST_FORK_NODE_MINOR_BUMP);

    const finalized = await withContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions(), txCtx);
    });

    expect(finalized.public.status).toBe('SucceedEntirely');
  });

  it('NESTS into a transaction context passed as its third argument, rather than opening a fresh scope', async () => {
    // A JavaScript caller can pass a context here -- the parameter is declared
    // as options, and the entry point accepted a context before these era rules
    // by nesting into it. Reading it as an options bag would open a FRESH scope
    // and submit, on its own, the transaction the caller believed was nested:
    // the same "silently ran outside the scope it was handed" failure the
    // mixed-era refusal exists to stop, one arm over.
    onPostForkHead();

    // Exercised through the internal entry the public one forwards to, whose
    // third parameter names both shapes -- so this is the same code path a
    // JavaScript caller reaches, without a cast to fake the argument.
    const outer = new TransactionContextImpl<Contract.Any, AnyProvableCircuitId>(providers, undefined);
    await scopedTransaction(providers, async (txCtx) => {
      // The very context that was handed in, not a fresh one.
      expect(txCtx).toBe(outer);
      await submitCallTx(providers, callOptions(), txCtx);
    }, outer);

    // NOTHING was submitted: the outer scope owns the submission, exactly as
    // before. A fresh scope would have submitted here.
    expect(submitTx).not.toHaveBeenCalled();
    // And no head read either -- a nested call inherits the outer scope's one
    // reading rather than taking a second.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
  });

  it('carries the era it resolved on the scope, so nothing downstream re-reads the head', async () => {
    onPostForkHead();

    let seen: unknown;
    await withContractScopedTransaction(providers, async (txCtx) => {
      seen = txCtx;
      await submitCallTx(providers, callOptions(), txCtx);
    });

    expect(seen).toBeInstanceOf(TransactionContextImpl);
    const resolvedEra = (seen as TransactionContextImpl<Contract.Any, AnyProvableCircuitId>).resolvedEra;
    expect(resolvedEra?.head).toBe('v9');
    expect(resolvedEra?.headProtocolVersion).toBe(POST_FORK_PROTOCOL_VERSION);
  });
});

describe('the era ordering the forward-only fork guard relies on', () => {
  it('lists the ledger eras in chronological order, oldest first', () => {
    // `LEDGER_VERSIONS` is declared oldest-first, and the fork-crossing guard
    // reads a MOVE DIRECTION off that index. Pinned here rather than assumed:
    // an era inserted out of order would silently invert the direction test and
    // make a backwards head move read as a forward fork crossing.
    expect([...LEDGER_VERSIONS]).toEqual<readonly LedgerVersion[]>(['v8', 'v9']);
  });
});

describe('a retained-era call handed a scope', () => {
  // A retained-era artifact, in the shape `pipelineEraOf` recognises: own
  // `impureCircuits`, and an `initialState` that is a SYNCHRONOUS function.
  // Asserted below rather than assumed, so this fixture cannot drift into the
  // current-era arm and make the negative vacuous.
  const retainedContract = {
    impureCircuits: { retainedCircuit: (): void => undefined },
    initialState: (): Record<string, never> => ({})
  };

  it('is the shape the era dispatch calls retained-era', () => {
    expect(pipelineEraOf(retainedContract)).toBe('ledger8');
  });

  it('is REFUSED rather than silently run outside the scope it was handed', () => {
    const providers = createMockProviders();
    const scope = new TransactionContextImpl<Contract.Any, AnyProvableCircuitId>(providers);

    let caught: unknown;
    try {
      assertScopeAdmitsRetainedEraCall('retainedCircuit', scope);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(MixedEraScopeError);
    expect(hasErrorCode(caught, CONTRACTS_ERROR_CODES.MIXED_ERA_SCOPE)).toBe(true);
    expect((caught as MixedEraScopeError).circuitId).toBe('retainedCircuit');
    // The remediation has to say where the call CAN go, because the caller's
    // batching intent cannot be honoured either way.
    expect((caught as Error).message).toContain('submitCallTx');
  });

  it('runs normally when it was handed no scope at all', () => {
    expect(() => assertScopeAdmitsRetainedEraCall('retainedCircuit', undefined)).not.toThrow();
  });

  it.each([
    ['null', null],
    ['a string', 'not-a-context'],
    ['a plain object', { scopeName: 'looks-like-options' }]
  ])('reports %s passed as the third argument as a BAD ARGUMENT, not as a mixed-era scope', (_label, bad) => {
    // A JavaScript caller's stray third argument is a mistake to fix, not a
    // batching conflict. Telling it that this circuit "cannot join a
    // contract-scoped transaction" would name a scope it never had.
    let caught: unknown;
    try {
      assertScopeAdmitsRetainedEraCall('retainedCircuit', bad);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(TypeError);
    expect(caught).not.toBeInstanceOf(MixedEraScopeError);
    expect((caught as Error).message).toContain('is not a transaction context');
    // And it says where a real one comes from, so the mistake is fixable.
    expect((caught as Error).message).toContain('withContractScopedTransaction');
  });
});

describe('where the two fork-window behaviours meet', () => {
  // This ties the per-scope era rule to the fork-crossing stale-head handler,
  // and the tie is a BOUNDARY rather than a hand-off: because a scope is
  // refused outright on a pre-fork head, a scope can only ever run on a head
  // that has already crossed -- so a scope never reaches the stale-head
  // diagnosis, and the fork-crossing rejection at submit stays what
  // `./stale-head.test.ts` covers, on the retained-era call path that CAN start
  // pre-fork. Asserted here so the boundary is checked rather than assumed: the
  // pre-fork scope must fail as a scope-era refusal, never as a stale head.
  it('refuses a pre-fork scope as an era refusal, never as a stale head', async () => {
    const providers = createMockProviders();
    providers.publicDataProvider.queryLatestProtocolVersion = vi
      .fn()
      .mockResolvedValueOnce(PRE_FORK_PROTOCOL_VERSION)
      .mockResolvedValue(POST_FORK_PROTOCOL_VERSION);

    let caught: unknown;
    try {
      await withContractScopedTransaction(providers, async () => undefined);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ScopedTxEraUnsupportedError);
    // The head is read ONCE. Nothing re-reads it looking for a fork, because
    // there is no submission to diagnose -- the scope was refused before one
    // could exist.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
  });
});
