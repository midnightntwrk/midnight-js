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

import type { ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { KeyMaterialProvider, ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type DAppConnectorProvingAPI,dappConnectorProvingProvider } from '../dapp-connector-proving-provider';

describe('dappConnectorProvingProvider', () => {
  const mockProvingProvider: ProvingProvider = {
    check: vi.fn(),
    prove: vi.fn()
  };

  const mockKeyMaterialProvider: KeyMaterialProvider = {
    getZKIR: vi.fn(),
    getProverKey: vi.fn(),
    getVerifierKey: vi.fn()
  };

  let mockApi: DAppConnectorProvingAPI;
  let mockZkConfigProvider: ZKConfigProvider<string>;

  beforeEach(() => {
    mockApi = {
      getProvingProvider: vi.fn().mockResolvedValue(mockProvingProvider)
    };

    mockZkConfigProvider = {
      asKeyMaterialProvider: vi.fn().mockReturnValue(mockKeyMaterialProvider)
    } as unknown as ZKConfigProvider<string>;
  });

  it('should call getProvingProvider with key material from zkConfigProvider', async () => {
    await dappConnectorProvingProvider(mockApi, mockZkConfigProvider);

    expect(mockZkConfigProvider.asKeyMaterialProvider).toHaveBeenCalled();
    expect(mockApi.getProvingProvider).toHaveBeenCalledWith(mockKeyMaterialProvider);
  });

  it('should return the ProvingProvider from the DApp Connector API', async () => {
    const result = await dappConnectorProvingProvider(mockApi, mockZkConfigProvider);

    expect(result).toBe(mockProvingProvider);
  });

  it('should propagate errors from getProvingProvider', async () => {
    const error = new Error('Wallet connection failed');
    mockApi.getProvingProvider = vi.fn().mockRejectedValue(error);

    await expect(dappConnectorProvingProvider(mockApi, mockZkConfigProvider)).rejects.toThrow(
      'Wallet connection failed'
    );
  });

  it('should propagate errors from zkConfigProvider.asKeyMaterialProvider', async () => {
    // Covers the ZKConfigProvider-unavailable case: the config provider itself
    // can fail to materialise key material (e.g. ZK artifacts not yet
    // downloaded). That error must surface to the caller, not be silently
    // passed to the wallet.
    const configError = new Error('ZK config not loaded');
    mockZkConfigProvider.asKeyMaterialProvider = vi.fn(() => {
      throw configError;
    });

    await expect(dappConnectorProvingProvider(mockApi, mockZkConfigProvider)).rejects.toThrow('ZK config not loaded');
    expect(mockApi.getProvingProvider).not.toHaveBeenCalled();
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

    expect(result).toBe(mockProvingProvider);
    expect(mockApi.getProvingProvider).toHaveBeenCalledTimes(2);
  });
});
