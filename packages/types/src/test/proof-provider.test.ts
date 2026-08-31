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

import type { ProvingProvider, UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { describe, expect, test, vi } from 'vitest';

import { createProofProvider, type ProveTxConfig, type UnboundTransaction } from '../proof-provider';

/**
 * A `ProvingProvider` stub whose `check`/`prove` accept the trailing optional `overrideTimeout`
 * argument that timeout-aware providers (e.g. `httpClientProvingProvider`) expose. Each call
 * records the timeout it received so tests can assert what was threaded through.
 */
function makeTimeoutAwareStub(): {
  provider: ProvingProvider;
  checkTimeouts: (number | undefined)[];
  proveTimeouts: (number | undefined)[];
  lookupKeyCalls: string[];
} {
  const checkTimeouts: (number | undefined)[] = [];
  const proveTimeouts: (number | undefined)[] = [];
  const lookupKeyCalls: string[] = [];

  const provider = {
    check: async (
      _preimage: Uint8Array,
      _keyLocation: string,
      overrideTimeout?: number
    ): Promise<(bigint | undefined)[]> => {
      checkTimeouts.push(overrideTimeout);
      return [undefined];
    },
    prove: async (
      _preimage: Uint8Array,
      _keyLocation: string,
      _overwriteBindingInput?: bigint,
      overrideTimeout?: number
    ): Promise<Uint8Array> => {
      proveTimeouts.push(overrideTimeout);
      return new Uint8Array();
    },
    lookupKey: async (keyLocation: string) => {
      lookupKeyCalls.push(keyLocation);
      return undefined;
    }
  } as unknown as ProvingProvider;

  return { provider, checkTimeouts, proveTimeouts, lookupKeyCalls };
}

/**
 * Minimal typed transaction stub that captures whichever `ProvingProvider` `proveTx` hands it and
 * drives `check` + `prove` once — mirroring the real `UnprovenTransaction.prove` — so tests can
 * assert the per-call timeout threads through to the underlying provider.
 */
function makeStubTx(): {
  tx: UnprovenTransaction;
  captured: { provider?: ProvingProvider };
} {
  const captured: { provider?: ProvingProvider } = {};
  const partial: Partial<UnprovenTransaction> = {
    prove: vi.fn(async (provingProvider: ProvingProvider) => {
      captured.provider = provingProvider;
      await provingProvider.check(new Uint8Array(), 'test-circuit');
      await provingProvider.prove(new Uint8Array(), 'test-circuit', 42n);
      return {} as UnboundTransaction;
    }) as UnprovenTransaction['prove']
  };
  return { tx: partial as UnprovenTransaction, captured };
}

describe('createProofProvider', () => {
  test('returns a ProofProvider exposing a proveTx method', () => {
    const { provider } = makeTimeoutAwareStub();
    const proofProvider = createProofProvider(provider);
    expect(typeof proofProvider.proveTx).toBe('function');
  });

  describe('per-call timeout forwarding (issue #1061)', () => {
    test('threads proveTxConfig.timeout to underlying check and prove', async () => {
      const { provider, checkTimeouts, proveTimeouts } = makeTimeoutAwareStub();
      const { tx } = makeStubTx();
      await createProofProvider(provider).proveTx(tx, { timeout: 5000 } satisfies ProveTxConfig);
      expect(checkTimeouts).toEqual([5000]);
      expect(proveTimeouts).toEqual([5000]);
    });

    test('threads undefined (no override) when proveTxConfig is omitted', async () => {
      const { provider, checkTimeouts, proveTimeouts } = makeTimeoutAwareStub();
      const { tx } = makeStubTx();
      await createProofProvider(provider).proveTx(tx);
      expect(checkTimeouts).toEqual([undefined]);
      expect(proveTimeouts).toEqual([undefined]);
    });

    test('threads undefined (no override) when proveTxConfig.timeout is explicitly undefined', async () => {
      const { provider, checkTimeouts, proveTimeouts } = makeTimeoutAwareStub();
      const { tx } = makeStubTx();
      await createProofProvider(provider).proveTx(tx, { timeout: undefined });
      expect(checkTimeouts).toEqual([undefined]);
      expect(proveTimeouts).toEqual([undefined]);
    });

    test('each proveTx call threads its own timeout to the same underlying provider', async () => {
      const { provider, checkTimeouts, proveTimeouts } = makeTimeoutAwareStub();
      const proofProvider = createProofProvider(provider);
      await proofProvider.proveTx(makeStubTx().tx, { timeout: 1000 });
      await proofProvider.proveTx(makeStubTx().tx, { timeout: 2000 });
      expect(checkTimeouts).toEqual([1000, 2000]);
      expect(proveTimeouts).toEqual([1000, 2000]);
    });
  });

  describe('provider passthrough', () => {
    test('passes the underlying provider unchanged when no timeout is set', async () => {
      const { provider } = makeTimeoutAwareStub();
      const { tx, captured } = makeStubTx();
      await createProofProvider(provider).proveTx(tx);
      expect(captured.provider).toBe(provider);
    });

    test('wraps the underlying provider when a timeout is set', async () => {
      const { provider } = makeTimeoutAwareStub();
      const { tx, captured } = makeStubTx();
      await createProofProvider(provider).proveTx(tx, { timeout: 5000 });
      expect(captured.provider).not.toBe(provider);
    });

    test('wrapped provider delegates lookupKey to the underlying provider', async () => {
      const { provider, lookupKeyCalls } = makeTimeoutAwareStub();
      const { tx, captured } = makeStubTx();
      await createProofProvider(provider).proveTx(tx, { timeout: 5000 });
      await captured.provider!.lookupKey('some-key');
      expect(lookupKeyCalls).toEqual(['some-key']);
    });
  });

  describe('backward compatibility with plain ProvingProvider', () => {
    test('does not throw when the underlying provider ignores the extra timeout argument', async () => {
      // A plain `ProvingProvider` whose check/prove have no override-timeout parameter — the extra
      // trailing argument passed by the wrapper must be silently ignored at runtime.
      const check = vi.fn(async () => [undefined] as (bigint | undefined)[]);
      const prove = vi.fn(async () => new Uint8Array());
      const plainProvider = {
        check,
        prove,
        lookupKey: async () => undefined
      } as unknown as ProvingProvider;
      const { tx } = makeStubTx();
      await expect(
        createProofProvider(plainProvider).proveTx(tx, { timeout: 5000 })
      ).resolves.toBeDefined();
      expect(check).toHaveBeenCalled();
      expect(prove).toHaveBeenCalled();
    });
  });
});
