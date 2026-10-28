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
import { COMMON_ERROR_CODES } from '@midnight-ntwrk/midnight-js-protocol/errors';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ProvingProvider as Ledger8ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PROVIDER_ERROR_CODES, ProviderEraUnsupportedError } from '../errors';
import { LedgerTransaction, type UnprovenTx } from '../ledger-transaction';
import { createProofProviderFromProvingProviders } from '../proof-provider';
import { handles, inertLedger8ProvingProvider, inertProvingProvider } from './ledger-transaction-fixtures';

const NETWORK_ID = 'undeployed';
const PROVING_REFUSED = 'proving refused';

const timeoutRefusal = expect.objectContaining({
  name: 'InvalidArgumentError',
  code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
  message: expect.stringContaining('proveTxConfig.timeout')
});

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

/**
 * Records which of its members the ledger consulted, then refuses. Refusing is
 * what makes the record readable: a case that asserts WHICH provider was driven
 * does not need a proof back, and a stub that answered would have to fake one.
 */
const recordingLedger8Provider = (consulted: string[], label: string): Ledger8ProvingProvider => ({
  check: (_preimage, keyLocation) => {
    consulted.push(`${label}:check:${keyLocation}`);
    return Promise.reject(new Error(PROVING_REFUSED));
  },
  prove: (_preimage, keyLocation) => {
    consulted.push(`${label}:prove:${keyLocation}`);
    return Promise.reject(new Error(PROVING_REFUSED));
  }
});

const recordingProvider = (consulted: string[], label: string): ledger.ProvingProvider => ({
  ...recordingLedger8Provider(consulted, label),
  lookupKey: () => Promise.resolve(undefined)
});

const revokedProxy = (): object => {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  return proxy;
};

/**
 * Unproven handles that carry one Zswap output, so proving them drives the
 * proving provider. An empty transaction has nothing to prove, so it cannot
 * show which provider was handed over.
 */
const circuitDriving = {
  v8: async (): Promise<UnprovenTx> => {
    const v8 = await loadLedger8Protocol();
    const rawTokenType = v8.sampleRawTokenType();
    const output = v8.ZswapOutput.new(
      v8.createShieldedCoinInfo(rawTokenType, 100n),
      1,
      v8.sampleCoinPublicKey(),
      v8.sampleEncryptionPublicKey()
    );
    return LedgerTransaction.seal(
      'v8',
      'Unproven',
      v8.Transaction.fromParts(NETWORK_ID, v8.ZswapOffer.fromOutput(output, rawTokenType, 100n))
    );
  },
  v9: (): UnprovenTx => {
    const rawTokenType = ledger.sampleRawTokenType();
    const output = ledger.ZswapOutput.new(
      ledger.createShieldedCoinInfo(rawTokenType, 100n),
      1,
      ledger.sampleCoinPublicKey(),
      ledger.sampleEncryptionPublicKey()
    );
    return LedgerTransaction.seal(
      'v9',
      'Unproven',
      ledger.Transaction.fromParts(NETWORK_ID, ledger.ZswapOffer.fromOutput(output, rawTokenType, 100n))
    );
  }
};

describe('createProofProviderFromProvingProviders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('supportedEras', () => {
    it('declares only v9 when the v8 proving provider is undefined', () => {
      const provider = createProofProviderFromProvingProviders({ v8: undefined, v9: inertProvingProvider });

      expect(provider.supportedEras).toEqual(['v9']);
    });

    it('declares both eras when both proving providers are given', () => {
      const provider = createProofProviderFromProvingProviders({ v8: inertLedger8ProvingProvider, v9: inertProvingProvider });

      expect(provider.supportedEras).toEqual(['v8', 'v9']);
    });

    it('declares only v8 when the v9 proving provider is undefined', () => {
      const provider = createProofProviderFromProvingProviders({ v8: inertLedger8ProvingProvider, v9: undefined });

      expect(provider.supportedEras).toEqual(['v8']);
    });
  });

  describe('proving', () => {
    it('proves a v9 handle with the v9 proving provider and the cost model it was given', async () => {
      const prove = vi.spyOn(ledger.Transaction.prototype, 'prove');
      const costModel = ledger.CostModel.initialCostModel();
      const provider = createProofProviderFromProvingProviders({
        v8: inertLedger8ProvingProvider,
        v9: inertProvingProvider,
        costModel
      });

      const result = await provider.proveTx(handles.v9.Unproven());

      expect(prove).toHaveBeenCalledWith(inertProvingProvider, costModel);
      expect([result.era, result.stage]).toEqual(['v9', 'Unbound']);
    });

    it('defaults to the initial cost model when none is given', async () => {
      const prove = vi.spyOn(ledger.Transaction.prototype, 'prove');
      const provider = createProofProviderFromProvingProviders({ v8: undefined, v9: inertProvingProvider });

      await provider.proveTx(handles.v9.Unproven());

      expect(prove).toHaveBeenCalledWith(inertProvingProvider, expect.any(ledger.CostModel));
    });

    it('answers a v8 handle with an unbound v8 handle whose serialization is proven', async () => {
      const provider = createProofProviderFromProvingProviders({ v8: inertLedger8ProvingProvider, v9: inertProvingProvider });
      const unproven = await handles.v8.Unproven();

      const result = await provider.proveTx(unproven);

      expect([result.era, result.stage]).toEqual(['v8', 'Unbound']);
      expect(result.serialize()).not.toEqual(unproven.serialize());
    });

    // The reason this factory exists: each era's transaction must be proved
    // with the provider built for that era.
    it('drives the v8 proving provider for a v8 handle, never the v9 one', async () => {
      const consulted: string[] = [];
      const provider = createProofProviderFromProvingProviders({
        v8: recordingLedger8Provider(consulted, 'v8'),
        v9: recordingProvider(consulted, 'v9')
      });

      const rejection = await rejectionOf(provider.proveTx(await circuitDriving.v8()));

      expect(consulted, `proveTx rejected with: ${String(rejection)}`).toEqual(['v8:prove:midnight/zswap/output']);
    });

    it('drives the v9 proving provider for a v9 handle, never the v8 one', async () => {
      const consulted: string[] = [];
      const provider = createProofProviderFromProvingProviders({
        v8: recordingLedger8Provider(consulted, 'v8'),
        v9: recordingProvider(consulted, 'v9')
      });

      const rejection = await rejectionOf(provider.proveTx(circuitDriving.v9()));

      expect(consulted.length, `proveTx rejected with: ${String(rejection)}`).toBeGreaterThan(0);
      expect(consulted.filter((entry) => !entry.startsWith('v9:'))).toEqual([]);
    });

    it('accepts a v8 proving provider whose methods live on its prototype, and drives it', async () => {
      const consulted: string[] = [];
      class PrototypeProvingProvider implements Ledger8ProvingProvider {
        check(): Promise<(bigint | undefined)[]> {
          consulted.push('check');
          return Promise.reject(new Error(PROVING_REFUSED));
        }
        prove(): Promise<Uint8Array> {
          consulted.push('prove');
          return Promise.reject(new Error(PROVING_REFUSED));
        }
      }
      const provider = createProofProviderFromProvingProviders({ v8: new PrototypeProvingProvider(), v9: inertProvingProvider });

      const rejection = await rejectionOf(provider.proveTx(await circuitDriving.v8()));

      expect(provider.supportedEras).toEqual(['v8', 'v9']);
      expect(consulted, `proveTx rejected with: ${String(rejection)}`).toEqual(['prove']);
    });

    it.each<['v8' | 'v9', () => Promise<UnprovenTx>]>([
      ['v8', () => circuitDriving.v8()],
      ['v9', () => Promise.resolve(circuitDriving.v9())]
    ])('propagates a %s proving failure to the caller', async (_era, handle) => {
      const provider = createProofProviderFromProvingProviders({
        v8: recordingLedger8Provider([], 'v8'),
        v9: recordingProvider([], 'v9')
      });

      await expect(provider.proveTx(await handle())).rejects.toThrow(PROVING_REFUSED);
    });

    it('refuses a v8 handle when no v8 proving provider was given', async () => {
      const provider = createProofProviderFromProvingProviders({ v8: undefined, v9: inertProvingProvider });

      const rejection = await rejectionOf(provider.proveTx(await handles.v8.Unproven(), { timeout: 5_000 }));

      expect(rejection).toBeInstanceOf(ProviderEraUnsupportedError);
      expect(rejection).toMatchObject({ code: PROVIDER_ERROR_CODES.PROVIDER_ERA_UNSUPPORTED, era: 'v8', declared: ['v9'] });
    });
  });

  describe('proveTxConfig.timeout', () => {
    it.each([
      ['v8', 'a timeout', 5_000],
      ['v8', 'a zero timeout', 0],
      ['v9', 'a timeout', 5_000],
      ['v9', 'a zero timeout', 0]
    ] as const)('refuses a %s proof with %s before proving starts', async (era, _label, timeout) => {
      const consulted: string[] = [];
      const provider = createProofProviderFromProvingProviders({
        v8: recordingLedger8Provider(consulted, 'v8'),
        v9: recordingProvider(consulted, 'v9')
      });
      const handle = era === 'v8' ? await circuitDriving.v8() : circuitDriving.v9();

      await expect(provider.proveTx(handle, { timeout })).rejects.toThrow(timeoutRefusal);
      expect(consulted).toEqual([]);
    });

    it.each([
      ['v8', 'carries no timeout', {}],
      ['v8', 'has the timeout key present but undefined', { timeout: undefined }],
      ['v9', 'carries no timeout', {}],
      ['v9', 'has the timeout key present but undefined', { timeout: undefined }]
    ] as const)('proves a %s transaction when the config %s', async (era, _label, config) => {
      const provider = createProofProviderFromProvingProviders({ v8: inertLedger8ProvingProvider, v9: inertProvingProvider });
      const handle = era === 'v8' ? await handles.v8.Unproven() : handles.v9.Unproven();

      const result = await provider.proveTx(handle, config);

      expect([result.era, result.stage]).toEqual([era, 'Unbound']);
    });
  });

  describe('construction', () => {
    it.each([
      ['null', null, 'null'],
      ['an empty object', {}, "an object without callable 'check' and 'prove'"],
      ['an object missing prove', { check: () => Promise.resolve([]) }, "an object without callable 'prove'"],
      ['an object missing check', { prove: () => Promise.resolve(new Uint8Array()) }, "an object without callable 'check'"],
      ['an object with non-callable prove', { check: () => Promise.resolve([]), prove: 'not-a-function' }, "an object without callable 'prove'"],
      ['an object with non-callable check', { check: 'not-a-function', prove: () => Promise.resolve(new Uint8Array()) }, "an object without callable 'check'"],
      ['a class instance missing prove', new (class Prover { check(): Promise<never[]> { return Promise.resolve([]); } })(), "an instance of Prover without callable 'prove'"],
      ['a revoked proxy', revokedProxy(), 'an object'],
      ['a function', () => inertLedger8ProvingProvider, 'a function'],
      ['a string', 'not-a-provider', 'a string'],
      ['a number', 42, 'a number'],
      ['an array', [inertLedger8ProvingProvider], 'an array']
    ])('refuses %s as an era proving provider', (_label, value, received) => {
      const errors = (['v8', 'v9'] as const).map((era) => {
        try {
          createProofProviderFromProvingProviders({ v8: undefined, v9: undefined, [era]: value });
        } catch (error: unknown) {
          return error;
        }
        return undefined;
      });

      expect(errors).toEqual(
        (['v8', 'v9'] as const).map((era) =>
          expect.objectContaining({
            name: 'UnusableEraEntryError',
            code: PROVIDER_ERROR_CODES.UNUSABLE_ERA_ENTRY,
            method: 'proveTx',
            era,
            expected: 'proving-provider',
            received
          })
        )
      );
    });

    it.each([
      ['v8', { v9: inertProvingProvider }],
      ['v9', { v8: inertLedger8ProvingProvider }]
    ])('refuses proving providers without a %s key', (missing, provingProviders) => {
      // @ts-expect-error an era key is missing
      const act = () => createProofProviderFromProvingProviders(provingProviders);

      expect(act).toThrow(
        expect.objectContaining({
          name: 'InvalidArgumentError',
          code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
          message: expect.stringContaining(`missing ${missing}`)
        })
      );
    });

    it('refuses proving providers that serve no era', () => {
      const act = () => createProofProviderFromProvingProviders({ v8: undefined, v9: undefined });

      expect(act).toThrow(
        expect.objectContaining({
          name: 'InvalidArgumentError',
          code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
          message: expect.stringMatching(/^proveTx: at least one era handler is required/)
        })
      );
    });

    it.each([
      ['undefined', undefined],
      ['null', null]
    ])('refuses %s as the proving providers', (_label, provingProviders) => {
      // @ts-expect-error the value is not a proving provider record
      const act = () => createProofProviderFromProvingProviders(provingProviders);

      expect(act).toThrow(expect.objectContaining({ name: 'InvalidArgumentError', code: COMMON_ERROR_CODES.INVALID_ARGUMENT }));
    });

    it.each([
      ['null', null, 'got null'],
      ['a string', 'initial', 'got a string']
    ])('refuses %s as the cost model', (_label, costModel, detail) => {
      const act = () =>
        // @ts-expect-error the value is not a cost model
        createProofProviderFromProvingProviders({ v8: undefined, v9: inertProvingProvider, costModel });

      expect(act).toThrow(
        expect.objectContaining({
          name: 'InvalidArgumentError',
          code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
          message: expect.stringContaining(`costModel must be a CostModel object, ${detail}`)
        })
      );
    });
  });
});
