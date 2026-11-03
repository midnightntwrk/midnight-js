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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { ConfigurationError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { CostModel, type ProvingProvider, Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import {
  InvalidTransactionHandleError,
  type Ledger9UnboundTransaction,
  LedgerTransaction,
  type ProverKey,
  type ProveTxConfig,
  type UnprovenTx,
  type VerifierKey,
  ZKConfigProvider,
  type ZKIR
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

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

/**
 * The `namespace:type-descriptor:` tag a serialized transaction opens with,
 * read as a raw prefix. Never `parseSerializedTag`: that parser scans only the
 * first 64 bytes for its second colon, and transaction tags run past that.
 */
const txTag = (bytes: Uint8Array): string => {
  const head = Buffer.from(bytes.subarray(0, 96)).toString('latin1');
  const end = head.indexOf('):');
  // Without this, a vendor bump that pushed the terminator past 96 bytes would
  // make `indexOf` return -1, collapse every tag to 'm', and let the assertions
  // that use this pass while comparing nothing.
  if (end === -1) {
    throw new Error(`No transaction tag terminator within the first 96 bytes of a ${bytes.byteLength}-byte payload.`);
  }
  return head.slice(0, end + 2);
};

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

const inertProvingProvider: ProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array()),
  lookupKey: () => Promise.resolve(undefined)
};

const unprovenLedger9Handle = (): UnprovenTx => LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts('undeployed'));

/**
 * Makes every v9 `prove` drive the proving provider it is handed once, as a
 * transaction with a call would, and answer `proven`. An empty transaction
 * drives no circuit, so without this the per-call timeout would never reach
 * the underlying provider.
 */
const proveThroughProvider = (proven: Ledger9UnboundTransaction): void => {
  vi.spyOn(Transaction.prototype, 'prove').mockImplementation(async (provingProvider: ProvingProvider) => {
    await provingProvider.prove(new Uint8Array(), 'test-circuit');
    return proven;
  });
};

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

describe('httpClientProofProvider', () => {
  let provenLedger9Tx: Ledger9UnboundTransaction;

  beforeAll(async () => {
    provenLedger9Tx = await Transaction.fromParts('undeployed').prove(inertProvingProvider, CostModel.initialCostModel());
  });

  beforeEach(() => {
    mockedHttpClientProvingProvider.mockReset();
    proveThroughProvider(provenLedger9Tx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns a ProofProvider exposing a proveTx method', () => {
    wireMocks();
    const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
    expect(typeof provider.proveTx).toBe('function');
  });

  // Set equality rather than `toContain`: this provider serves both eras, and
  // an era silently dropped from the declaration would have a retained-era
  // operation refused before it started -- which `toContain` would not catch.
  test('declares both eras, matching the two handlers it is built from', () => {
    wireMocks();
    const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
    expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
  });

  test('builds the underlying ProvingProvider exactly once at construction', () => {
    const { constructionConfigs } = wireMocks();
    httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
    expect(constructionConfigs).toHaveLength(1);
  });

  test('rejects the positional overload without a zkConfigProvider with a ConfigurationError', () => {
    // @ts-expect-error the positional overload types the provider as required; JS callers can omit it
    const act = (): unknown => httpClientProofProvider('http://localhost:8080');

    expect(act).toThrow(ConfigurationError);
    expect(act).toThrow('zkConfigProvider is required when calling the positional httpClientProofProvider overload');
    expect(act).toThrow(expect.objectContaining({ code: 'MIDNIGHT_JS_G_CONFIGURATION_MISSING' }));
  });

  describe('v8 handle', () => {
    let unprovenLedger8Handle: () => Promise<UnprovenTx>;
    let circuitDrivingLedger8Handle: () => Promise<UnprovenTx>;

    beforeAll(async () => {
      const v8 = await loadLedger8Protocol();
      unprovenLedger8Handle = async () => LedgerTransaction.seal('v8', 'Unproven', v8.Transaction.fromParts('undeployed'));

      // Carries one Zswap output, so proving it actually drives the proving
      // provider. The empty transaction above does not: it has nothing to
      // prove, which is why it cannot show which provider was handed over.
      const rawTokenType = v8.sampleRawTokenType();
      const output = v8.ZswapOutput.new(
        v8.createShieldedCoinInfo(rawTokenType, 100n),
        1,
        v8.sampleCoinPublicKey(),
        v8.sampleEncryptionPublicKey()
      );
      circuitDrivingLedger8Handle = async () =>
        LedgerTransaction.seal(
          'v8',
          'Unproven',
          v8.Transaction.fromParts('undeployed', v8.ZswapOffer.fromOutput(output, rawTokenType, 100n))
        );
    });

    test('proves a v8 handle through the v8 runtime and answers an unbound v8 handle', async () => {
      wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
      const unproven = await unprovenLedger8Handle();

      const result = await provider.proveTx(unproven);

      expect([result.era, result.stage]).toEqual(['v8', 'Unbound']);
      // Proven, not merely round-tripped: the stage marker in the tag moves
      // from `proof-preimage` to `proof` only when the transaction was proved.
      // Derived from the input's own tag rather than spelled out; the literal
      // itself is pinned once, in the protocol package's own suites.
      const expectedTag = txTag(unproven.serialize()).replace('proof-preimage', 'proof');
      // Without this, a vendor rename of the stage marker would make `replace`
      // a no-op and invert the assertion below into "the same bytes came back".
      expect(expectedTag).not.toBe(txTag(unproven.serialize()));
      expect(txTag(result.serialize())).toBe(expectedTag);
    });

    test('drives the v8 runtime through the PER-CALL proving provider', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 1234
      });

      // The mocked circuit prover answers with bytes that are not a proof, so
      // the v8 runtime rejects afterwards. That is beside the point: what this
      // measures is which provider it was handed. Hand over the construction-time
      // provider instead and the recorded override becomes `undefined`.
      await provider.proveTx(await circuitDrivingLedger8Handle(), { timeout: 4321 }).catch(() => undefined);

      expect(proveTimeouts).toEqual([4321]);
    });
  });

  test.each([
    ['the pre-handle version-tagged payload', () => ({ version: 'v9', tx: Transaction.fromParts('undeployed') })],
    ['a raw ledger transaction', () => Transaction.fromParts('undeployed')],
    ['null', () => null]
  ])('refuses %s as not a handle, before any proving', async (_label, value) => {
    const { proveTimeouts } = wireMocks();
    const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());

    // @ts-expect-error the value is not a transaction handle
    const rejection = await rejectionOf(provider.proveTx(value()));

    expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
    expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
    expect(rejection).toMatchObject({ method: 'proveTx', reason: 'not-a-handle' });
    expect(proveTimeouts).toEqual([]);
  });

  describe('the returned v9 handle', () => {
    test('is an unbound v9 handle', async () => {
      wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());

      const result = await provider.proveTx(unprovenLedger9Handle());

      expect([result.era, result.stage]).toEqual(['v9', 'Unbound']);
    });

    test('carries the proved transaction itself, not a copy of it', async () => {
      wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());

      const result = await provider.proveTx(unprovenLedger9Handle());

      expect(LedgerTransaction.unwrap(result, 'v9')).toBe(provenLedger9Tx);
    });
  });

  describe('per-call timeout precedence (issue #974)', () => {
    test('threads DEFAULT_TIMEOUT when neither config.timeout nor proveTxConfig.timeout is set', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
      await provider.proveTx(unprovenLedger9Handle());
      expect(proveTimeouts).toEqual([DEFAULT_TIMEOUT]);
    });

    test('threads construction-time config.timeout when proveTxConfig is omitted', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345
      });
      await provider.proveTx(unprovenLedger9Handle());
      expect(proveTimeouts).toEqual([12345]);
    });

    test('per-call proveTxConfig.timeout takes precedence over construction-time config.timeout', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider(), {
        timeout: 12345
      });
      await provider.proveTx(unprovenLedger9Handle(), { timeout: 99999 } satisfies ProveTxConfig);
      expect(proveTimeouts).toEqual([99999]);
    });

    test('each proveTx call threads its own resolved timeout without rebuilding the provider', async () => {
      const { constructionConfigs, proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider('http://localhost:8080', new MockZKConfigProvider());
      await provider.proveTx(unprovenLedger9Handle(), { timeout: 1000 });
      await provider.proveTx(unprovenLedger9Handle(), { timeout: 2000 });
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
      await provider.proveTx(unprovenLedger9Handle());
      expect(proveTimeouts).toEqual([777]);
    });

    test('per-call proveTxConfig.timeout still overrides the flattened options timeout', async () => {
      const { proveTimeouts } = wireMocks();
      const provider = httpClientProofProvider({
        url: 'http://localhost:8080',
        zkConfigProvider: new MockZKConfigProvider(),
        timeout: 777
      });
      await provider.proveTx(unprovenLedger9Handle(), { timeout: 99999 } satisfies ProveTxConfig);
      expect(proveTimeouts).toEqual([99999]);
    });
  });
});
