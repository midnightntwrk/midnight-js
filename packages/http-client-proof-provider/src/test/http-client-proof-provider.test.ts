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

import type { UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ZKConfigProvider, type ProveTxConfig } from '@midnight-ntwrk/midnight-js-types';

import type { ProvingProviderConfig } from '../http-client-proving-provider';

// Mock the low-level http-client-proving-provider module so we can observe
// what timeout value is wired into the underlying provider at construction
// time and what timeout override flows through each per-circuit check/prove
// call during a proveTx — without requiring a live proof server.
// The actual `DEFAULT_TIMEOUT` is exported and re-exported unchanged so
// tests can still assert against the real constant.
vi.mock('../http-client-proving-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../http-client-proving-provider')>();
  return {
    ...actual,
    httpClientProvingProvider: vi.fn()
  };
});

// Import the system under test AFTER vi.mock is hoisted, so the mock
// is in place when the module reads its dependency.
import { httpClientProofProvider } from '../http-client-proof-provider';
import {
  DEFAULT_TIMEOUT,
  httpClientProvingProvider
} from '../http-client-proving-provider';

const mockedHttpClientProvingProvider = vi.mocked(httpClientProvingProvider);

class MockZKConfigProvider extends ZKConfigProvider<'test-circuit'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getZKIR(_circuitId: 'test-circuit') {
    return new Uint8Array([1, 2, 3]);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getProverKey(_circuitId: 'test-circuit') {
    return new Uint8Array([4, 5, 6]);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getVerifierKey(_circuitId: 'test-circuit') {
    return new Uint8Array([7, 8, 9]);
  }
}

/**
 * Wires `mockedHttpClientProvingProvider` to return a stub ProvingProvider
 * whose prove() captures the per-call timeout override each invocation
 * receives. Returns the call records so tests can assert on:
 *   - `constructionCalls`: how many times the inner factory was invoked
 *     (should be exactly 1 per httpClientProofProvider construction)
 *   - `proveTimeouts`: the per-call timeout overrides passed to each
 *     prove() call within a proveTx
 *   - `checkTimeouts`: the per-call timeout overrides passed to each
 *     check() call within a proveTx
 */
function wireMocks(): {
  constructionCalls: ProvingProviderConfig[];
  proveTimeouts: (number | undefined)[];
  checkTimeouts: (number | undefined)[];
} {
  const constructionCalls: ProvingProviderConfig[] = [];
  const proveTimeouts: (number | undefined)[] = [];
  const checkTimeouts: (number | undefined)[] = [];

  mockedHttpClientProvingProvider.mockImplementation(
    (_url: string, _zk: ZKConfigProvider<string>, cfg?: ProvingProviderConfig) => {
      constructionCalls.push(cfg ?? {});
      return {
        check: async (
          _preimage: Uint8Array,
          _key: string,
          overrideTimeout?: number
        ) => {
          checkTimeouts.push(overrideTimeout);
          return [undefined];
        },
        prove: async (
          _preimage: Uint8Array,
          _key: string,
          _overwriteBindingInput?: bigint,
          overrideTimeout?: number
        ) => {
          proveTimeouts.push(overrideTimeout);
          return new Uint8Array();
        }
      };
    }
  );

  return { constructionCalls, proveTimeouts, checkTimeouts };
}

/**
 * Minimal typed stub for proveTx tests. Only `prove` is exercised by
 * `httpClientProofProvider`, so a `Partial<UnprovenTransaction>` documents
 * that intent without dragging in `addCalls`/`addZswapOffer`/etc. The single
 * contained cast lives here so call sites stay clean.
 */
const stubTx = (): UnprovenTransaction => {
  const partial: Partial<UnprovenTransaction> = {
    prove: vi.fn().mockResolvedValue({}) as UnprovenTransaction['prove']
  };
  return partial as UnprovenTransaction;
};

describe('httpClientProofProvider', () => {
  beforeEach(() => {
    mockedHttpClientProvingProvider.mockReset();
  });

  test('returns a ProofProvider with a proveTx method', () => {
    wireMocks();
    const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
    expect(provider).toHaveProperty('proveTx');
    expect(typeof provider.proveTx).toBe('function');
  });

  test('builds the underlying ProvingProvider exactly once at construction', () => {
    // The previous (buggy-then-fixed) implementation either built the inner
    // provider once at construction (bug — per-call timeout ignored) or
    // rebuilt it per proveTx (fix — but caused warn spam + deferred URL
    // validation). The current design builds once at construction and threads
    // the per-call timeout through wrapper closures.
    const { constructionCalls } = wireMocks();
    const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());

    expect(constructionCalls).toHaveLength(1);
    expect(constructionCalls[0]?.timeout).toBe(DEFAULT_TIMEOUT);

    // Multiple proveTx calls must not rebuild the inner provider.
    void provider;
  });

  test('preserves construction-time config.timeout in the single construction call', () => {
    const { constructionCalls } = wireMocks();
    httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
      timeout: 12345
    });

    expect(constructionCalls).toHaveLength(1);
    expect(constructionCalls[0]?.timeout).toBe(12345);
  });

  /**
   * Per-call timeout precedence tests for issue #974.
   *
   * The bug: per-call `proveTxConfig.timeout` was silently ignored because the
   * underlying httpClientProvingProvider was constructed once at provider-
   * creation time with a fixed timeout. The current fix builds the inner
   * provider once at construction (preserving eager URL validation + warn)
   * and threads the resolved per-call timeout through a wrapper closure so
   * every circuit-level check/prove inside proveTx honors it.
   */
  describe('per-call timeout precedence (issue #974)', () => {
    test('DEFAULT_TIMEOUT flows through when neither config.timeout nor proveTxConfig.timeout is set', async () => {
      const { constructionCalls, proveTimeouts, checkTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
      await provider.proveTx(stubTx());

      // construction uses DEFAULT_TIMEOUT, and the wrapper forwards it.
      expect(constructionCalls).toHaveLength(1);
      expect(constructionCalls[0]?.timeout).toBe(DEFAULT_TIMEOUT);
      // The inner prove() receives the per-call override (DEFAULT_TIMEOUT).
      expect(proveTimeouts).toEqual([DEFAULT_TIMEOUT]);
      // No check calls in this test (stub only invokes prove), so empty.
      expect(checkTimeouts).toEqual([]);
    });

    test('construction-time config.timeout flows through when proveTxConfig is omitted', async () => {
      const { constructionCalls, proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345
      });
      await provider.proveTx(stubTx());

      expect(constructionCalls).toHaveLength(1);
      expect(constructionCalls[0]?.timeout).toBe(12345);
      expect(proveTimeouts).toEqual([12345]);
    });

    test('per-call proveTxConfig.timeout takes precedence over construction-time config.timeout', async () => {
      const { constructionCalls, proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345
      });
      await provider.proveTx(stubTx(), { timeout: 99999 } satisfies ProveTxConfig);

      expect(constructionCalls).toHaveLength(1);
      expect(constructionCalls[0]?.timeout).toBe(12345);
      expect(proveTimeouts).toEqual([99999]);
    });

    test('each proveTx call threads its own resolved timeout (no fixed provider reuse of stale timeout)', async () => {
      // Two proveTx calls with different per-call timeouts. The inner provider
      // is built once at construction (so warn/validate fires once), but each
      // wrapper closure captures its own resolved timeout for the duration of
      // its proveTx.
      const { constructionCalls, proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
      await provider.proveTx(stubTx(), { timeout: 1000 });
      await provider.proveTx(stubTx(), { timeout: 2000 });

      expect(constructionCalls).toHaveLength(1);
      expect(proveTimeouts).toEqual([1000, 2000]);
    });

    test('construction-time non-timeout config fields are preserved on the single construction call', async () => {
      const { constructionCalls } = wireMocks();
      httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345,
        headers: { 'x-custom': 'kept' }
      });

      expect(constructionCalls).toHaveLength(1);
      expect(constructionCalls[0]?.timeout).toBe(12345);
      expect(constructionCalls[0]?.headers).toEqual({ 'x-custom': 'kept' });
    });
  });
});