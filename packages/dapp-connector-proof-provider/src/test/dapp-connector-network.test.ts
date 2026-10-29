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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { Configuration } from '@midnightntwrk/dapp-connector-api';
import { describe, expect, it } from 'vitest';

import { dappConnectorNetwork } from '../dapp-connector-network';

const walletWith = (overrides: Partial<Configuration>) => ({
  getConfiguration: () =>
    Promise.resolve<Configuration>({
      networkId: 'preview',
      indexerUri: 'https://indexer.preview.midnight.network/api/v4/graphql',
      indexerWsUri: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
      substrateNodeUri: 'https://rpc.preview.midnight.network',
      ...overrides
    })
});

describe('dappConnectorNetwork', () => {
  it('builds the network from the endpoints the wallet uses', async () => {
    const network = await dappConnectorNetwork(walletWith({}));

    expect(network).toEqual({
      networkId: 'preview',
      indexer: {
        queryURL: 'https://indexer.preview.midnight.network/api/v4/graphql',
        subscriptionURL: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws'
      },
      nodeURL: 'https://rpc.preview.midnight.network',
      nodeWsURL: 'wss://rpc.preview.midnight.network'
    });
  });

  it.each([
    ['https://rpc.example.com', 'https://rpc.example.com', 'wss://rpc.example.com'],
    ['wss://rpc.example.com', 'https://rpc.example.com', 'wss://rpc.example.com'],
    ['http://localhost:9944', 'http://localhost:9944', 'ws://localhost:9944'],
    ['ws://localhost:9944', 'http://localhost:9944', 'ws://localhost:9944'],
    [
      'https://rpc.midnight-mainnet.blockfrost.io?project_id=token',
      'https://rpc.midnight-mainnet.blockfrost.io?project_id=token',
      'wss://rpc.midnight-mainnet.blockfrost.io?project_id=token'
    ]
  ])('derives both node URLs from the substrate URI %s', async (substrateNodeUri, nodeURL, nodeWsURL) => {
    const network = await dappConnectorNetwork(walletWith({ substrateNodeUri }));

    expect({ nodeURL: network.nodeURL, nodeWsURL: network.nodeWsURL }).toEqual({ nodeURL, nodeWsURL });
  });

  it.each(['ftp://rpc.example.com', 'rpc.example.com', ''])(
    'refuses a substrate URI that is not http, https, ws or wss (%j)',
    async (substrateNodeUri) => {
      const result = dappConnectorNetwork(walletWith({ substrateNodeUri }));

      await expect(result).rejects.toThrow(InvalidArgumentError);
      await expect(dappConnectorNetwork(walletWith({ substrateNodeUri }))).rejects.toThrow(/substrateNodeUri/);
    }
  );
});
