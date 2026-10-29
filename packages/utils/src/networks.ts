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
import type { NetworkId } from '@midnight-ntwrk/midnight-js-types';

/**
 * The network id and endpoints of a Midnight network.
 *
 * Build your own object of this shape to point at a self-hosted node or indexer.
 */
export interface MidnightNetwork {
  readonly networkId: NetworkId;
  readonly indexer: { readonly queryURL: string; readonly subscriptionURL: string };
  readonly nodeURL: string;
  readonly nodeWsURL: string;
}

const withProjectId = (url: string, projectId: string): string =>
  `${url}?project_id=${encodeURIComponent(projectId)}`;

const blockfrostNetwork = (
  networkId: 'preprod' | 'mainnet',
  projectId: string,
  urls: { queryURL: string; subscriptionURL: string; nodeURL: string; nodeWsURL: string }
): MidnightNetwork => {
  if (projectId.trim() === '') {
    throw new InvalidArgumentError(
      `The ${networkId} endpoints need a Blockfrost project token for a Midnight ${networkId} project, got an empty string.`
    );
  }
  return {
    networkId,
    indexer: {
      queryURL: withProjectId(urls.queryURL, projectId),
      subscriptionURL: withProjectId(urls.subscriptionURL, projectId)
    },
    nodeURL: withProjectId(urls.nodeURL, projectId),
    nodeWsURL: withProjectId(urls.nodeWsURL, projectId)
  };
};

/**
 * Public endpoints of the Midnight networks.
 *
 * `preview` is hosted by Midnight. `preprod` and `mainnet` are served by Blockfrost, so they take
 * a Blockfrost project token for that network and put it on every URL as `?project_id=<token>`.
 * The URLs then carry the token: remove it before you log them.
 *
 * These are defaults that can change between releases. To use other endpoints, pass your own
 * {@link MidnightNetwork}.
 *
 * @example
 * ```typescript
 * const preview = networks.preview;
 * const mainnet = networks.mainnet(blockfrostMainnetProjectId);
 * ```
 */
export const networks = {
  preview: {
    networkId: 'preview',
    indexer: {
      queryURL: 'https://indexer.preview.midnight.network/api/v4/graphql',
      subscriptionURL: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws'
    },
    nodeURL: 'https://rpc.preview.midnight.network',
    nodeWsURL: 'wss://rpc.preview.midnight.network'
  },
  /**
   * @throws InvalidArgumentError If `blockfrostProjectId` is empty.
   */
  preprod: (blockfrostProjectId: string): MidnightNetwork =>
    blockfrostNetwork('preprod', blockfrostProjectId, {
      queryURL: 'https://midnight-preprod.blockfrost.io/api/v0',
      subscriptionURL: 'wss://midnight-preprod.blockfrost.io/api/v0/ws',
      nodeURL: 'https://rpc.midnight-preprod.blockfrost.io',
      nodeWsURL: 'wss://rpc.midnight-preprod.blockfrost.io'
    }),
  /**
   * @throws InvalidArgumentError If `blockfrostProjectId` is empty.
   */
  mainnet: (blockfrostProjectId: string): MidnightNetwork =>
    blockfrostNetwork('mainnet', blockfrostProjectId, {
      queryURL: 'https://midnight-mainnet.blockfrost.io/api/v0',
      subscriptionURL: 'wss://midnight-mainnet.blockfrost.io/api/v0/ws',
      nodeURL: 'https://rpc.midnight-mainnet.blockfrost.io',
      nodeWsURL: 'wss://rpc.midnight-mainnet.blockfrost.io'
    })
} as const satisfies {
  preview: MidnightNetwork;
  preprod: (blockfrostProjectId: string) => MidnightNetwork;
  mainnet: (blockfrostProjectId: string) => MidnightNetwork;
};
