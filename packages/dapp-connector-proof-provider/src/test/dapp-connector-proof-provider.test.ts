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
import type { CostModel, UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type KeyMaterialProvider,
  type UnboundTransaction,
  type VersionedUnprovenTransaction,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PayloadNotATransactionError, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import type { ProvingProvider } from '@midnightntwrk/dapp-connector-api';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { dappConnectorProofProvider } from '../dapp-connector-proof-provider';
import type { DAppConnectorProvingAPI } from '../dapp-connector-proving-provider';

/**
 * The `namespace:type-descriptor:` tag a serialized transaction opens with,
 * read as a raw prefix. Never `parseSerializedTag`: that parser scans only the
 * first 64 bytes for its second colon, and transaction tags run past that.
 */
const txTag = (bytes: Uint8Array): string => {
  const head = Buffer.from(bytes.subarray(0, 96)).toString('latin1');
  return head.slice(0, head.indexOf('):') + 2);
};

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

  // This package delegates the current era to `createProofProvider` but owns
  // the retained arm itself, so these cases cover a body the types package's
  // tests do not reach.
  describe('v8 payload', () => {
    let retainedEraTxBytes: Uint8Array;

    beforeAll(async () => {
      const v8 = await loadLedger8();
      retainedEraTxBytes = v8.Transaction.fromParts('undeployed').serialize();
    });

    it('answers the v8 arm with the PROVEN serialization, ignoring the caller-supplied cost model', async () => {
      const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);

      const result = await proofProvider.proveTx({ version: 'v8', txBytes: retainedEraTxBytes });

      // `mockCostModel` is a plain object, not a ledger `CostModel` at all. The
      // retained runtime type-checks that argument across the WASM boundary and
      // throws `expected instance of CostModel` for anything else -- so this
      // call SUCCEEDING is the proof that the caller's cost model was not
      // forwarded. Forward it and this test fails.
      expect(result.version).toBe('v8');
      const returned = result.version === 'v8' ? result.txBytes : new Uint8Array();
      expect(returned).toBeInstanceOf(Uint8Array);

      // Derived from the input's own tag rather than spelled out -- see the
      // matching case in `http-client-proof-provider`. The two seams answer the
      // same contract, so they are asserted at the same strictness.
      expect(txTag(returned)).toBe(txTag(retainedEraTxBytes).replace('proof-preimage', 'proof'));
    });

    it('refuses a payload that is not a serialized transaction, with the registered code', async () => {
      const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);

      const rejection = await proofProvider.proveTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
      expect(rejection).toHaveProperty('code', PROVIDER_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION)).toBe(true);
      expect(mockUnprovenTx.prove).not.toHaveBeenCalled();
    });
  });

  it('reports a payload with no version tag as UntaggedPayloadError, not a TypeError', async () => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, mockCostModel);

    // Unrepresentable in TypeScript, and reachable anyway: from JavaScript, and
    // from a consumer built against a pre-5.0.0 `midnight-js-types`. Dispatching
    // on `.version` must not read through a null payload before the guard that
    // turns this into a coded error a caller can act on.
    const rejection = await proofProvider.proveTx(null as unknown as VersionedUnprovenTransaction).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.UNTAGGED_PAYLOAD)).toBe(true);
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
