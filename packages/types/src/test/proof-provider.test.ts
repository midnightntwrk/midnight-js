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

import type { CostModel, ProvingProvider, UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { UntaggedPayloadError, V8PayloadUnsupportedError } from '../errors';
import {
  createProofProvider,
  type UnboundTransaction,
  type VersionedUnprovenTransaction
} from '../proof-provider';

const stubProvingProvider: ProvingProvider = {
  check: vi.fn(),
  prove: vi.fn(),
  lookupKey: vi.fn()
};

// Each stub is built as a `Partial<T>` naming only the members this suite
// exercises, then narrowed with a single assertion — the same pattern the
// http-client proof-provider tests use for their transaction stub.
const partialCostModel: Partial<CostModel> = { toString: () => 'stub-cost-model' };
const stubCostModel = partialCostModel as CostModel;

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

describe('createProofProvider', () => {
  describe('v9 payload', () => {
    it('proves the carried transaction and tags the result as v9', async () => {
      const unboundTx = createStubUnboundTx();
      const unprovenTx = createStubUnprovenTx(unboundTx);
      const provider = createProofProvider(stubProvingProvider, stubCostModel);

      const result = await provider.proveTx({ version: 'v9', tx: unprovenTx });

      expect(unprovenTx.prove).toHaveBeenCalledWith(stubProvingProvider, stubCostModel);
      // Identity, not structural equality — see the note in the dapp-connector
      // suite: two structurally-equal ledger objects can come from different
      // WASM instances, and conflating them is what this seam exists to stop.
      expect(result.version).toBe('v9');
      expect(result.version === 'v9' && result.tx).toBe(unboundTx);
    });
  });

  describe('v8 payload', () => {
    it('rejects with the registered unsupported-payload code instead of proving anything', async () => {
      const provider = createProofProvider(stubProvingProvider, stubCostModel);

      const rejection = await provider
        .proveTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) })
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
    });

    it('names the seam that received the payload so the caller can tell which call failed', async () => {
      const provider = createProofProvider(stubProvingProvider, stubCostModel);

      const rejection = await provider.proveTx({ version: 'v8', txBytes: new Uint8Array() }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
      expect((rejection as V8PayloadUnsupportedError).seam).toBe('proveTx');
    });

    it('says the refusal is by design and names what does serve the v8 arm', async () => {
      const provider = createProofProvider(stubProvingProvider, stubCostModel);

      const rejection = await provider.proveTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) }).then(
        () => undefined,
        (error: unknown) => error
      );

      // This message is what a developer reads at the point of failure, so it
      // has to distinguish "this adapter will never serve v8" from "the
      // framework cannot do it yet". The adapters' refusal is permanent: each
      // lifts a v9-only implementation. Asserting the remediation too, because
      // a message that only says no leaves the reader with nowhere to go.
      const { message } = rejection as Error;
      expect(message).toContain('by design');
      expect(message).not.toContain('not yet supported');
      expect(message).toContain('httpClientProofProvider');
      expect(message).toContain("{ version: 'v9', tx }");
    });

    it('records the payload size so a report of the rejection says what arrived', async () => {
      const provider = createProofProvider(stubProvingProvider, stubCostModel);

      const rejection = await provider.proveTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3, 4]) }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect((rejection as V8PayloadUnsupportedError).byteLength).toBe(4);
    });
  });

  // The seam types make an untagged payload unrepresentable, so these drive it
  // the only way a real caller can: from JavaScript, or from a consumer built
  // against a pre-5.0.0 midnight-js-types. This is the most likely runtime
  // failure the 5.0.0 seam change creates, so it gets a coded error rather
  // than a bare TypeError three frames away.
  describe('payload with no recognised version discriminant', () => {
    const proveUntagged = (payload: unknown): Promise<unknown> => {
      const provider = createProofProvider(stubProvingProvider, stubCostModel);
      return provider.proveTx(payload as VersionedUnprovenTransaction).then(
        () => undefined,
        (error: unknown) => error
      );
    };

    it.each([
      ['a bare transaction, the pre-5.0.0 shape', { prove: () => undefined }, 'no version field'],
      ['an unrecognised era tag', { version: 'v10', tx: {} }, "'v10'"],
      ['a non-string version', { version: 9, tx: {} }, 'number'],
      ['undefined', undefined, 'undefined'],
      // Reported as 'null', not the `typeof null` wart 'object' — telling a
      // developer their payload was an object with a bad version is the
      // opposite of what happened.
      ['null', null, 'null'],
      ['a version string longer than the cap', { version: 'v'.repeat(80), tx: {} }, `'${'v'.repeat(32)}'… (80 chars)`]
    ])('rejects %s with the registered untagged-payload code', async (_label, payload, received) => {
      const rejection = await proveUntagged(payload);

      expect(rejection).toBeInstanceOf(UntaggedPayloadError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.UNTAGGED_PAYLOAD)).toBe(true);
      expect((rejection as UntaggedPayloadError).seam).toBe('proveTx');
      expect((rejection as UntaggedPayloadError).received).toBe(received);
    });

    it('never invokes prove on the payload it was handed', async () => {
      const prove = vi.fn();

      // The spy goes on the payload, not on `stubProvingProvider`.
      // `createProofProvider` calls `tx.prove(provingProvider, costModel)` on
      // the *narrowed* payload and never calls `provingProvider.prove` itself,
      // so asserting on the latter would hold even with the `unwrapV9` call
      // deleted. This spy is what actually runs if the narrowing is skipped.
      await proveUntagged({ prove });

      expect(prove).not.toHaveBeenCalled();
    });

    it('does not put the payload contents in the message', async () => {
      const rejection = await proveUntagged({ version: 'v10', secret: 'do-not-log-me' });

      expect((rejection as Error).message).not.toContain('do-not-log-me');
      expect((rejection as Error).message).not.toContain('secret');
    });
  });
});
