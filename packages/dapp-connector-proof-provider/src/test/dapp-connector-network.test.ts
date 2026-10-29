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

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

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
    ['WSS://RPC.Example.com:443/Path', 'https://RPC.Example.com:443/Path', 'wss://RPC.Example.com:443/Path'],
    [
      'https://rpc.midnight-mainnet.blockfrost.io?project_id=token',
      'https://rpc.midnight-mainnet.blockfrost.io?project_id=token',
      'wss://rpc.midnight-mainnet.blockfrost.io?project_id=token'
    ]
  ])('derives both node URLs from the substrate URI %s', async (substrateNodeUri, nodeURL, nodeWsURL) => {
    const network = await dappConnectorNetwork(walletWith({ substrateNodeUri }));

    expect({ nodeURL: network.nodeURL, nodeWsURL: network.nodeWsURL }).toEqual({ nodeURL, nodeWsURL });
  });

  it.each([
    ['networkId', { networkId: '' }],
    ['networkId', { networkId: ' preview' }],
    ['indexerUri', { indexerUri: '' }],
    ['indexerUri', { indexerUri: 'wss://indexer.example.com/api?project_id=secretToken' }],
    ['indexerWsUri', { indexerWsUri: 'https://indexer.example.com/ws?project_id=secretToken' }],
    ['substrateNodeUri', { substrateNodeUri: 'ftp://rpc.example.com?project_id=secretToken' }],
    ['substrateNodeUri', { substrateNodeUri: 'rpc.example.com' }],
    ['substrateNodeUri', { substrateNodeUri: 'https://' }],
    ['substrateNodeUri', { substrateNodeUri: ' https://rpc.example.com' }]
  ] as const)('refuses a wallet %s of %j, naming the field but not the value', async (field, overrides) => {
    const error = await rejectionOf(dappConnectorNetwork(walletWith(overrides)));

    expect(error).toBeInstanceOf(InvalidArgumentError);
    expect(error).toHaveProperty('message', expect.stringContaining(`wallet's ${field}`));
    expect(error).toHaveProperty('message', expect.not.stringContaining('secretToken'));
  });
});
