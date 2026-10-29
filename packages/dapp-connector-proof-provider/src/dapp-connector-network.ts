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
import type { MidnightNetwork } from '@midnight-ntwrk/midnight-js-utils';
import type { WalletConnectedAPI } from '@midnightntwrk/dapp-connector-api';

/** The part of the DApp Connector's `ConnectedAPI` that {@link dappConnectorNetwork} calls. */
export type DAppConnectorNetworkAPI = Pick<WalletConnectedAPI, 'getConfiguration'>;

const HTTP_AND_WS_SCHEMES = [
  ['http://', 'ws://'],
  ['https://', 'wss://']
] as const;

const nodeURLs = (substrateNodeUri: string): Pick<MidnightNetwork, 'nodeURL' | 'nodeWsURL'> => {
  const [, scheme = '', rest = ''] = /^([a-z]+:\/\/)(.*)$/i.exec(substrateNodeUri) ?? [];
  const lowerScheme = scheme.toLowerCase();
  for (const [http, ws] of HTTP_AND_WS_SCHEMES) {
    if (lowerScheme === http || lowerScheme === ws) {
      return { nodeURL: http + rest, nodeWsURL: ws + rest };
    }
  }
  throw new InvalidArgumentError(
    `The wallet's substrateNodeUri must start with http://, https://, ws:// or wss://, got ${JSON.stringify(substrateNodeUri)}.`
  );
};

/**
 * Reads the network id and endpoints of a browser dApp from its DApp Connector wallet, so the dApp uses the
 * network and the services the user picked in the wallet.
 *
 * @remarks
 * The connector reports one node URI. A Substrate node serves HTTP and WebSocket on the same address, so the
 * other node URL is the same URI with the matching scheme.
 *
 * @param api - The DApp Connector's `ConnectedAPI`, or any object with the method in {@link DAppConnectorNetworkAPI}.
 * @throws InvalidArgumentError If the wallet's `substrateNodeUri` is not an http, https, ws or wss URL.
 *
 * @example
 * ```typescript
 * const network = await dappConnectorNetwork(connectedApi);
 * const publicDataProvider = indexerPublicDataProvider(network.indexer);
 * ```
 */
export const dappConnectorNetwork = async (api: DAppConnectorNetworkAPI): Promise<MidnightNetwork> => {
  const { networkId, indexerUri, indexerWsUri, substrateNodeUri } = await api.getConfiguration();
  return {
    networkId,
    indexer: { queryURL: indexerUri, subscriptionURL: indexerWsUri },
    ...nodeURLs(substrateNodeUri)
  };
};
