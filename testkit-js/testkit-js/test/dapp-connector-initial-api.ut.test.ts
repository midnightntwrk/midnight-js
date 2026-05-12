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

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

import { DAppConnectorInitialAPI } from '@/wallet/dapp-connector-initial-api';

describe('[Unit tests] DAppConnectorInitialAPI', () => {
  const mockConnectedWallet = {} as ConnectedAPI;
  const networkId = 'testnet';

  describe('properties', () => {
    it('should have correct defaults when no options provided', () => {
      const api = new DAppConnectorInitialAPI(mockConnectedWallet, networkId);

      expect(api.rdns).toBe('com.midnight.test-wallet');
      expect(api.name).toBe('Test Wallet');
      expect(api.icon).toBe('data:image/svg+xml,<svg/>');
      expect(api.apiVersion).toBe('4.0.1');
    });

    it('should use custom properties when provided', () => {
      const api = new DAppConnectorInitialAPI(mockConnectedWallet, networkId, {
        rdns: 'com.custom.wallet',
        name: 'Custom Wallet',
        icon: 'data:image/png;base64,abc',
        apiVersion: '5.0.0',
      });

      expect(api.rdns).toBe('com.custom.wallet');
      expect(api.name).toBe('Custom Wallet');
      expect(api.icon).toBe('data:image/png;base64,abc');
      expect(api.apiVersion).toBe('5.0.0');
    });
  });

  describe('connect', () => {
    it('should return ConnectedAPI when networkId matches', async () => {
      const api = new DAppConnectorInitialAPI(mockConnectedWallet, networkId);

      const result = await api.connect(networkId);

      expect(result).toBe(mockConnectedWallet);
    });

    it('should throw when networkId does not match', async () => {
      const api = new DAppConnectorInitialAPI(mockConnectedWallet, networkId);

      await expect(api.connect('wrong-network')).rejects.toThrow(
        "Network ID mismatch: expected 'testnet', got 'wrong-network'",
      );
    });
  });
});
