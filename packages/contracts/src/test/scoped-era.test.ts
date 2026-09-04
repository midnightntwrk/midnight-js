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

import type { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { AnyProvableCircuitId } from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MixedEraScopeError, ScopedTxEraUnsupportedError } from '../errors';
import { pipelineEraOf } from '../internal/era';
import { assertScopeAdmitsRetainedEraCall, TransactionContextImpl } from '../internal/transaction';
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
