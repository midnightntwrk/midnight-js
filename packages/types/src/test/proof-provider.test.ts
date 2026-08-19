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

import { V8PayloadUnsupportedError } from '../errors';
import { createProofProvider, type UnboundTransaction } from '../proof-provider';

const stubProvingProvider: ProvingProvider = {
  check: vi.fn(),
  prove: vi.fn(),
  lookupKey: vi.fn()
};

const stubCostModel = { tag: 'cost-model' } as unknown as CostModel;

describe('createProofProvider', () => {
  describe('v9 payload', () => {
    it('proves the carried transaction and tags the result as v9', async () => {
      const unboundTx = { tag: 'unbound-tx' } as unknown as UnboundTransaction;
      const unprovenTx = { prove: vi.fn().mockResolvedValue(unboundTx) } as unknown as UnprovenTransaction;
      const provider = createProofProvider(stubProvingProvider, stubCostModel);

      const result = await provider.proveTx({ version: 'v9', tx: unprovenTx });

      expect(unprovenTx.prove).toHaveBeenCalledWith(stubProvingProvider, stubCostModel);
      expect(result).toEqual({ version: 'v9', tx: unboundTx });
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

      await expect(provider.proveTx({ version: 'v8', txBytes: new Uint8Array() })).rejects.toThrow(/proveTx/);
    });
  });
});
