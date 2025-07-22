/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { describe, test, expect } from 'vitest';
import { WebSocket } from 'ws';
import { indexerPublicDataProvider } from '../indexer-public-data-provider';
import type { ContractAddress } from '@midnight-ntwrk/ledger';
import type { ContractStateObservableConfig } from '@midnight-ntwrk/midnight-js-types';

describe('Unshielded Balances Integration', () => {
  const queryURL = 'http://localhost:4000/api/v1/graphql';
  const subscriptionURL = 'ws://localhost:4000/api/v1/graphql/ws';
  const mockContractAddress = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234' as ContractAddress;

  describe('watchForUnshieldedBalances', () => {
    test('should be a function that accepts contract address', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);

      expect(typeof provider.watchForUnshieldedBalances).toBe('function');
      expect(provider.watchForUnshieldedBalances.length).toBe(1); // expects 1 parameter
    });

    test('should return a Promise that eventually times out in test environment', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);

      const result = provider.watchForUnshieldedBalances(mockContractAddress);

      expect(result).toBeInstanceOf(Promise);

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      result.catch(() => {});
    });
  });

  describe('unshieldedBalancesObservable', () => {
    test('should be a function that accepts contract address and config', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);

      expect(typeof provider.unshieldedBalancesObservable).toBe('function');
      expect(provider.unshieldedBalancesObservable.length).toBe(2); // expects 2 parameters
    });

    test('should throw error for txId configuration before address validation', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);
      const config: ContractStateObservableConfig = {
        type: 'txId',
        txId: 'test-tx-id' as any
      };

      expect(() => {
        provider.unshieldedBalancesObservable(mockContractAddress, config);
      }).toThrow('txId configuration not supported for unshielded balances observable');
    });

    test('should accept latest configuration', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);
      const config: ContractStateObservableConfig = { type: 'latest' };

      const result = provider.unshieldedBalancesObservable(mockContractAddress, config);

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    test('should accept all configuration', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);
      const config: ContractStateObservableConfig = { type: 'all' };

      const result = provider.unshieldedBalancesObservable(mockContractAddress, config);

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    test('should accept blockHeight configuration', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);
      const config: ContractStateObservableConfig = {
        type: 'blockHeight',
        blockHeight: 1000,
        inclusive: true
      };

      const result = provider.unshieldedBalancesObservable(mockContractAddress, config);

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    test('should accept blockHash configuration', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);
      const config: ContractStateObservableConfig = {
        type: 'blockHash',
        blockHash: '0x1234567890abcdef',
        inclusive: false
      };

      const result = provider.unshieldedBalancesObservable(mockContractAddress, config);

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    test('should use latest as default configuration', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);

      const result = provider.unshieldedBalancesObservable(mockContractAddress, {} as ContractStateObservableConfig);

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    test('should validate contract address format', () => {
      const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);
      const invalidAddress = 'invalid-address' as ContractAddress;

      expect(() => {
        provider.unshieldedBalancesObservable(invalidAddress, {} as ContractStateObservableConfig);
      }).toThrow();
    });
  });
});
