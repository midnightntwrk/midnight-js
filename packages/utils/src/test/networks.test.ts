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
import { describe, expect, it } from 'vitest';

import { networks } from '../networks';

describe('networks', () => {
  it('defines the Midnight-hosted preview endpoints', () => {
    expect(networks.preview()).toEqual({
      networkId: 'preview',
      indexer: {
        queryURL: 'https://indexer.preview.midnight.network/api/v4/graphql',
        subscriptionURL: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws'
      },
      nodeURL: 'https://rpc.preview.midnight.network',
      nodeWsURL: 'wss://rpc.preview.midnight.network'
    });
  });

  it('builds the Blockfrost preprod endpoints with the project token on every URL', () => {
    expect(networks.preprod('preprodToken')).toEqual({
      networkId: 'preprod',
      indexer: {
        queryURL: 'https://midnight-preprod.blockfrost.io/api/v0?project_id=preprodToken',
        subscriptionURL: 'wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=preprodToken'
      },
      nodeURL: 'https://rpc.midnight-preprod.blockfrost.io?project_id=preprodToken',
      nodeWsURL: 'wss://rpc.midnight-preprod.blockfrost.io?project_id=preprodToken'
    });
  });

  it('builds the Blockfrost mainnet endpoints with the project token on every URL', () => {
    expect(networks.mainnet('mainnetToken')).toEqual({
      networkId: 'mainnet',
      indexer: {
        queryURL: 'https://midnight-mainnet.blockfrost.io/api/v0?project_id=mainnetToken',
        subscriptionURL: 'wss://midnight-mainnet.blockfrost.io/api/v0/ws?project_id=mainnetToken'
      },
      nodeURL: 'https://rpc.midnight-mainnet.blockfrost.io?project_id=mainnetToken',
      nodeWsURL: 'wss://rpc.midnight-mainnet.blockfrost.io?project_id=mainnetToken'
    });
  });

  it('encodes a project token that contains URL characters', () => {
    const network = networks.mainnet('a&b=c d');

    expect(network.nodeURL).toBe('https://rpc.midnight-mainnet.blockfrost.io?project_id=a%26b%3Dc%20d');
  });

  it.each([
    ['preprod', '', /got an empty string/],
    ['preprod', '   ', /got an empty string/],
    ['mainnet', '', /got an empty string/],
    ['mainnet', ' secretToken', /got a token with whitespace around it/],
    ['mainnet', 'secretToken\n', /got a token with whitespace around it/]
  ] as const)('refuses a %s project token %j without showing it', (name, projectId, reason) => {
    const act = () => networks[name](projectId);

    expect(act).toThrow(InvalidArgumentError);
    expect(act).toThrow(reason);
    expect(act).not.toThrow(/secretToken/);
  });
});
