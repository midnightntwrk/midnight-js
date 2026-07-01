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

import {
  createProverKey,
  createVerifierKey,
  createZKIR,
  encodeContractKeyLocation,
  hashVerifierKey,
  ZKConfigProvider,
  ZKConfigRegistry
} from '@midnight-ntwrk/midnight-js-types';
import type { ProvingProvider } from '@midnightntwrk/dapp-connector-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type DAppConnectorProvingAPI, dappConnectorProvingProvider } from '../dapp-connector-proving-provider';

describe('dappConnectorProvingProvider', () => {
  const mockProvingProvider: ProvingProvider = {
    check: vi.fn(),
    prove: vi.fn()
  };

  const verifierKey = Uint8Array.of(1, 1);
  const proverKey = Uint8Array.of(1, 2);
  const zkir = Uint8Array.of(1, 3);

  // A single-contract artifact source with one circuit, 'transfer'.
  class MockZkConfigProvider extends ZKConfigProvider<string> {
    getZKIR = vi.fn(async () => createZKIR(zkir));

    getProverKey = vi.fn(async () => createProverKey(proverKey));

    getVerifierKey = vi.fn(async () => createVerifierKey(verifierKey));
  }

  const keyLocation = encodeContractKeyLocation({
    contractAddress: 'ab'.repeat(32),
    circuitId: 'transfer',
    verifierKeyHash: hashVerifierKey(verifierKey)
  });

  let mockApi: DAppConnectorProvingAPI;
  let mockZkConfigProvider: MockZkConfigProvider;

  beforeEach(() => {
    mockApi = {
      getProvingProvider: vi.fn().mockResolvedValue(mockProvingProvider)
    };

    mockZkConfigProvider = new MockZkConfigProvider();
  });

  it('should call getProvingProvider with a key material provider that resolves contract key locations', async () => {
    await dappConnectorProvingProvider(mockApi, mockZkConfigProvider);

    expect(mockApi.getProvingProvider).toHaveBeenCalledTimes(1);
    // The wallet round-trips each preimage's key location into the provided key material
    // provider; canonical contract locations must resolve through the registry's vk join.
    const keyMaterialProvider = vi.mocked(mockApi.getProvingProvider).mock.calls[0][0];
    await expect(keyMaterialProvider.getProverKey(keyLocation)).resolves.toEqual(proverKey);
    await expect(keyMaterialProvider.getVerifierKey(keyLocation)).resolves.toEqual(verifierKey);
    await expect(keyMaterialProvider.getZKIR(keyLocation)).resolves.toEqual(zkir);
  });

  it('should reject non-contract key locations through the provided key material provider', async () => {
    await dappConnectorProvingProvider(mockApi, mockZkConfigProvider);

    const keyMaterialProvider = vi.mocked(mockApi.getProvingProvider).mock.calls[0][0];
    await expect(keyMaterialProvider.getProverKey('midnight/zswap/spend')).rejects.toThrow(
      /is not a contract key location/
    );
  });

  it('should pass a given ZKConfigRegistry through without re-wrapping', async () => {
    const registry = new ZKConfigRegistry([mockZkConfigProvider]);
    await dappConnectorProvingProvider(mockApi, registry);

    const keyMaterialProvider = vi.mocked(mockApi.getProvingProvider).mock.calls[0][0];
    await expect(keyMaterialProvider.getProverKey(keyLocation)).resolves.toEqual(proverKey);
  });

  it('should surface the artifact-drift error for unmatched verifier keys', async () => {
    await dappConnectorProvingProvider(mockApi, mockZkConfigProvider);

    const driftedLocation = encodeContractKeyLocation({
      contractAddress: 'ab'.repeat(32),
      circuitId: 'transfer',
      verifierKeyHash: 'f'.repeat(64)
    });
    const keyMaterialProvider = vi.mocked(mockApi.getProvingProvider).mock.calls[0][0];
    await expect(keyMaterialProvider.getProverKey(driftedLocation)).rejects.toThrow(/No ZK artifact bundle matches/);
  });

  it('should delegate check and prove to the DApp Connector API provider', async () => {
    const result = await dappConnectorProvingProvider(mockApi, mockZkConfigProvider);

    const preimage = Uint8Array.of(9, 9);
    await result.check(preimage, keyLocation);
    await result.prove(preimage, keyLocation);

    expect(mockProvingProvider.check).toHaveBeenCalledWith(preimage, keyLocation);
    expect(mockProvingProvider.prove).toHaveBeenCalledWith(preimage, keyLocation, undefined);
  });

  it('should resolve lookupKey from the registry, independently of the wallet provider', async () => {
    // The wallet's ProvingProvider has no lookupKey; the framework supplies it from the same
    // registry verifier-key join used to resolve key material for proving.
    const result = await dappConnectorProvingProvider(mockApi, mockZkConfigProvider);

    await expect(result.lookupKey(keyLocation)).resolves.toEqual({ proverKey, verifierKey, ir: zkir });
    await expect(result.lookupKey('midnight/zswap/spend')).resolves.toBeUndefined();
  });

  it('should propagate errors from getProvingProvider', async () => {
    const error = new Error('Wallet connection failed');
    mockApi.getProvingProvider = vi.fn().mockRejectedValue(error);

    await expect(dappConnectorProvingProvider(mockApi, mockZkConfigProvider)).rejects.toThrow(
      'Wallet connection failed'
    );
  });

  it('should support independent retries after a transient failure', async () => {
    // There is no promise cache, so a caller that sees an init failure can
    // simply invoke the factory again. This guards against a future
    // "cache the rejection" refactor that would leave the caller permanently
    // stuck after a transient wallet error.
    mockApi.getProvingProvider = vi
      .fn()
      .mockRejectedValueOnce(new Error('Wallet locked'))
      .mockResolvedValueOnce(mockProvingProvider);

    await expect(dappConnectorProvingProvider(mockApi, mockZkConfigProvider)).rejects.toThrow('Wallet locked');
    const result = await dappConnectorProvingProvider(mockApi, mockZkConfigProvider);

    expect(result.lookupKey).toBeTypeOf('function');
    expect(mockApi.getProvingProvider).toHaveBeenCalledTimes(2);
  });
});
