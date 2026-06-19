/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
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
// what `timeout` value is wired through for each proveTx call, without
// requiring a live proof server.
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
 * Captures the `timeout` field of the ProvingProviderConfig each time
 * httpClientProvingProvider is invoked, and returns a stub ProvingProvider
 * whose prove() no-ops. Lets us assert on what was wired through without
 * exercising real ZK proving.
 */
function trackInvocations(): { getCalls: () => (ProvingProviderConfig | undefined)[] } {
  const calls: (ProvingProviderConfig | undefined)[] = [];
  mockedHttpClientProvingProvider.mockImplementation(
    (_url: string, _zk: ZKConfigProvider<string>, cfg?: ProvingProviderConfig) => {
      calls.push(cfg);
      return {
        check: async () => ({ status: 'accepted' }),
        prove: async () => ({}) as never
      };
    }
  );
  return { getCalls: () => calls };
}

const stubTx = {
  prove: async () => ({}) as never
} as unknown as UnprovenTransaction;

describe('httpClientProofProvider', () => {
  beforeEach(() => {
    mockedHttpClientProvingProvider.mockReset();
  });

  test('returns a ProofProvider with a proveTx method', () => {
    const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
    expect(provider).toHaveProperty('proveTx');
    expect(typeof provider.proveTx).toBe('function');
  });

  /**
   * Per-call timeout precedence tests for issue #974.
   *
   * The bug: per-call `proveTxConfig.timeout` was silently ignored because the
   * underlying httpClientProvingProvider was constructed once at provider-
   * creation time with a fixed timeout. The fix builds the underlying
   * provider per call so the per-call timeout is honored.
   */
  describe('per-call timeout precedence (issue #974)', () => {
    test('uses DEFAULT_TIMEOUT when neither config.timeout nor proveTxConfig.timeout is provided', async () => {
      const { getCalls } = trackInvocations();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
      await provider.proveTx(stubTx);

      const calls = getCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0]?.timeout).toBe(DEFAULT_TIMEOUT);
    });

    test('uses construction-time config.timeout when proveTxConfig is omitted', async () => {
      const { getCalls } = trackInvocations();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345
      });
      await provider.proveTx(stubTx);

      const calls = getCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0]?.timeout).toBe(12345);
    });

    test('per-call proveTxConfig.timeout takes precedence over construction-time config.timeout', async () => {
      const { getCalls } = trackInvocations();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345
      });
      await provider.proveTx(stubTx, { timeout: 99999 } satisfies ProveTxConfig);

      const calls = getCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0]?.timeout).toBe(99999);
    });

    test('construction-time non-timeout config fields are preserved on the per-call provider', async () => {
      const { getCalls } = trackInvocations();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345,
        headers: { 'x-custom': 'kept' }
      });
      await provider.proveTx(stubTx, { timeout: 99999 });

      const calls = getCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0]?.timeout).toBe(99999);
      expect(calls[0]?.headers).toEqual({ 'x-custom': 'kept' });
    });

    test('each proveTx call builds its own ProvingProvider (no fixed provider reuse)', async () => {
      // The previous (buggy) implementation built the underlying provider once
      // at construction time and reused it. With the fix, each call should
      // invoke httpClientProvingProvider afresh so the per-call config is
      // actually honored.
      const { getCalls } = trackInvocations();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
      await provider.proveTx(stubTx, { timeout: 1000 });
      await provider.proveTx(stubTx, { timeout: 2000 });

      const calls = getCalls();
      expect(calls).toHaveLength(2);
      expect(calls[0]?.timeout).toBe(1000);
      expect(calls[1]?.timeout).toBe(2000);
    });
  });
});
