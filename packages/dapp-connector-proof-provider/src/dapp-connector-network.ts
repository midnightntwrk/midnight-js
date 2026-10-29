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

const walletURL = (field: string, value: string, schemes: readonly string[]): URL => {
  const url = value.trim() === value && URL.canParse(value) ? new URL(value) : undefined;
  if (url === undefined || !schemes.includes(url.protocol) || url.hostname === '') {
    throw new InvalidArgumentError(`The wallet's ${field} must be a ${schemes.join(' or ')} URL with a host.`);
  }
  return url;
};

const nodeURLs = (substrateNodeUri: string): Pick<MidnightNetwork, 'nodeURL' | 'nodeWsURL'> => {
  const { protocol } = walletURL('substrateNodeUri', substrateNodeUri, ['http:', 'https:', 'ws:', 'wss:']);
  const rest = substrateNodeUri.slice(protocol.length);
  const secure = protocol === 'https:' || protocol === 'wss:';
  return { nodeURL: `${secure ? 'https:' : 'http:'}${rest}`, nodeWsURL: `${secure ? 'wss:' : 'ws:'}${rest}` };
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
 * @throws InvalidArgumentError If the wallet's `networkId` is empty, or one of its URIs is not a URL of the
 * expected scheme with a host. The message names the field, never its value, which can hold a token.
 *
 * @example
 * ```typescript
 * const network = await dappConnectorNetwork(connectedApi);
 * const publicDataProvider = indexerPublicDataProvider(network.indexer);
 * ```
 */
export const dappConnectorNetwork = async (api: DAppConnectorNetworkAPI): Promise<MidnightNetwork> => {
  const { networkId, indexerUri, indexerWsUri, substrateNodeUri } = await api.getConfiguration();
  if (networkId === '' || networkId.trim() !== networkId) {
    throw new InvalidArgumentError("The wallet's networkId must be a non-empty string without whitespace around it.");
  }
  walletURL('indexerUri', indexerUri, ['http:', 'https:']);
  walletURL('indexerWsUri', indexerWsUri, ['ws:', 'wss:']);
  return {
    networkId,
    indexer: { queryURL: indexerUri, subscriptionURL: indexerWsUri },
    ...nodeURLs(substrateNodeUri)
  };
};
