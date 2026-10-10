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
import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { CostModel, type ProvingProvider, type UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ProvingProvider as RetainedEraProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PROVIDER_ERROR_CODES, V8PayloadUnsupportedError } from '../errors';
import { createProofProviderForEras, type UnboundTransaction } from '../proof-provider';

const PROVING_REFUSED = 'proving refused';

/**
 * Records which of its members the ledger consulted, then refuses. Refusing is
 * what makes the record readable: a case that asserts WHICH provider was driven
 * does not need a proof back, and a stub that answered would have to fake one.
 */
const recordingRetainedEraProvider = (consulted: string[], label: string): RetainedEraProvingProvider => ({
  check: (_preimage, keyLocation) => {
    consulted.push(`${label}:check:${keyLocation}`);
    return Promise.reject(new Error(PROVING_REFUSED));
  },
  prove: (_preimage, keyLocation) => {
    consulted.push(`${label}:prove:${keyLocation}`);
    return Promise.reject(new Error(PROVING_REFUSED));
  }
});

const recordingCurrentEraProvider = (consulted: string[], label: string): ProvingProvider => ({
  ...recordingRetainedEraProvider(consulted, label),
  lookupKey: () => Promise.resolve(undefined)
});

/**
 * Answers, but is never expected to be consulted: the transaction proved with
 * it carries no offers and no calls, so the ledger drives no circuits. It
 * returns bytes that are NOT a proof, so a case that unexpectedly reached it
 * fails rather than passes quietly.
 */
const inertRetainedEraProvider: RetainedEraProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array())
};

const inertCurrentEraProvider: ProvingProvider = {
  ...inertRetainedEraProvider,
  lookupKey: () => Promise.resolve(undefined)
};

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

describe('createProofProviderForEras', () => {
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
      const provider = createProofProviderForEras({
        currentEra: inertCurrentEraProvider,
        costModel: stubCostModel
      });

      const result = await provider.proveTx({ version: 'v9', tx: unprovenTx });

      expect(unprovenTx.prove).toHaveBeenCalledTimes(1);
      expect(unprovenTx.prove).toHaveBeenCalledWith(inertCurrentEraProvider, stubCostModel);
      expect(result.version).toBe('v9');
      expect(result.version === 'v9' && result.tx).toBe(unboundTx);
    });

    it('defaults to a cost model when none is given', async () => {
      const unprovenTx = createStubUnprovenTx(createStubUnboundTx());
      const provider = createProofProviderForEras({ currentEra: inertCurrentEraProvider });

      await provider.proveTx({ version: 'v9', tx: unprovenTx });

      expect(unprovenTx.prove).toHaveBeenCalledWith(inertCurrentEraProvider, expect.any(CostModel));
    });

    it('declares exactly the current era', () => {
      const provider = createProofProviderForEras({ currentEra: inertCurrentEraProvider });

      expect([...provider.supportedEras].sort()).toEqual(['v9']);
    });

    it('refuses a v8 payload with its stable unsupported-payload code', async () => {
      const provider = createProofProviderForEras({ currentEra: inertCurrentEraProvider });

      const rejection = await provider.proveTx({ version: 'v8', txBytes: retainedEraTxBytes }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect((rejection as V8PayloadUnsupportedError).code).toBe(PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED);
      expect((rejection as V8PayloadUnsupportedError).seam).toBe('proveTx');
    });

    describe('proveTxConfig.timeout', () => {
      it('refuses a v9 proof with a timeout before proving starts', async () => {
        const unprovenTx = createStubUnprovenTx(createStubUnboundTx());
        const provider = createProofProviderForEras({ currentEra: inertCurrentEraProvider });

        const rejection = await provider
          .proveTx({ version: 'v9', tx: unprovenTx }, { timeout: 5_000 })
          .then(
            () => undefined,
            (error: unknown) => error
          );

        expect(rejection).toBeInstanceOf(InvalidArgumentError);
        expect(unprovenTx.prove).not.toHaveBeenCalled();
      });

      it('refuses a zero timeout as well, since any timeout would be ignored', async () => {
        const unprovenTx = createStubUnprovenTx(createStubUnboundTx());
        const provider = createProofProviderForEras({ currentEra: inertCurrentEraProvider });

        await expect(
          provider.proveTx({ version: 'v9', tx: unprovenTx }, { timeout: 0 })
        ).rejects.toBeInstanceOf(InvalidArgumentError);
        expect(unprovenTx.prove).not.toHaveBeenCalled();
      });

      it('proves a v9 transaction when the config carries no timeout', async () => {
        const unboundTx = createStubUnboundTx();
        const unprovenTx = createStubUnprovenTx(unboundTx);
        const provider = createProofProviderForEras({ currentEra: inertCurrentEraProvider });

        const result = await provider.proveTx({ version: 'v9', tx: unprovenTx }, {});

        expect(result.version === 'v9' && result.tx).toBe(unboundTx);
      });

      it('proves a v9 transaction when the timeout key is present but undefined', async () => {
        const unboundTx = createStubUnboundTx();
        const unprovenTx = createStubUnprovenTx(unboundTx);
        const provider = createProofProviderForEras({ currentEra: inertCurrentEraProvider });

        const result = await provider.proveTx({ version: 'v9', tx: unprovenTx }, { timeout: undefined });

        expect(result.version === 'v9' && result.tx).toBe(unboundTx);
      });
    });
  });

  describe('built with a proving provider per era', () => {
    it('declares both eras, derived from the providers supplied', () => {
      const provider = createProofProviderForEras({
        currentEra: inertCurrentEraProvider,
        retainedEras: { v8: inertRetainedEraProvider }
      });

      expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
    });

    // A consumer wiring the retained arm behind a condition writes
    // `{ v8: crossesFork ? retainedEraProvider : undefined }`. An absent
    // provider must leave the era unserved, rather than build an arm that
    // reaches the retained runtime with nothing to prove with.
    it('leaves an era unserved when its provider is absent, refusing that arm', async () => {
      const provider = createProofProviderForEras({
        currentEra: inertCurrentEraProvider,
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
      const provider = createProofProviderForEras({
        currentEra: inertCurrentEraProvider,
        retainedEras: { v8: inertRetainedEraProvider }
      });

      const result = await provider.proveTx({ version: 'v8', txBytes: retainedEraTxBytes });

      // A caller narrows this record and rejects the other era, so answering in
      // the wrong arm strands a submit mid-flight. Assert the arm first.
      expect(result.version).toBe('v8');
      if (result.version !== 'v8') {
        expect.fail(`expected the v8 arm, got '${result.version}'`);
      }

      // Proven, not merely round-tripped: the stage marker in the tag moves
      // from `proof-preimage` to `proof` only when the transaction was proved.
      // Derived from the input's own tag rather than spelled out; the literal
      // itself is pinned once, in the protocol package's own suites.
      const expectedTag = txTag(retainedEraTxBytes).replace('proof-preimage', 'proof');
      // Without this, a vendor rename of the stage marker would make `replace`
      // a no-op and invert the assertion below into "the same bytes came back".
      expect(expectedTag).not.toBe(txTag(retainedEraTxBytes));
      expect(txTag(result.txBytes)).toBe(expectedTag);
    });

    // The reason this factory exists: each era's transaction must be proved
    // with the provider built for that era. These two cases are what stands
    // between a consumer and a proof the node refuses at submit.
    it('drives the retained-era provider for a v8 payload, never the current-era one', async () => {
      const consulted: string[] = [];
      const provider = createProofProviderForEras({
        currentEra: recordingCurrentEraProvider(consulted, 'currentEra'),
        retainedEras: { v8: recordingRetainedEraProvider(consulted, 'v8') }
      });

      const rejection = await provider.proveTx({ version: 'v8', txBytes: circuitDrivingTxBytes }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(consulted, `proveTx rejected with: ${String(rejection)}`).toEqual(['v8:prove:midnight/zswap/output']);
    });

    it('drives the current-era provider for a v9 payload, never the retained-era one', async () => {
      const consulted: string[] = [];
      const currentEraProvider = recordingCurrentEraProvider(consulted, 'currentEra');
      const unprovenTx = createStubUnprovenTx(createStubUnboundTx());
      const provider = createProofProviderForEras({
        currentEra: currentEraProvider,
        retainedEras: { v8: recordingRetainedEraProvider(consulted, 'v8') }
      });

      await provider.proveTx({ version: 'v9', tx: unprovenTx });

      // The current-era transaction takes the provider as an argument rather
      // than being driven through it here, so the identity of what was handed
      // over is the claim -- and that nothing reached the retained-era one.
      expect(unprovenTx.prove).toHaveBeenCalledTimes(1);
      expect(unprovenTx.prove).toHaveBeenCalledWith(currentEraProvider, expect.any(CostModel));
      expect(consulted).toEqual([]);
    });

    // Without these, both cases above would still pass if the arm swallowed the
    // rejection and answered with the unproven bytes -- the consulted log is
    // written before the proving provider refuses.
    it('propagates a retained-era proving failure to the caller', async () => {
      const provider = createProofProviderForEras({
        currentEra: inertCurrentEraProvider,
        retainedEras: { v8: recordingRetainedEraProvider([], 'v8') }
      });

      await expect(provider.proveTx({ version: 'v8', txBytes: circuitDrivingTxBytes })).rejects.toThrow(
        PROVING_REFUSED
      );
    });

    it('propagates a current-era proving failure to the caller', async () => {
      const partial: Partial<UnprovenTransaction> = {
        prove: vi.fn().mockRejectedValue(new Error(PROVING_REFUSED)) as UnprovenTransaction['prove']
      };
      const provider = createProofProviderForEras({
        currentEra: inertCurrentEraProvider,
        retainedEras: { v8: inertRetainedEraProvider }
      });

      await expect(provider.proveTx({ version: 'v9', tx: partial as UnprovenTransaction })).rejects.toThrow(
        PROVING_REFUSED
      );
    });

    it('refuses a v8 proof with a timeout before proving starts', async () => {
      const consulted: string[] = [];
      const provider = createProofProviderForEras({
        currentEra: inertCurrentEraProvider,
        retainedEras: { v8: recordingRetainedEraProvider(consulted, 'v8') }
      });

      const rejection = await provider
        .proveTx({ version: 'v8', txBytes: circuitDrivingTxBytes }, { timeout: 5_000 })
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(InvalidArgumentError);
      expect(consulted).toEqual([]);
    });

    it('refuses a v8 proof with a zero timeout before proving starts', async () => {
      const consulted: string[] = [];
      const provider = createProofProviderForEras({
        currentEra: inertCurrentEraProvider,
        retainedEras: { v8: recordingRetainedEraProvider(consulted, 'v8') }
      });

      await expect(
        provider.proveTx({ version: 'v8', txBytes: circuitDrivingTxBytes }, { timeout: 0 })
      ).rejects.toBeInstanceOf(InvalidArgumentError);
      expect(consulted).toEqual([]);
    });
  });
});
