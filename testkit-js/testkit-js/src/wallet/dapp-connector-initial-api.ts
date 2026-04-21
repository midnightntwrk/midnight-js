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

import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export class DAppConnectorInitialAPI implements InitialAPI {
  readonly rdns: string;
  readonly name: string;
  readonly icon: string;
  readonly apiVersion: string;

  private readonly connectedWallet: ConnectedAPI;
  private readonly expectedNetworkId: string;

  constructor(
    connectedWallet: ConnectedAPI,
    networkId: string,
    options?: { rdns?: string; name?: string; icon?: string; apiVersion?: string },
  ) {
    this.connectedWallet = connectedWallet;
    this.expectedNetworkId = networkId;
    this.rdns = options?.rdns ?? 'com.midnight.test-wallet';
    this.name = options?.name ?? 'Test Wallet';
    this.icon = options?.icon ?? 'data:image/svg+xml,<svg/>';
    this.apiVersion = options?.apiVersion ?? '4.0.1';
  }

  async connect(networkId: string): Promise<ConnectedAPI> {
    if (networkId !== this.expectedNetworkId) {
      throw new Error(`Network ID mismatch: expected '${this.expectedNetworkId}', got '${networkId}'`);
    }
    return this.connectedWallet;
  }
}
