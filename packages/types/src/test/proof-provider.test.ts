/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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
  type CostModel,
  type PreBinding,
  type Proof,
  type ProvingProvider,
  type SignatureEnabled,
  type Transaction,
  type UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProofProvider, TIMEOUT_AWARE_BRAND } from '../proof-provider';

type UnboundTransaction = Transaction<SignatureEnabled, Proof, PreBinding>;

/**
 * A `ProvingProvider` whose `check` / `prove` accept an optional trailing
 * `overrideTimeout` parameter — structurally a `TimeoutAwareProvingProvider`.
 * The provider carries the explicit `TIMEOUT_AWARE_BRAND` brand so `createProofProvider`'s
 * runtime detection narrows correctly. The brand replaces the prior `Function.prototype.length`
 * arity heuristic (see `proof-provider.ts` for the rationale).
 */
const makeTimeoutAwareProvingProvider = (
  overrides: { check?: (overrideTimeout?: number) => void; prove?: (overrideTimeout?: number) => void } = {}
): ProvingProvider => ({
  [TIMEOUT_AWARE_BRAND]: true,
  check: (_preimage: Uint8Array, _key: string, overrideTimeout?: number) => {
    overrides.check?.(overrideTimeout);
    return Promise.resolve([0n]);
  },
  prove: (
    _preimage: Uint8Array,
    _key: string,
    _overwriteBindingInput?: bigint,
    overrideTimeout?: number
  ) => {
    overrides.prove?.(overrideTimeout);
    return Promise.resolve(new Uint8Array());
  }
});

/**
 * A bare `ProvingProvider` with no `overrideTimeout` parameter and no brand — `prove.length`
 * is 3 and the brand is absent, so `createProofProvider`'s runtime detection returns false.
 * Used to assert the runtime feature-detect falls back to pass-through when the underlying
 * provider doesn't support per-call overrides.
 */
const makeNonTimeoutAwareProvingProvider = (
  overrides: { check?: () => void; prove?: () => void } = {}
): ProvingProvider => ({
  check: (_preimage: Uint8Array, _key: string) => {
    overrides.check?.();
    return Promise.resolve([0n]);
  },
  prove: (_preimage: Uint8Array, _key: string, _overwriteBindingInput?: bigint) => {
    overrides.prove?.();
    return Promise.resolve(new Uint8Array());
  }
});

const makeUnprovenTx = (provingProvider: ProvingProvider): UnprovenTransaction =>
  ({
    prove: vi.fn(async (pp: ProvingProvider) => {
      // Drive both check and prove through the wrapper so the override, if any,
      // is observed on each.
      await pp.check(new Uint8Array(), 'key-1');
      await pp.prove(new Uint8Array(), 'key-1');
      return { tag: 'proven-tx' } as unknown as UnboundTransaction;
    })
  }) as unknown as UnprovenTransaction;

const mockCostModel = { tag: 'cost-model' } as unknown as CostModel;

describe('createProofProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a ProofProvider with a proveTx method', () => {
    const pp = createProofProvider(makeTimeoutAwareProvingProvider(), mockCostModel);
    expect(pp).toHaveProperty('proveTx');
    expect(typeof pp.proveTx).toBe('function');
  });

  it('does not call proveTxConfig when omitted', async () => {
    // Baseline: with no proveTxConfig, the underlying provider is used unchanged.
    const observe = { check: vi.fn(), prove: vi.fn() };
    const underlying = makeTimeoutAwareProvingProvider(observe);
    const pp = createProofProvider(underlying, mockCostModel);
    const tx = makeUnprovenTx(underlying);

    await pp.proveTx(tx);

    expect(observe.check).toHaveBeenCalledWith(undefined);
    expect(observe.prove).toHaveBeenCalledWith(undefined);
  });

  it('threads per-call proveTxConfig.timeout into both check and prove calls (timeout-aware provider)', async () => {
    // Core fix for issue #1061: a timeout-aware underlying provider receives the
    // per-call timeout on every circuit-level check/prove, even though the provider
    // was constructed without an explicit timeout.
    const observe = { check: vi.fn(), prove: vi.fn() };
    const underlying = makeTimeoutAwareProvingProvider(observe);
    const pp = createProofProvider(underlying, mockCostModel);
    const tx = makeUnprovenTx(underlying);

    await pp.proveTx(tx, { timeout: 5_000 });

    expect(observe.check).toHaveBeenCalledWith(5_000);
    expect(observe.prove).toHaveBeenCalledWith(5_000);
  });

  it('threads the per-call timeout on every proveTx call independently', async () => {
    // Multiple proveTx calls each carry their own resolved timeout. The underlying
    // provider is built once at createProofProvider construction (so eager checks
    // and warnings fire once), but each per-call wrapper closure binds its own value.
    const observe = { check: vi.fn(), prove: vi.fn() };
    const underlying = makeTimeoutAwareProvingProvider(observe);
    const pp = createProofProvider(underlying, mockCostModel);

    await pp.proveTx(makeUnprovenTx(underlying), { timeout: 1_000 });
    await pp.proveTx(makeUnprovenTx(underlying), { timeout: 2_000 });

    expect(observe.check.mock.calls).toEqual([[1_000], [2_000]]);
    expect(observe.prove.mock.calls).toEqual([[1_000], [2_000]]);
  });

  it('passes through unchanged when the underlying provider is not timeout-aware', async () => {
    // Custom providers that don't conform to TimeoutAwareProvingProvider receive
    // the unmodified call shape — no per-call override is threaded, and the
    // underlying provider's own default (if any) remains in effect. The call still
    // succeeds; the drop is graceful.
    const observe = { check: vi.fn(), prove: vi.fn() };
    const underlying = makeNonTimeoutAwareProvingProvider(observe);
    const pp = createProofProvider(underlying, mockCostModel);
    const tx = makeUnprovenTx(underlying);

    await expect(pp.proveTx(tx, { timeout: 5_000 })).resolves.toBeDefined();

    // The underlying provider was invoked — just without any timeout parameter.
    expect(observe.check).toHaveBeenCalledTimes(1);
    expect(observe.prove).toHaveBeenCalledTimes(1);
    // No override argument was passed: the non-timeout-aware `check`/`prove` were
    // called with only the args the upstream `ProvingProvider` declares (no trailing
    // `overrideTimeout`). Calls have length 2 (preimage, key) for check and 2 for
    // prove (preimage, key — overwriteBindingInput not supplied by the test stub).
    expect(observe.check.mock.calls[0]).toHaveLength(2);
    expect(observe.prove.mock.calls[0]).toHaveLength(2);
  });

  it('does not mutate the caller-supplied proveTxConfig', async () => {
    // Defensive: the timeout-aware wrapper must not write to the caller's object.
    const observe = { check: vi.fn(), prove: vi.fn() };
    const underlying = makeTimeoutAwareProvingProvider(observe);
    const pp = createProofProvider(underlying, mockCostModel);
    const config = { timeout: 7_500 };
    const before = { ...config };

    await pp.proveTx(makeUnprovenTx(underlying), config);

    expect(config).toEqual(before);
  });

  it('does not false-positive on a provider whose prove has 4 positional params but no brand', async () => {
    // Regression test for the arity-heuristic fragility @sp-io flagged on PR #1063:
    // a provider that declares an unrelated 4th positional parameter (e.g. a default-valued
    // trailing param) but does NOT carry the TIMEOUT_AWARE_BRAND brand must not be
    // detected as timeout-aware. createProofProvider's runtime detection must use the
    // brand, not Function.prototype.length.
    const observe = { check: vi.fn(), prove: vi.fn() };
    // Note: no brand, but prove/check declare a 4th positional parameter (with default value
    // so it doesn't appear in `.length` — this is the false-negative direction; the false-
    // positive direction is covered by the next test).
    const unrelatedFourthParamProvider: ProvingProvider = {
      check: (_preimage, _key) => {
        observe.check();
        return Promise.resolve([0n]);
      },
      prove: (_preimage, _key, _overwriteBindingInput) => {
        observe.prove();
        return Promise.resolve(new Uint8Array());
      }
    };
    const pp = createProofProvider(unrelatedFourthParamProvider, mockCostModel);
    const tx = makeUnprovenTx(unrelatedFourthParamProvider);

    // Caller passes a timeout, but the provider is not timeout-aware — must pass through
    // unchanged and the timeout must NOT be threaded.
    await expect(pp.proveTx(tx, { timeout: 5_000 })).resolves.toBeDefined();
    expect(observe.check).toHaveBeenCalledTimes(1);
    expect(observe.prove).toHaveBeenCalledTimes(1);
    // No override argument was passed through to the non-timeout-aware provider.
    expect(observe.check.mock.calls[0]).toHaveLength(2);
    expect(observe.prove.mock.calls[0]).toHaveLength(2);
  });

  it('detects a provider that carries the brand but has prove.length < 4 (e.g. default-valued trailing param)', async () => {
    // Regression test for the opposite direction: a genuinely timeout-aware provider whose
    // `prove` declares its `overrideTimeout` parameter with a default value (so
    // Function.prototype.length undercounts) — and which carries the TIMEOUT_AWARE_BRAND
    // brand — must still be detected as timeout-aware. The brand is the source of truth.
    const observe = { check: vi.fn(), prove: vi.fn() };
    const brandAwareButShortLengthProvider: ProvingProvider = {
      [TIMEOUT_AWARE_BRAND]: true,
      check: (_preimage, _key, overrideTimeout: number = 1_000) => {
        observe.check(overrideTimeout);
        return Promise.resolve([0n]);
      },
      prove: (_preimage, _key, _overwriteBindingInput, overrideTimeout: number = 1_000) => {
        observe.prove(overrideTimeout);
        return Promise.resolve(new Uint8Array());
      }
    };
    const pp = createProofProvider(brandAwareButShortLengthProvider, mockCostModel);
    const tx = makeUnprovenTx(brandAwareButShortLengthProvider);

    await pp.proveTx(tx, { timeout: 5_000 });

    // The brand-aware provider was correctly detected as timeout-aware, so the per-call
    // timeout was threaded through the wrapper. Without the brand, the prior arity heuristic
    // would have missed this provider (prove.length would have been 3 due to the default value).
    expect(observe.check).toHaveBeenCalledWith(5_000);
    expect(observe.prove).toHaveBeenCalledWith(5_000);
  });
});