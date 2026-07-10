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

import type { ProvingProvider, UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type ProverKey,
  type ProveTxConfig,
  type UnboundTransaction,
  type VerifierKey,
  ZKConfigProvider,
  type ZKIR
} from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { ProvingProviderConfig } from '../http-client-proving-provider';

// Mock the low-level proving-provider module so we can observe the timeout wired in at construction
// time and the per-request timeout override threaded through each check/prove during a proveTx —
// without a live proof server. The real DEFAULT_TIMEOUT is preserved so tests assert the real value.
vi.mock(import('../http-client-proving-provider'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    httpClientProvingProvider: vi.fn()
  };
});

import { httpClientProofProvider } from '../http-client-proof-provider';
import { DEFAULT_TIMEOUT, httpClientProvingProvider } from '../http-client-proving-provider';

const mockedHttpClientProvingProvider = vi.mocked(httpClientProvingProvider);

class MockZKConfigProvider extends ZKConfigProvider<'test-circuit'> {
  async getZKIR(_circuitId: 'test-circuit'): Promise<ZKIR> {
    return new Uint8Array([1, 2, 3]) as ZKIR;
  }
  async getProverKey(_circuitId: 'test-circuit'): Promise<ProverKey> {
    return new Uint8Array([4, 5, 6]) as ProverKey;
  }
  async getVerifierKey(_circuitId: 'test-circuit'): Promise<VerifierKey> {
    return new Uint8Array([7, 8, 9]) as VerifierKey;
  }
}

/**
 * Wires the mocked factory to return a stub provider whose check/prove capture the per-request
 * timeout override each call receives, so tests can assert:
 *   - `constructionConfigs`: the config each construction call receives (expected: exactly one)
 *   - `proveTimeouts` / `checkTimeouts`: the override threaded through each prove/check call
 */
function wireMocks(): {
  urls: unknown[];
  zkConfigProviders: unknown[];
  constructionConfigs: ProvingProviderConfig[];
  proveTimeouts: (number | undefined)[];
  checkTimeouts: (number | undefined)[];
} {
  const urls: unknown[] = [];
  const zkConfigProviders: unknown[] = [];
  const constructionConfigs: ProvingProviderConfig[] = [];
  const proveTimeouts: (number | undefined)[] = [];
  const checkTimeouts: (number | undefined)[] = [];

  mockedHttpClientProvingProvider.mockImplementation((url, zkConfigProvider, config) => {
    urls.push(url);
    zkConfigProviders.push(zkConfigProvider);
    constructionConfigs.push(config ?? {});
    return {
      check: async (_preimage, _keyLocation, overrideTimeout) => {
        checkTimeouts.push(overrideTimeout);
        return [undefined];
      },
      prove: async (_preimage, _keyLocation, _overwriteBindingInput, overrideTimeout) => {
        proveTimeouts.push(overrideTimeout);
        return new Uint8Array();
      },
      lookupKey: async (_keyLocation) => undefined
    };
  });

  return { urls, zkConfigProviders, constructionConfigs, proveTimeouts, checkTimeouts };
}

/**
 * Minimal typed transaction stub. `httpClientProofProvider` invokes `prove(provingProvider, ...)`,
 * so the stub drives that provider once — exactly as the real `UnprovenTransaction.prove` would —
 * to let the per-call timeout thread through to the underlying provider. `Partial<UnprovenTransaction>`
 * documents that only `prove` is exercised, keeping the single cast contained here.
 */
const stubTx = (): UnprovenTransaction => {
  const partial: Partial<UnprovenTransaction> = {
    prove: vi.fn(async (provingProvider: ProvingProvider) => {
      await provingProvider.prove(new Uint8Array(), 'test-circuit');
      return {} as UnboundTransaction;
    }) as UnprovenTransaction['prove']
  };
  return partial as UnprovenTransaction;
};

describe('httpClientProofProvider', () => {
  beforeEach(() => {
    mockedHttpClientProvingProvider.mockReset();
  });

  test('returns a ProofProvider exposing a proveTx method', () => {
    wireMocks();
    const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
    expect(typeof provider.proveTx).toBe('function');
  });

  test('builds the underlying ProvingProvider exactly once at construction', () => {
    const { constructionConfigs } = wireMocks();
    httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
    expect(constructionConfigs).toHaveLength(1);
  });

  describe('per-call timeout precedence (issue #974)', () => {
    test('threads DEFAULT_TIMEOUT when neither config.timeout nor proveTxConfig.timeout is set', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
      await provider.proveTx(stubTx());
      expect(proveTimeouts).toEqual([DEFAULT_TIMEOUT]);
    });

    test('threads construction-time config.timeout when proveTxConfig is omitted', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345
      });
      await provider.proveTx(stubTx());
      expect(proveTimeouts).toEqual([12345]);
    });

    test('per-call proveTxConfig.timeout takes precedence over construction-time config.timeout', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345
      });
      await provider.proveTx(stubTx(), { timeout: 99999 } satisfies ProveTxConfig);
      expect(proveTimeouts).toEqual([99999]);
    });

    test('each proveTx call threads its own resolved timeout without rebuilding the provider', async () => {
      const { constructionConfigs, proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
      await provider.proveTx(stubTx(), { timeout: 1000 });
      await provider.proveTx(stubTx(), { timeout: 2000 });
      expect(constructionConfigs).toHaveLength(1);
      expect(proveTimeouts).toEqual([1000, 2000]);
    });
  });

  test('preserves non-timeout construction-time config fields on the single construction call', () => {
    const { constructionConfigs } = wireMocks();
    httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
      timeout: 12345,
      headers: { 'x-custom': 'kept' }
    });
    expect(constructionConfigs).toEqual([{ timeout: 12345, headers: { 'x-custom': 'kept' } }]);
  });

  describe('object-options form (flattened config)', () => {
    test('passes url and zkConfigProvider from options to the underlying ProvingProvider', () => {
      const { urls, zkConfigProviders } = wireMocks();
      const zkConfigProvider = new MockZKConfigProvider();
      httpClientProofProvider({ url: 'http://localhost:8080', zkConfigProvider });
      expect(urls).toEqual(['http://localhost:8080']);
      expect(zkConfigProviders).toEqual([zkConfigProvider]);
    });

    test('flattens timeout and other config fields from options onto the construction config', () => {
      const { constructionConfigs } = wireMocks();
      httpClientProofProvider({
        url: 'http://localhost:8080',
        zkConfigProvider: new MockZKConfigProvider(),
        timeout: 12345,
        headers: { 'x-custom': 'kept' }
      });
      expect(constructionConfigs).toEqual([{ timeout: 12345, headers: { 'x-custom': 'kept' } }]);
    });

    test('threads the flattened options timeout to prove when proveTxConfig is omitted', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider({
        url: 'http://localhost:8080',
        zkConfigProvider: new MockZKConfigProvider(),
        timeout: 777
      });
      await provider.proveTx(stubTx());
      expect(proveTimeouts).toEqual([777]);
    });

    test('per-call proveTxConfig.timeout still overrides the flattened options timeout', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider({
        url: 'http://localhost:8080',
        zkConfigProvider: new MockZKConfigProvider(),
        timeout: 777
      });
      await provider.proveTx(stubTx(), { timeout: 99999 } satisfies ProveTxConfig);
      expect(proveTimeouts).toEqual([99999]);
    });
  });
});
