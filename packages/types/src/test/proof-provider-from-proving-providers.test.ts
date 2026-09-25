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

import { loadLedger8 } from '@midnight-ntwrk/midnight-js-protocol';
import { CostModel, type ProvingProvider, type UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ProvingProvider as RetainedEraProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PROVIDER_ERROR_CODES, V8PayloadUnsupportedError } from '../errors';
import { createProofProviderFromProvingProviders, type UnboundTransaction } from '../proof-provider';

const PROVING_REFUSED = 'proving refused';

/**
 * Records which of its members the ledger consulted, then refuses. Refusing is
 * what makes the record readable: a case that asserts WHICH provider was driven
 * does not need a proof back, and a stub that answered would have to fake one.
 */
const recordingProvingProvider = (consulted: string[], label: string): ProvingProvider => ({
  check: (_preimage, keyLocation) => {
    consulted.push(`${label}:check:${keyLocation}`);
    return Promise.reject(new Error(PROVING_REFUSED));
  },
  prove: (_preimage, keyLocation) => {
    consulted.push(`${label}:prove:${keyLocation}`);
    return Promise.reject(new Error(PROVING_REFUSED));
  },
  lookupKey: () => Promise.resolve(undefined)
});

/**
 * Answers, but is never expected to be consulted: the empty transactions proved
 * here carry no contract calls, so the ledger drives no circuits. It returns
 * bytes that are NOT a proof, so a case that unexpectedly reached it fails
 * rather than passes quietly.
 */
const inertProvingProvider: ProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array()),
  lookupKey: () => Promise.resolve(undefined)
};

const createStubUnboundTx = (): UnboundTransaction => {
  const partial: Partial<UnboundTransaction> = { bindingRandomness: 42n };
  return partial as UnboundTransaction;
};

const createStubUnprovenTx = (provenAs: UnboundTransaction): UnprovenTransaction => {
  const partial: Partial<UnprovenTransaction> = {
    prove: vi.fn().mockResolvedValue(provenAs) as UnprovenTransaction['prove']
  };
  return partial as UnprovenTransaction;
};

const partialCostModel: Partial<CostModel> = { toString: () => 'stub-cost-model' };
const stubCostModel = partialCostModel as CostModel;

describe('createProofProviderFromProvingProviders', () => {
  let retainedEraTxBytes: Uint8Array;
  let circuitDrivingTxBytes: Uint8Array;

  beforeAll(async () => {
    const v8 = await loadLedger8();
    retainedEraTxBytes = v8.Transaction.fromParts('undeployed').serialize();

    // Carries one Zswap output, so proving it actually drives the proving
    // provider. The empty transaction above does not: it has nothing to prove,
    // which is why it cannot show which provider was handed over.
    const rawTokenType = v8.sampleRawTokenType();
    const output = v8.ZswapOutput.new(
      v8.createShieldedCoinInfo(rawTokenType, 100n),
      1,
      v8.sampleCoinPublicKey(),
      v8.sampleEncryptionPublicKey()
    );
    circuitDrivingTxBytes = v8.Transaction.fromParts(
      'undeployed',
      v8.ZswapOffer.fromOutput(output, rawTokenType, 100n)
    ).serialize();
  });

  describe('built with a current-era proving provider only', () => {
    it('proves a v9 payload with that provider and the cost model it was given', async () => {
      const unboundTx = createStubUnboundTx();
      const unprovenTx = createStubUnprovenTx(unboundTx);
      const provider = createProofProviderFromProvingProviders({
        currentEra: inertProvingProvider,
        costModel: stubCostModel
      });

      const result = await provider.proveTx({ version: 'v9', tx: unprovenTx });

      expect(unprovenTx.prove).toHaveBeenCalledWith(inertProvingProvider, stubCostModel);
      expect(result.version).toBe('v9');
      expect(result.version === 'v9' && result.tx).toBe(unboundTx);
    });

    it('proves with the initial cost model when none is given', async () => {
      const unprovenTx = createStubUnprovenTx(createStubUnboundTx());
      const provider = createProofProviderFromProvingProviders({ currentEra: inertProvingProvider });

      await provider.proveTx({ version: 'v9', tx: unprovenTx });

      expect(unprovenTx.prove).toHaveBeenCalledWith(inertProvingProvider, expect.any(CostModel));
    });

    it('declares exactly the current era', () => {
      const provider = createProofProviderFromProvingProviders({ currentEra: inertProvingProvider });

      expect([...provider.supportedEras].sort()).toEqual(['v9']);
    });

    it('refuses a v8 payload with its stable unsupported-payload code', async () => {
      const provider = createProofProviderFromProvingProviders({ currentEra: inertProvingProvider });

      const rejection = await provider.proveTx({ version: 'v8', txBytes: retainedEraTxBytes }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
      expect((rejection as V8PayloadUnsupportedError).code).toBe(PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED);
      expect((rejection as V8PayloadUnsupportedError).seam).toBe('proveTx');
    });
  });

  describe('built with a proving provider per era', () => {
    it('declares both eras, derived from the providers supplied', () => {
      const provider = createProofProviderFromProvingProviders({
        currentEra: inertProvingProvider,
        retainedEras: { v8: inertProvingProvider }
      });

      expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
    });

    // A consumer wiring the retained arm behind a condition writes
    // `{ v8: crossesFork ? retainedEraProver : undefined }`. An absent provider
    // must leave the era unserved, rather than build an arm that reaches the
    // retained runtime with nothing to prove with.
    it('leaves an era unserved when its provider is absent, refusing that arm', async () => {
      const provider = createProofProviderFromProvingProviders({
        currentEra: inertProvingProvider,
        retainedEras: { v8: undefined }
      });

      expect([...provider.supportedEras].sort()).toEqual(['v9']);

      const rejection = await provider.proveTx({ version: 'v8', txBytes: retainedEraTxBytes }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
    });

    it('answers the v8 arm with the PROVEN serialization of the transaction', async () => {
      const provider = createProofProviderFromProvingProviders({
        currentEra: inertProvingProvider,
        retainedEras: { v8: inertProvingProvider }
      });

      const result = await provider.proveTx({ version: 'v8', txBytes: retainedEraTxBytes });

      // A caller narrows this record and rejects the other era, so answering in
      // the wrong arm strands a submit mid-flight. Assert the arm first.
      expect(result.version).toBe('v8');
      const returned = result.version === 'v8' ? result.txBytes : new Uint8Array();
      expect(returned).toBeInstanceOf(Uint8Array);
      expect(returned).not.toEqual(retainedEraTxBytes);
    });

    // The reason this factory exists: the two eras need different key material,
    // and pairing one era's transaction with the other era's prover yields a
    // proof the node rejects at submit, after the proving was paid for. These
    // two cases are what stands between a consumer and that failure.
    it('drives the retained-era provider for a v8 payload, never the current-era one', async () => {
      const consulted: string[] = [];
      const provider = createProofProviderFromProvingProviders({
        currentEra: recordingProvingProvider(consulted, 'currentEra'),
        retainedEras: { v8: recordingProvingProvider(consulted, 'v8') }
      });

      const rejection = await provider.proveTx({ version: 'v8', txBytes: circuitDrivingTxBytes }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(consulted, `proveTx rejected with: ${String(rejection)}`).toEqual(['v8:prove:midnight/zswap/output']);
    });

    it('drives the current-era provider for a v9 payload, never the retained-era one', async () => {
      const consulted: string[] = [];
      const currentEraProvingProvider = recordingProvingProvider(consulted, 'currentEra');
      const retainedEraProvider = recordingProvingProvider(consulted, 'v8');
      const unprovenTx = createStubUnprovenTx(createStubUnboundTx());
      const provider = createProofProviderFromProvingProviders({
        currentEra: currentEraProvingProvider,
        retainedEras: { v8: retainedEraProvider }
      });

      await provider.proveTx({ version: 'v9', tx: unprovenTx });

      // The current-era transaction takes the provider as an argument rather
      // than being driven through it here, so the identity of what was handed
      // over is the claim -- and that nothing reached the retained-era one.
      expect(unprovenTx.prove).toHaveBeenCalledWith(currentEraProvingProvider, expect.any(CostModel));
      expect(consulted).toEqual([]);
    });

    // `asV8ProvingProvider()` returns the retained runtime's own shape, which
    // declares no `lookupKey`. Registering it must not need a cast.
    it('accepts a retained-era provider that declares no lookupKey', async () => {
      const consulted: string[] = [];
      const retainedEraProvider: RetainedEraProvingProvider = {
        check: (_preimage, keyLocation) => {
          consulted.push(`check:${keyLocation}`);
          return Promise.reject(new Error(PROVING_REFUSED));
        },
        prove: (_preimage, keyLocation) => {
          consulted.push(`prove:${keyLocation}`);
          return Promise.reject(new Error(PROVING_REFUSED));
        }
      };
      const provider = createProofProviderFromProvingProviders({
        currentEra: inertProvingProvider,
        retainedEras: { v8: retainedEraProvider }
      });

      const rejection = await provider.proveTx({ version: 'v8', txBytes: circuitDrivingTxBytes }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(consulted, `proveTx rejected with: ${String(rejection)}`).toEqual(['prove:midnight/zswap/output']);
    });
  });
});
