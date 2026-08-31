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

import type { CostModel, UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type KeyMaterialProvider,
  type UnboundTransaction,
  V8PayloadUnsupportedError,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import type { ProvingProvider } from '@midnightntwrk/dapp-connector-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dappConnectorProofProvider } from '../dapp-connector-proof-provider';
import type { DAppConnectorProvingAPI } from '../dapp-connector-proving-provider';

describe('dappConnectorProofProvider', () => {
  const mockUnboundTx = { tag: 'proven-tx' } as unknown as UnboundTransaction;

  const mockProvingProvider: ProvingProvider = {
    check: vi.fn(),
    prove: vi.fn()
  };

  const mockKeyMaterialProvider: KeyMaterialProvider = {
    getZKIR: vi.fn(),
    getProverKey: vi.fn(),
    getVerifierKey: vi.fn()
  };

  const mockCostModel = { tag: 'cost-model' } as unknown as CostModel;

  let mockApi: DAppConnectorProvingAPI;
  let mockZkConfigProvider: ZKConfigProvider<string>;
  let mockUnprovenTx: UnprovenTransaction;

  beforeEach(() => {
    mockApi = {
      getProvingProvider: vi.fn().mockResolvedValue(mockProvingProvider)
    };

    const zkConfigProviderOverrides: Partial<ZKConfigProvider<string>> = {
      asKeyMaterialProvider: vi.fn().mockReturnValue(mockKeyMaterialProvider)
    };
    mockZkConfigProvider = zkConfigProviderOverrides as ZKConfigProvider<string>;

    mockUnprovenTx = {
      prove: vi.fn().mockResolvedValue(mockUnboundTx)
    } as unknown as UnprovenTransaction;
  });

  it('should return a ProofProvider with proveTx method', async () => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);

    expect(proofProvider).toHaveProperty('proveTx');
    expect(typeof proofProvider.proveTx).toBe('function');
  });

  it('should delegate proveTx to unprovenTx.prove with the injected cost model', async () => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);

    const result = await proofProvider.proveTx({ version: 'v9', tx: mockUnprovenTx });

    expect(mockUnprovenTx.prove).toHaveBeenCalledWith(
      expect.objectContaining({
        check: expect.any(Function),
        prove: expect.any(Function),
        lookupKey: expect.any(Function)
      }),
      mockCostModel
    );
    // Identity, not structural equality: the whole premise of the versioned
    // seam is that ledger objects from different WASM instances must not be
    // interchanged, so a structurally-equal-but-different object must fail.
    expect(result.version).toBe('v9');
    expect(result.version === 'v9' && result.tx).toBe(mockUnboundTx);
  });

  // Behaviour is inherited from createProofProvider, but this is the seam
  // consumers of this package actually call: without a test here, a future
  // refactor that gives this package its own proveTx body would silently lose
  // the rejection.
  it('rejects a v8 payload with the registered unsupported-payload code, naming this seam', async () => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);

    const rejection = await proofProvider.proveTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) }).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
    expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
    expect((rejection as V8PayloadUnsupportedError).seam).toBe('proveTx');
    expect(mockUnprovenTx.prove).not.toHaveBeenCalled();
  });

  it('should obtain the ProvingProvider once at setup, not per proveTx call', async () => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);

    await proofProvider.proveTx({ version: 'v9', tx: mockUnprovenTx });
    await proofProvider.proveTx({ version: 'v9', tx: mockUnprovenTx });

    expect(mockApi.getProvingProvider).toHaveBeenCalledTimes(1);
  });

  it('should propagate errors from getProvingProvider during setup', async () => {
    const error = new Error('Wallet connection failed');
    mockApi.getProvingProvider = vi.fn().mockRejectedValue(error);

    await expect(
      dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel)
    ).rejects.toThrow('Wallet connection failed');
  });

  it('should allow transient-failure recovery: a second invocation after a rejection succeeds', async () => {
    // Documents the recovery model: the factory holds no state between calls,
    // so callers can retry after a wallet failure simply by invoking again.
    // Protects against a future refactor that caches the rejected promise.
    mockApi.getProvingProvider = vi
      .fn()
      .mockRejectedValueOnce(new Error('Wallet locked'))
      .mockResolvedValueOnce(mockProvingProvider);

    await expect(
      dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel)
    ).rejects.toThrow('Wallet locked');

    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);

    expect(proofProvider).toHaveProperty('proveTx');
    expect(mockApi.getProvingProvider).toHaveBeenCalledTimes(2);
  });

  it('should call getProvingProvider once per factory invocation (independent providers)', async () => {
    // "Single fetch" is scoped to a single ProofProvider instance. Two
    // separate factory calls must each obtain their own ProvingProvider —
    // never share a cached one across instances.
    await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);
    await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);

    expect(mockApi.getProvingProvider).toHaveBeenCalledTimes(2);
  });
});
