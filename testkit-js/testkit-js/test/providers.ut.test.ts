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

import { NetworkId } from '@midnightntwrk/wallet-sdk';
import { describe, expect, it, vi } from 'vitest';

import { initializeMidnightProviders } from '../src/contract/providers';
import type { EnvironmentConfiguration } from '../src/test-environment/environment-configuration';
import type { MidnightWalletProvider } from '../src/wallet/midnight-wallet-provider';

const environment = (networkId: string): EnvironmentConfiguration => ({
  walletNetworkId: NetworkId.NetworkId.Undeployed,
  networkId,
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  node: 'http://127.0.0.1:9944',
  nodeWS: 'ws://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
  faucet: undefined
});

describe('initializeMidnightProviders', () => {
  it.each(['', ' undeployed'])(
    'refuses network id %j from the environment before touching the wallet',
    (networkId) => {
      const getCoinPublicKey = vi.fn();
      const wallet: Partial<MidnightWalletProvider> = { getCoinPublicKey };

      const build = () =>
        initializeMidnightProviders(wallet as MidnightWalletProvider, environment(networkId), {
          zkConfigPath: '/nonexistent',
          privateStateStoreName: 'providers-test'
        });

      expect(build).toThrow(TypeError);
      expect(build).toThrow(/^environmentConfiguration\.networkId/);
      expect(getCoinPublicKey).not.toHaveBeenCalled();
    }
  );
});
